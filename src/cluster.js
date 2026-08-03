'use strict';

const { ClusterManager } = require("discord-hybrid-sharding");
const path = require("path");

const config = require("./config.json");

const token =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  config.token;


if (!token) {
  console.log("❌ Missing Discord Token");
  console.log("Add DISCORD_TOKEN or TOKEN in Railway Variables");
  process.exit(1);
}


const manager = new ClusterManager(
  path.join(__dirname, "index.js"),
  {
    totalShards: "auto",
    shardsPerClusters: 2,
    mode: "process",
    token,
  }
);


manager.on(
  "clusterCreate",
  cluster => {

    console.log(
      `🟢 [Cluster] Started Cluster #${cluster.id}`
    );

  }
);


manager.on(
  "clusterReady",
  cluster => {

    console.log(
      `✅ [Cluster] Cluster #${cluster.id} Ready`
    );

  }
);


(async()=>{

  try {

    await manager.spawn({
      timeout:-1
    });

    console.log(
      "🚀 Bezms Security Bot clusters online"
    );

  }

  catch(err){

    console.error(
      "❌ Cluster startup failed:",
      err
    );

  }

})();
