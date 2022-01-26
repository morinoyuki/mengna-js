const { default: Bot } = require("el-bot")
// const { Message } = require('mirai-ts')
const schedule = require('node-schedule')
const { coolDown } = require("../../utils")
const { QuitGroup, BotList } = require('./schema')

const content = '发现其他同系列机器人，准备退群。'
const opt = {// 设置
    whiteList: {
        group: [// 白名单
            688934898,
            1014055660,
            632469708,
            828090839,
            1039688791,
            242130892,
            86134273,
            893955303,
            129654619,
            725349902
        ]
    }
}
function checkExists(bots, qq) {
    let exists = false
    bots.forEach(bot => {
        if (bot.qq === qq) exists = true
    })
    return exists
}

/**
 * 机器人被邀请
 * @param {Bot} ctx 
 */
module.exports = async (ctx) => {
    if (!ctx.db) return
    const { mirai, logger, el: { qq }, status: { isListening } } = ctx

    let bots = await BotList.find()
    if (!checkExists(bots, qq)) new BotList({ qq }).save((err, docs) => {
        if (err) logger.error('[invited-bot] 增加机器人至数据库失败')
        else logger.success('[invited-bot] 已增加机器人至数据库: ' + docs.id)
    })

    schedule.scheduleJob('0 0 0 * * *', async () => {
        bots = await BotList.find()
        logger.success('[invited-bot] 刷新机器人列表成功')
    })

    const cool = coolDown()

    const getReply = (qq, group) => {
        return async message => {
            if (group) return await mirai.api.sendTempMessage(message, qq, group)
            return null
        }
    }
    if (qq !== 3587678225) {
        mirai.on('GroupMessage', async msg => {
            if (checkExists(bots, msg.sender.id) && msg.plain !== content && msg.sender.group.permission !== 'OWNER') {
                await msg.reply(content)
                mirai.api.quit(msg.sender.group.id)
            }
        })
        mirai.on('BotInvitedJoinGroupRequestEvent', async event => {
            if (await QuitGroup.findOne({ group: event.groupId })) {
                mirai.api.resp.botInvitedJoinGroupRequest(event, 1, '不加')
                mirai.api.sendFriendMessage('已被列为黑名单', event.fromId)
            } else {
                await mirai.api.resp.botInvitedJoinGroupRequest(event, 0, '同意')
                await mirai.api.sendGroupMessage('发送“帮助”即可获取功能列表', event.groupId)
            }
        })
        mirai.on('NewFriendRequestEvent', event => {
            if (cool.checkCoolDown(event.fromId, getReply(event.fromId, event.groupId))) {
                mirai.api.resp.newFriendRequest(event, 0, '同意')
                cool.setCoolDown(event.fromId, 2 * 60 * 60)
            }
        })
        mirai.on('BotMuteEvent', async event => { // 被禁言时退出并列为黑名单
            mirai.api.quit(event.operator.group.id)
            const doc = await QuitGroup.findOne({ group: event.operator.group.id })
            if (!doc) {
                const quitGroup = new QuitGroup({ group: event.operator.group.id })
                quitGroup.save()
            }
        })
    } else {
        mirai.on('GroupMessage', async msg => {
            if (!isListening(msg.sender, opt.whiteList)) {
                await msg.reply('已启用白名单模式 本群未被列为白名单 将退出')
                mirai.api.quit(msg.sender.group.id)
            }
        })
    }
};