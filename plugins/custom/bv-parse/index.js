const axios = require("axios").default
const { Message } = require('mirai-ts')
const { default: Bot } = require("el-bot")

function formatResult(data) {
    return [
        Message.Image(null, data.data.pic),
        Message.Plain(
            `${data.data.bvid},标题：${data.data.title}\n` +
            data.data.desc.replace(/<br\/?>/, '\n') +
            `\n分区：${data.data.tname || '未知'}`
        )
    ]
}

/**
 * 解析
 * @param {string} bv 
 */
async function parseBV(bv) {
    const { data } = await axios.get('https://api.bilibili.com/x/web-interface/view?bvid=' + bv)
    if (data.code != 0) return '数据解析失败'
    return formatResult(data)
}
async function parseAV(av) {
    const { data } = await axios.get('https://api.bilibili.com/x/web-interface/view?aid=' + av)
    if (data.code != 0) return '数据解析失败'
    return formatResult(data)

}

/**
 * BV解析
 * @param {Bot} ctx 
 */
module.exports = ctx => {
    const { mirai } = ctx
    mirai.on('GroupMessage', async msg => {
        if (/BV[a-zA-Z0-9]{9,}/i.test(msg.plain)) {
            const videoInfo = await parseBV(msg.plain.match(/BV([a-zA-Z0-9]{9,})/i)[1])
            msg.reply(videoInfo)
        } else if (/av\d{4,}/i.test(msg.plain)) {
            const videoInfo = await parseAV(msg.plain.match(/av(\d{4,})/i)[1])
            msg.reply(videoInfo)
        }
    })
}