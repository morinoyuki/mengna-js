const { default: Bot } = require("el-bot");

/**
 * 
 * @param {Bot} ctx 
 */
module.exports = (ctx) => {
    const { mirai } = ctx;
    mirai.on('GroupMessage', (msg) => {
        msg.isAt(454693264)
        const qq = msg.sender
        if (msg.plain === 'sleep') {
            if (qq.permission === 'MEMBER' && qq.group.permission !== 'MEMBER') {
                mirai.api.mute(qq.group.id, qq.id, 8 * 60 * 60)
                msg.reply('口球舒服吗')
            } else if (qq.group.permission === 'MEMBER') {
                msg.reply('无管理员权限 请联系群主给我')
            } else {
                msg.reply('这是狗群员专用口球，你不能戴。')
            }

        }
    })
}