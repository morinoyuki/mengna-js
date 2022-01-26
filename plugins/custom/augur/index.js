const { default: Axios } = require("axios")
const { default: Bot } = require("el-bot")
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
const FromData = require('form-data')
const { JSDOM } = require('jsdom')
const stringRandom = require('string-random')
const { coolDown } = require('../../utils')

const cookieJar = new tough.CookieJar()
const url = 'https://cn.shindanmaker.com/'
const list = {
    '二次元人设': 683217,
    '变态程度': 1032909,
    '你是什么做的': 761425,
    '淫欲地下城': 1043561,
    '小JJ长度': 16051,
    '呼神护卫': 1032334,
    '正确饲养你的方法': 556031,
    '神明创造你的十日': 829014,
    '中二称号': 790697,
    '精神病院': 403243,
    '梦病塔': 759939,
    '角之旅': 940214,
    '看了群主女装': 476023,
    '地牢探险': 905828
}
axiosCookieJarSupport(Axios)

async function getToken() {
    const { data } = await Axios.get(url, {
        jar: cookieJar,
        withCredentials: true
    })
    const { window: { document } } = new JSDOM(data)
    const token = document.querySelector('meta[name="csrf-token"]').content
    return token
}

async function getAugur(id, name) {
    try {
        const formData = new FromData()
        const token = await getToken()
        formData.append('_token', token)
        formData.append('shindanName', name)
        formData.append('hiddenName', '无名的' + stringRandom(1, {
            numbers: false,
            letters: 'ABCDEFGHIJKLMNOPQRSTUVWSYZ'
        }))
        const headers = formData.getHeaders()
        const { data } = await Axios.post(url + id, formData, {
            headers,
            jar: cookieJar,
            withCredentials: true
        })
        const { window: { document } } = new JSDOM(data)
        const result = document.querySelector('#shindanResultContent').innerHTML
        const content = result.replace(/<br>/g, '\n').replace(/<[a-z/="-_ ]+>/ig, '').trim()
        cookieJar.removeAllCookiesSync()
        return [content, true]
    } catch (e) {
        return ['占卜数据读取失败 ' + e.message, false]
    }
}

/**
 * 占卜
 * @param {Bot} ctx 
 */
module.exports = async ctx => {
    const { mirai } = ctx
    const cool = coolDown()
    mirai.on('message', async msg => {
        const keyword = msg.plain.split(' ')[0].toLowerCase()
        if (msg.plain === '占卜') {
            const content = '可用项目有：\n' +
                Object.keys(list).join('\n')
            msg.reply(content)
        }
        if (keyword === '占卜') {
            if (msg.group(495487453) && !cool.checkCoolDown(msg.sender.id, msg.reply)) {
                return;
            }
            const augurName = msg.plain.slice(keyword.length).trim()
            const augurId = list[augurName.toUpperCase()]
            if (augurId) {
                const [content, ok] = await getAugur(augurId, msg.sender.memberName || msg.sender.nickname)
                if (ok && msg.group(495487453)) cool.setCoolDown(msg.sender.id, 4 * 60 * 60)
                msg.reply(content)
            }
        }
    })
}

