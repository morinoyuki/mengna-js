const { default: Bot } = require("el-bot");
const { Message } = require("mirai-ts");
const schedule = require("node-schedule");
const { coolDown } = require("../../utils");
const path = require('path');
const nietaList = require("./nieta");
const voiceDir = './data/net.mamoe.mirai-api-http/voices';
const imageDir = './data/net.mamoe.mirai-api-http/images';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 *
 * @param {Bot} ctx
 */
module.exports = (ctx) => {
    const { mirai } = ctx;
    const cool = coolDown();
    let running = false;
    let number = {};
    schedule.scheduleJob("0 0 0 * * *", () => {
        number = {};
    });
    /**
     * nieta执行器
     * @param {Array} nieta
     * @param {*} msg
     */
    const runNieta = async (nieta, msg) => {
        for (let i = 0; i < nieta.length; i++) {
            switch (nieta[i].type) {
                case "record":
                    await msg.reply([Message.Voice(null, null, path.join(voiceDir, nieta[i].file))]);
                    break;
                case "message":
                    await msg.reply(nieta[i].msg);
                    break;
                case "image":
                    await msg.reply([Message.Image(null, null, path.join(imageDir, nieta[i].file))]);
                    break;
                case "xml":
                    await msg.reply([Message.Xml(nieta[i].content)]);
                    break;
                case "mute":
                    if (msg.sender.group.permission !== "MEMBER")
                        mirai.api.muteAll(msg.sender.group.id);
                    break;
                case "unmute":
                    if (msg.sender.group.permission !== "MEMBER")
                        mirai.api.unmuteAll(msg.sender.group.id);
                    break;
                default:
                    break;
            }
            if (nieta[i].wait) await sleep(nieta[i].wait);
        }
        running = false;
    };
    mirai.on("GroupMessage", (msg) => {
        if (
            msg.plain.length <= 5 &&
            !running &&
            nietaList[msg.plain] &&
            cool.checkCoolDown(msg.sender.id, msg.reply)
        ) {
            if (msg.group(495487453)) {
                msg.reply('本群禁用');
                return;
            }
            if (
                number[msg.sender.group.id] !== undefined &&
                number[msg.sender.group.id] >= 3
            ) {
                msg.reply("该群今日已jo了3次");
                return;
            }
            running = true;
            runNieta(nietaList[msg.plain], msg).catch(() => {
                running = false;
            });
            if (number[msg.sender.group.id] === undefined)
                number[msg.sender.group.id] = 1;
            else number[msg.sender.group.id]++;
            cool.setCoolDown(msg.sender.id, 30 * 60);
        }
    });
};
