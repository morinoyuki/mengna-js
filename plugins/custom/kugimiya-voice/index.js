/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
const fs = require('fs');
const { Message } = require('mirai-ts');
const { default: Bot } = require('el-bot');
const { Logger } = require('el-bot/dist/bot/logger');
const path = require('path');
const dir = './data/net.mamoe.mirai-api-http/voices/钉宫'
let cacheFiles = [];

/**
 * 载入文件列表
 * @param {Logger} logger 
 */
function loadFiles(logger) {
    try {
        cacheFiles = fs.readdirSync(path.join('./mcl', dir));
    } catch (e) {
        logger.error(`[kugimiya-voice] ${e.message}`);
    }
}
/**
 * 发送语音
 * @param {Function} reply 
 */
function sendVoice(reply) {
    const i = Math.floor(Math.random() * cacheFiles.length);
    const voice = cacheFiles[i];
    // console.log(path.resolve(dir, voice));
    reply([Message.Voice(null, null, path.join(dir, voice))]);
}

/**
 * 钉宫语音
 * @param {Bot} ctx 
 */
module.exports = ctx => {
    const { mirai, logger } = ctx;
    logger.info('[kugimiya-voice] 首次运行正在读取文件列表到缓存');
    loadFiles(logger);
    mirai.on('message', msg => {
        if (msg.plain === '骂我' || msg.plain === '钉宫') {
            if (cacheFiles.length) {
                sendVoice(msg.reply);
            } else {
                loadFiles(logger);
                if (cacheFiles.length) sendVoice(msg.reply);
            }
        }
    });
};