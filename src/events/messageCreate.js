const {
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    SeparatorSpacingSize,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");


const commandCooldowns = new Map();
const blacklistCooldown = new Map();


let globalLock = false;
let lockTimeout = null;


function applyGlobalLock(){

    globalLock = true;

    clearTimeout(lockTimeout);

    lockTimeout = setTimeout(() => {
        globalLock = false;
    },1000);

}


const sep = () =>
    new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(
        SeparatorSpacingSize.Small
    );



module.exports = async (client) => {


    client.on(
        "rateLimit",
        () => applyGlobalLock()
    );



    client.on(
        "messageCreate",
        async (message) => {


        if(!message.guild) return;

        if(message.author.bot) return;

        if(globalLock) return;



        const perms =
            message.channel.permissionsFor(
                message.guild.members.me
            );



        if(!perms || !perms.has([

            PermissionFlagsBits.ViewChannel,

            PermissionFlagsBits.SendMessages,

            PermissionFlagsBits.EmbedLinks

        ])) return;




        let prefix =
            client.config.prefix;



        const savedPrefix =
            await client.db.get(
                `prefix_${message.guild.id}`
            );



        if(savedPrefix){

            prefix = savedPrefix;

        }





        const mentionedBot =
            message.content === `<@${client.user.id}>`
            ||
            message.content === `<@!${client.user.id}>`;





        const botRegex =
            RegExp(
                `^<@!?${client.user.id}>( |)`
            );



        const mentionPrefix =
            message.content.match(botRegex)
            ?
            message.content.match(botRegex)[0]
            :
            prefix;





        const argsWithPrefix =
            message.content.startsWith(
                mentionPrefix
            )

            ?

            message.content
            .slice(mentionPrefix.length)
            .trim()
            .split(/ +/)

            :

            null;




        const argsWithoutPrefix =
            message.content
            .trim()
            .split(/ +);




        const commandWithPrefix =
            argsWithPrefix
            ?
            argsWithPrefix.shift()?.toLowerCase()
            :
            null;




        const commandWithoutPrefix =
            argsWithoutPrefix.shift()
            ?.toLowerCase();





        const cmdWithPrefix =
            commandWithPrefix

            ?

            client.commands.get(
                commandWithPrefix
            )

            ||

            client.commands.find(
                c =>
                c.aliases?.includes(
                    commandWithPrefix
                )
            )

            :

            null;





        const cmdWithoutPrefix =

            client.commands.get(
                commandWithoutPrefix
            )

            ||

            client.commands.find(
                c =>
                c.aliases?.includes(
                    commandWithoutPrefix
                )
            );





        const noprefixUsers =
            await client.db.get(
                "noprefix"
            )
            ||
            [];



        const isNoprefix =
            noprefixUsers.some(
                entry =>
                entry.userId === message.author.id
            );



        let cmd;
        let args;



        if(isNoprefix){

            cmd =
                cmdWithoutPrefix
                ||
                cmdWithPrefix;


            args =
                cmdWithoutPrefix
                ?
                argsWithoutPrefix
                :
                argsWithPrefix;


        } else {


            cmd =
                cmdWithPrefix;


            args =
                argsWithPrefix;


        }
                    const blacklist =
            await client.db.get(
                `blacklist_${client.user.id}`
            )
            ||
            [];



        if(
            (mentionedBot || cmd)
            &&
            blacklist.includes(
                message.author.id
            )
        ){


            const now =
                Date.now();


            const last =
                blacklistCooldown.get(
                    message.author.id
                )
                ||
                0;



            if(
                now - last < 60000
            ) return;



            blacklistCooldown.set(
                message.author.id,
                now
            );



            const reason =
                await client.db.get(
                    `blreason_${message.author.id}`
                )
                ||
                "No reason provided";



            return message.channel.send({

                components:[

                    new ContainerBuilder()

                    .setAccentColor(
                        0xFF0000
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()

                        .setContent(
                            `<@${message.author.id}> **You are blacklisted**`
                        )

                    )

                    .addSeparatorComponents(
                        sep()
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()

                        .setContent(
                            `\`\`\`yml\nReason : ${reason}\`\`\``
                        )

                    )

                ],

                flags:
                MessageFlags.IsComponentsV2

            });

        }





        if(mentionedBot){


            return message.channel.send({

                components:[


                    new ContainerBuilder()

                    .setAccentColor(
                        0x26272F
                    )


                    .addTextDisplayComponents(

                        new TextDisplayBuilder()

                        .setContent(

`Hey ${message.author}, my prefix is \`${prefix}\`

Type \`${prefix}help\` to get started.

**Bezms Security Bot**
`

                        )

                    )


                    .addSeparatorComponents(
                        sep()
                    )


                    .addActionRowComponents(
                        row =>
                        row.addComponents(

                            new ButtonBuilder()

                            .setLabel(
                                "Invite"
                            )

                            .setStyle(
                                ButtonStyle.Link
                            )

                            .setURL(
                                "https://discord.gg/9nKHrnWZqV"
                            )


                            ,

                            new ButtonBuilder()

                            .setLabel(
                                "Support"
                            )

                            .setStyle(
                                ButtonStyle.Link
                            )

                            .setURL(
                                "https://discord.gg/9nKHrnWZqV"
                            )

                        )
                    )

                ],


                flags:
                MessageFlags.IsComponentsV2

            });


        }





        if(!cmd) return;





        const userId =
            message.author.id;



        const now =
            Date.now();



        const cooldown =
            (cmd.cooldown || 3)
            *
            1000;



        const key =
            `${userId}-${cmd.name}`;





        if(
            commandCooldowns.has(key)
        ){


            const expires =
                commandCooldowns.get(key);



            if(
                now < expires
            ){


                const remaining =
                    Math.ceil(
                        (expires-now)
                        /
                        1000
                    );



                const msg =
                    await message.channel.send({

                        content:
                        `${client.emoji.error} Please wait **${remaining}s** before using **${cmd.name}** again.`

                    });



                setTimeout(
                    () =>
                    msg.delete()
                    .catch(()=>{}),

                    expires-now
                );


                return;


            }


        }




        commandCooldowns.set(
            key,
            now + cooldown
        );



        setTimeout(

            () =>
            commandCooldowns.delete(key),

            cooldown

        );





        await cmd.run(
            client,
            message,
            args,
            prefix
        )
        .catch(
            err =>
            console.log(
                "[Command Error]",
                err.message
            )
        );



    });


};
