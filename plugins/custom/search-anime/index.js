const { default: Bot } = require('el-bot');
const { Message } = require('mirai-ts');
const fetch = require('node-fetch').default;
// const TraceMoe = require('tracemoe-helper');
const { default: axios } = require("axios")
const { getImage, getCacheManager, coolDown } = require('../../utils');

// let api;
let logger;
/**
 * 
 * @param {Object} data 
 */
async function formatResult(data) {
    let r = [
        Message.Plain('搜索结果：'),
        Message.Plain(`\n动画名：${data.anilist?.title?.native ?? '未知'}(${data.anilist?.title?.romaji ?? '未知'})`),
        // Message.Plain(`\n中文名：${|| '未知'}`),
        Message.Plain(`\n准确度：${Math.floor(data.similarity * 100)}%${data.similarity < 0.86 ? '\n（准确度过低，请确保这张图片是完整的、没有裁剪过的动画视频截图）' : ''}`),
        Message.Plain(`\n话数：${data.episode ?? '未知'}`)
    ];
    if (!data.anilist?.is_adult ?? false)
        r = r.concat([Message.Plain('\n'), await getImage(data.image)]);
    return r;
}
function limitTime(time, fn) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('超时'))
        }, time);
        fn().then(resolve).catch(reject)
    })
}
/**
 * 搜索
 * @param {String} url 
 */
async function traceSearch(url) {
    try {
        const { data } = await axios.get('https://api.trace.moe/search?anilistInfo&cutBorders&url=' + encodeURIComponent(url));
        if (data.error || !data.result) throw new Error('搜索失败');
        const res = await formatResult(data.result[0]);
        return res;
    } catch (e) {
        logger.error(`[search - anime] ${e.message}`);
        return '失败';
    }
}
/**
 * 搜番
 * @param {Bot} ctx 
 * @param {Object} options 
 */
module.exports = async ctx => {
    if (!ctx.db) return
    const mirai = ctx.mirai;
    logger = ctx.logger;
    const cache = getCacheManager(ctx);
    const cool = coolDown();
    let searchFlag = {};
    mirai.on('message', async (msg) => {
        if (msg.plain.trim() === '搜番' && cool.checkCoolDown(msg.sender.id, msg.reply)) {
            searchFlag[msg.sender.id.toString()] = true;
            if (msg.messageChain.length == 2) {
                msg.reply('请发送要搜索的截图');
                return
            }
        }
        if (searchFlag[msg.sender.id.toString()]) {
            msg.messageChain.forEach(async (smsg) => {
                if (smsg.type === 'Image') {
                    // try {
                    //     const response = await fetch(smsg.url);
                    //     const imageType = response.headers.get('Content-Type');
                    //     if (imageType && imageType === 'image/gif') {
                    //         msg.reply('GIF不支持');
                    //         return;
                    //     }
                    //     response.clone();
                    // } catch (e) {
                    //     msg.reply('识别图片类型失败');
                    //     return;
                    // }
                    cool.setCoolDown(msg.sender.id, 5 * 60);
                    const imageMd5 = smsg.url.match(/\-([^-\/]{32})/)[1];
                    const cacheData = await cache.getCache(imageMd5, 'anime');
                    if (cacheData) {
                        msg.reply(cacheData.msg);
                    } else {
                        try {
                            const result = await limitTime(3 * 60 * 1000, async () => await traceSearch(smsg.url));
                            msg.reply(result);
                            if (Array.isArray(result)) cache.setCache(imageMd5, 'anime', result, 0);
                        } catch (e) {
                            msg.reply(e.message);
                        }
                    }
                }
            });
            delete searchFlag[msg.sender.id.toString()];
        }
    });
}