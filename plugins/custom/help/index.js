const { utils, default: Bot } = require('el-bot');
const { check, Message } = require('mirai-ts');
let helpOptions = {
    match: [
        {
            is: '帮助'
        }
    ]
}

/**
 * 帮助信息
 * @param {Bot} ctx 
 * @param {helpOptions} options 
 */
module.exports = (ctx, options) => {
    const mirai = ctx.mirai
    utils.config.merge(helpOptions, options)
    mirai.on('message', (msg) => {
        helpOptions.match.forEach((obj) => {
            if (check.match(msg.plain, obj)) {
                const text = `可用指令：
    搜图 [...image]
    搜番 [...image]
    点歌/网易点歌 <keyword>
    QQ点歌 <keyword>
    占卜 <augur>
    舔狗日记/旧舔狗日记
    砸瓦鲁多/泷泽萝拉哒
    涩图/色图（停用）
    彩虹屁
    神回复
    骂我/钉宫
    一言
    投食
    sleep`
                msg.reply(text).then(r => console.log(r))
            }
        })
    })
}