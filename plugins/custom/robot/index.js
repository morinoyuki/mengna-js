const { default: Bot } = require("el-bot");
const stringRandom = require('string-random');
const crypto = require('crypto');
const axios = require('axios').default;
const notMsgList = [
    '搜图',
    '搜番',
    '点歌',
    '舔狗日记',
    '涩图',
    '色图',
    '彩虹屁',
    '神回复',
    '骂我',
    '一言',
    '投食',
    '帮助',
    '占卜'
]
/**
 * 私聊 聊天
 * @param {Bot} ctx 
 * @param {*} options 
 */
module.exports = (ctx, options) => {
    const { mirai } = ctx
    const appid = options.appid
    const appkey = options.appkey
    mirai.on('FriendMessage', async msg => {
        if (msg.plain && !notMsgList.includes(msg.plain)) {
            let rawBody = `app_id=${appid}&` +
                `nonce_str=${stringRandom(20)}&` +
                `question=${encodeURI(msg.plain)}&` +
                `session=${msg.sender.id}&` +
                `time_stamp=${Math.round(Date.now() / 1000)}&` +
                `app_key=${appkey}`
            const hash = crypto.createHash('md5')
            const sign = hash.update(rawBody).digest('hex')
            rawBody = rawBody + `&sign=${sign.toUpperCase()}`
            const { data } = await axios.get('https://api.ai.qq.com/fcgi-bin/nlp/nlp_textchat?' + rawBody)
            if (data.ret === 0) {
                msg.reply(data.data.answer)
            }
        }
    })
}