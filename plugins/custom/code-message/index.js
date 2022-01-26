const { default: Bot } = require("el-bot")

/**
 * 消息代码执行
 * @param {Bot} ctx 
 */
module.exports = ctx => {
    const { mirai, user } = ctx
    mirai.on('message', msg => {
        const typeString = msg.plain.split(" ")[0].toLowerCase()
        if (typeString === '#js') {
            if (!user.isMaster(msg.sender.id)) return
            const code = msg.plain.slice(typeString.length).trim()
            try {
                eval(code)
            } catch (e) {
                msg.reply(e.message)
            }
        }
    })
}