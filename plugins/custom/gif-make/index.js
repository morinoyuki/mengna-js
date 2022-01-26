const axios = require("axios").default
const { Message } = require('mirai-ts')
const { default: Bot } = require("el-bot")
const idList = {
    '真香': 1,
    sorry: 6
}
const oldIdList = {
    oldsorry: 'sorry',
    '打工': 'dagong',
    '沙滩': 'yanji',
    '我说的': 'jesus',
    '伊莉雅': 'iriya'
}

/**
 * 生成提交数据
 * @param {Number} id 
 * @param {String} s 
 */
function toJson(id, s) {
    const strArray = s.split('|')
    let r = { id: id, fillings: {} }
    strArray.forEach((v, i) => {
        r.fillings['sentence' + i] = v
    })
    return r
}
function toOldJson(s) {
    const strArray = s.split('|')
    let r = {}
    strArray.forEach((v, i) => {
        r[i] = v
    })
    return r
}
/**
 * 获取表情
 * @param {String} name 
 * @param {String} content 
 */
async function getGif(name, content) {
    const url = 'https://app.xuty.tk'
    const apiUrl = url + '/memeet/api/v1/template/make'
    const postPara = toJson(idList[name], content)
    const { data } = await axios.post(apiUrl, postPara)
    return [Message.Image(null, url + data.body.url)]
}
async function getOldGif(name, content) {
    const url = 'https://sorry.xuty.tk'
    const apiUrl = url + '/' + oldIdList[name] + '/make'
    const postPara = toOldJson(content)
    const { data } = await axios.post(apiUrl, postPara)
    const imageUrl = data.match(/href="([^"]+)"/i)[1]
    return [Message.Image(null, url + imageUrl)]
}
/**
 * 表情生成
 * @param {Bot} ctx 
 */
module.exports = ctx => {
    const { mirai } = ctx
    mirai.on('message', async msg => {
        const keyword = msg.plain.split(' ')[0].toLowerCase()
        if (keyword === 'gifmake') {
            const _temp = msg.plain.slice(keyword.length).trim()
            const name = _temp.split(' ')[0]
            const content = _temp.slice(name.length).trim()
            try {
                if (idList[name]) {
                    await msg.reply(await getGif(name, content))
                } else if (oldIdList[name]) {
                    await msg.reply(await getOldGif(name, content))
                } else {
                    msg.reply('不存在')
                    return
                }
            } catch (e) {
                msg.reply('Error: ' + e.message)
            }
        }
    })
}