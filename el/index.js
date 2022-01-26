require("dotenv").config();
const { resolve } = require("path");
const { utils } = require("el-bot");

module.exports = {
  qq: parseInt(process.env.BOT_QQ),
  // 你可以直接解析 mirai-api-http 的配置
  setting: utils.config.parse(
    resolve(__dirname, "../mcl/config/net.mamoe.mirai-api-http/setting.yml")
    // resolve(__dirname, "../mirai/plugins/net.mamoe.mirai-api-http/setting.yml")
  ),
  db: {
    // 默认关闭
    enable: true,
    uri: process.env.BOT_DB_URI,
    analytics: true,
  },
  bot: utils.config.parse(resolve(__dirname, "./index.yml")),
  // webhook
  webhook: {
    enable: true,
    path: "/webhook",
    port: 7777,
    secret: "14gd4erujr5yht5ijg",
  },
};
