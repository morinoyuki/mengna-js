const { default: Bot, utils } = require("el-bot");
const { Command } = require('commander');
const Manager = require('./manager');
let groupManagerOptions = {
    listen: {
        group: [
            828090839,
        ]
    },
    ocr: {
        enable: false
    },
    muteTime: 30 * 60,
    cmdName: 'gm'
};
/**
 * 清除选项
 * @param {Command} program 
 */
function cleanOptions(program) {
    const options = program.opts();

    // reset option
    Object.keys(options).forEach((key) => {
        delete program[key];

        // 重新设置默认值
        if (program.options.length > 0) {
            program.options.forEach((option) => {
                if (
                    option.defaultValue &&
                    (option.long === `--${key}` || option.short === `-${key}`)
                ) {
                    program[key] = option.defaultValue;
                }
            });
        }
    });
}
/**
 * 简易群管系统
 * @param {Bot} ctx 
 * @param {Object} options 
 */
module.exports = async (ctx, options) => {
    if (!ctx.db) return
    const { mirai, logger, user, status: { isListening } } = ctx;
    utils.config.merge(groupManagerOptions, options);
    const manager = new Manager(ctx, groupManagerOptions);
    let tmpMsg;
    // modify prototype
    Command.prototype.outputHelp = function (cb) {
        if (!cb) {
            cb = (passthru) => {
                return passthru;
            };
        }
        const cbOutput = cb(this.helpInformation());
        if (
            cbOutput &&
            (this.parent ||
                (ctx.mirai.curMsg).plain.trim() === "gm -h")
        ) {
            ctx.reply(cbOutput.trim());
        }
        this.emit(this._helpLongFlag);
    };
    const program = new Command('gm');
    program.exitOverride();
    program.command('addkey <keyword>')
        .description('添加关键词')
        .option('-r, --re', '正则表达式')
        .option('-i, --is', '全部匹配')
        .action(async (keyword, opt) => {
            const msg = tmpMsg;
            if (!user.isAllowed(msg.sender.id, true)) return;
            try {
                let r;
                if (opt.is) {
                    r = await manager.addKeyword(keyword, 'is');
                } else if (opt.re) {
                    r = await manager.addKeyword(keyword, 're');
                } else {
                    r = await manager.addKeyword(keyword, 'includes');
                }
                msg.reply(`Done ObjectID: ${r}`);
            } catch (e) {
                msg.reply(e.message);
            }
        });
    program.command('delkey <keyword>')
        .description('删除关键词')
        .option('-r, --re', '正则表达式')
        .option('-i, --is', '全部匹配')
        .action(async (keyword, opt) => {
            const msg = tmpMsg;
            if (!user.isAllowed(msg.sender.id, true)) return;
            try {
                let r;
                if (opt.is) {
                    r = await manager.deleteKeyword(keyword, 'is');
                } else if (opt.re) {
                    r = await manager.deleteKeyword(keyword, 're');
                } else {
                    r = await manager.deleteKeyword(keyword, 'includes');
                }
                msg.reply(`Done res: ${JSON.stringify(r)}`);
            } catch (e) {
                msg.reply(e.message);
            }
        });
    program.command('setmeta <id>')
        .description('设置关键词元数据')
        .option('-m, --muteTime <number>', '禁言时间')
        .option('-n, --notice', '通知管理员')
        .action(async (id, opt) => {
            const msg = tmpMsg;
            if (!user.isAllowed(msg.sender.id, true)) return;
            let meta = {};
            if (opt.muteTime) {
                meta.muteTime = opt.muteTime;
            }
            if (opt.notice) {
                meta.notice = opt.notice;
            }
            try {
                const r = await manager.setKeywordMeta(id, meta);
                msg.reply(`Done res: ${JSON.stringify(r)}`);
            } catch (e) {
                msg.reply(e.message);
            }
        });
    program.command('checkimage')
        .description('检查涩图')
        .action(() => {
            const msg = tmpMsg;
            if (!user.isAllowed(msg.sender.id, true)) return;
            const r = manager.adultCheckSwitch();
            msg.reply(r);
        });
    mirai.on('message', msg => {
        const name = groupManagerOptions.cmdName;
        if (msg.plain.slice(0, name.length) !== name) return;
        if (msg.plain[name.length] !== " ") return;
        tmpMsg = msg;
        try {
            let cmd = [];
            let tmp = [];
            let q;
            msg.plain.split(" ").forEach((v, i, a) => {
                if (!q && (v.indexOf("'") === 0 || v.indexOf('"') === 0)) {
                    q = v.indexOf("'") === 0 ? "'" : '"';
                    const _t = v.replace(q, '');
                    if (_t) tmp.push(_t);
                } else if (q && (v.indexOf(q) === v.length - 1 || a.length - 1 === i)) {
                    const _t = v.replace(q, '')
                    if (_t) tmp.push(_t);
                    cmd.push(tmp.join(''));
                    tmp = [];
                    q = undefined;
                } else if (q) {
                    tmp.push(v);
                } else {
                    cmd.push(v);
                }
            });
            cmd.shift();
            program.parse(cmd, { from: "user" });
        } catch (err) {
            if (err.code !== "commander.help" && err.exitCode) {
                logger.error(`[gm] ${msg.plain}`);
                msg.reply(err.message);
            }
        }
        cleanOptions(program);
    });
    mirai.on('GroupMessage', msg => {
        // 非监控群
        if (!isListening(msg.sender, groupManagerOptions.listen)) return;
        if (msg.sender.permission != 'MEMBER') return;
        manager.check(msg);
    });
};