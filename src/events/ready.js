const { ActivityType, REST, Routes } = require("discord.js");

module.exports = (client) => {

  client.on("clientReady", async () => {

    console.log(`[Bot] Logged in as ${client.user.tag}`);


    const shardList =
      client.cluster?.info?.SHARD_LIST ?? [0];

    const shardId =
      shardList[0] ?? 0;



    // Bezms Bot Status
    client.user.setPresence({

      status: "online",

      activities: [
        {
          name: ">help | Bezms Security",
          type: ActivityType.Playing,
        },
      ],

    });



    console.log(
      `[Status] Bezms Security status set ✅`
    );



    // Register Slash Commands
    const slashCommands = [];


    for (const [name, cmd] of client.commands) {

      if (cmd.slashCommand && cmd.runSlash) {

        slashCommands.push(
          cmd.slashCommand.toJSON()
        );

      }

    }



    if (slashCommands.length > 0) {

      try {

        const rest =
          new REST({
            version: "10"
          })
          .setToken(
            client.token
          );


        await rest.put(
          Routes.applicationCommands(
            client.user.id
          ),
          {
            body: slashCommands
          }
        );


        console.log(
          `[Slash] Registered ${slashCommands.length} commands ✅`
        );


      }

      catch(err){

        console.error(
          "[Slash] Registration failed:",
          err.message
        );

      }

    }



    console.log(
      `[Shard ${shardId}] Ready | ${client.guilds.cache.size} servers`
    );


  });

};
