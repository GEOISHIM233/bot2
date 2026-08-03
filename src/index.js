'use strict';

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Options,
} = require("discord.js");

const { Database } = require("quickmongo");
const { readdirSync } = require("fs");
const path = require("path");
const { open } = require("lmdb");

require("utf-8-validate");
require("bufferutil");
require("dns-cache")(60000);

const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  purple: "\x1b[35m",
  pink: "\x1b[95m",
  white: "\x1b[97m",
  gray: "\x1b[90m",
};

const banner = `
${c.pink}${c.bright}
██████╗ ███████╗███████╗███╗   ███╗███████╗
██╔══██╗██╔════╝╚══███╔╝████╗ ████║██╔════╝
██████╔╝█████╗    ███╔╝ ██╔████╔██║███████╗
██╔══██╗██╔══╝   ███╔╝  ██║╚██╔╝██║╚════██║
██████╔╝███████╗███████╗██║ ╚═╝ ██║███████║
╚═════╝ ╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝

${c.purple}${c.bright} Bezms Security Bot
──────────────────────────────────────
${c.reset}
`;

let shardConfig = {};
let ClusterClient = null;

try {
  const sharding = require("discord-hybrid-sharding");
  const info = sharding.getInfo();

  if (info?.SHARD_LIST) {
    shardConfig = {
      shards: info.SHARD_LIST,
      shardCount: info.TOTAL_SHARDS,
    };

    ClusterClient = sharding.ClusterClient;
  }
} catch {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],

  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],

  allowedMentions: {
    repliedUser: false,
    parse: ["users", "roles"],
  },

  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 50,
    PresenceManager: 0,
    VoiceStateManager: 200,
    ReactionManager: 0,
  }),

  rest: {
    retries: 3,
    timeout: 8000,
  },

  ...shardConfig,
});

if (ClusterClient) {
  client.cluster = new ClusterClient(client);
}

client.commands = new Collection();
client.cooldowns = new Collection();

const config = require("./config.json");

const token =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  config.token;

const mongoURL =
  process.env.MONGO_URI ||
  process.env.MONGODB_URL ||
  config.MONGO;

client.db = new Database(mongoURL);

client.db.connect()
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log("MongoDB error:", err.message));

client.config = config;

client.emoji = require("./emojis.json");

const lmdb = open({
  path: path.join(__dirname, "database", "lmdb"),
  compression: true,
});

client.lmdb = lmdb;

client.lmdbGet = key => lmdb.get(key);
client.lmdbSet = (key,value) => lmdb.put(key,value);
client.lmdbDel = key => lmdb.remove(key);

client.isWhitelisted = (guildId,userId)=>{
  const list = lmdb.get(`whitelist_${guildId}`) || [];
  return list.includes(userId);
};

client.isAntinukeEnabled = guildId =>
  lmdb.get(`antinuke_${guildId}`) === "enabled";
const syncEmojis = require("./utils/emojiSync");

let cmdCount = 0;

const commandsPath = path.join(__dirname, "commands");

for (const folder of readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);

  for (const file of readdirSync(folderPath)) {

    if (!file.endsWith(".js")) continue;

    const command = require(path.join(folderPath, file));

    if (command?.name) {
      client.commands.set(command.name, command);
      cmdCount++;
    }
  }
}


let eventCount = 0;

const eventsPath = path.join(__dirname, "events");

function loadEvents(dir) {

  for (const file of readdirSync(dir, {
    withFileTypes:true
  })) {

    const full = path.join(dir,file.name);

    if(file.isDirectory()) {
      loadEvents(full);
    }

    else if(file.name.endsWith(".js")) {

      const event = require(full);

      if(typeof event === "function") {
        event(client);
        eventCount++;
      }
    }
  }
}

loadEvents(eventsPath);



client.once("clientReady", async () => {

  client.user.setPresence({

    activities:[
      {
        name: ">help | Bezms Security",
        type:0
      }
    ],

    status:"online"

  });


  console.log(banner);

  console.log(
    `${c.purple}${c.bright} Commands Loaded ✅ ${c.gray}(${cmdCount})${c.reset}`
  );

  console.log(
    `${c.purple}${c.bright} Events Loaded ✅ ${c.gray}(${eventCount})${c.reset}`
  );

  console.log(
    `${c.pink}${c.bright} ${client.user.tag} ONLINE 🟢 ${c.gray}[${client.ws.ping}ms]${c.reset}`
  );

});



async function startBot(){

  if(!token){

    console.log(
      "❌ Missing Discord Token. Add TOKEN or DISCORD_TOKEN in Railway."
    );

    process.exit(1);

  }


  try {

    await syncEmojis(token);

  }

  catch(err){

    console.log(
      "Emoji sync skipped:",
      err.message
    );

  }


  await client.login(token);

}


startBot();



require("http")
.createServer((req,res)=>{

  res.writeHead(200);

  res.end("Bezms Security Bot Alive 🟢");

})
.listen(
  5000,
  "0.0.0.0"
);



process.on(
  "unhandledRejection",
  err => console.log("Unhandled:",err)
);


process.on(
  "uncaughtException",
  err => console.log("Exception:",err)
);



module.exports = client;

module.exports.lmdb = lmdb;
