const { default: Bot } = require("el-bot");
const { Message, check } = require('mirai-ts');
const fetch = require('node-fetch').default;
const { BlackKeyword } = require('./schema');
const { Types: { ObjectId } } = require('mongoose');
const { adultCheck: adult } = require('../../utils');
const token = Symbol('token');
const options = Symbol('options');
const mute = Symbol('mute');
const logger = Symbol('logger');
const ocr = Symbol('ocr');
const api = Symbol('api');
const cache = Symbol('cache');
const notice = Symbol('notice');
const admin = Symbol('admin');
const master = Symbol('master');
const adultOn = Symbol('adult');
const adultCache = Symbol('adultCache');
const adultCheck = Symbol('adultCheck');
module.exports = class {
    /**
     * 管理器类
     * @param {Bot} ctx 
     * @param {Object} opt 
     */
    constructor(ctx, opt) {
        const { el } = ctx;
        this[admin] = el.bot.admin;
        this[master] = el.bot.master;
        this[options] = opt;
        this[api] = ctx.mirai.api;
        if (this[options].ocr.enable) this[cache] = { i: 0 };
        this[adultCache] = { i: 0 }
        this[adultOn] = false
        this[logger] = ctx.logger;
    }
    /**
     * 涩图检查
     * @param {string} url 图片地址
     * @returns 
     */
    async [adultCheck](url) {
        const md5 = url.match(/\-([^-\/]{32})/)[1];
        if (this[adultCache][md5] !== undefined) return this[adultCache][md5];
        if (this[adultCache].i >= 500) this[adultCache] = { i: 0 };
        try {
            const data = await adult.getData(url);
            this[logger].info('[adult] 色情指数：' + data.predictions.adult);
            if (data.predictions.adult >= 80) {
                this[adultCache][md5] = true;
                this[adultCache].i++;
                return true;
            }
            this[adultCache][md5] = false;
            this[adultCache].i++;
            return false;
        } catch {
            this[logger].error('[adult] 数据获取失败')
            return false;
        }
    }
    /**
     * OCR识别-baidu api
     * @param {String} url 
     */
    async [ocr](url) {
        if (!this[token] || !this[token].token || !this[token].time || this[token].time < Math.floor(Date.now() / 1000)) {
            const r = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this[options].ocr.apiKey}&client_secret=${this[options].ocr.secretKey}`).then(res => res.text());
            const j = JSON.parse(r);
            this[token] = {};
            this[token].token = j.access_token;
            this[token].time = Math.floor(Date.now / 1000) + j.expires_in;
        }
        const response = await fetch(url);
        const imageType = response.headers.get('Content-Type');
        if (!imageType || imageType === 'image/gif') {
            return null;
        }
        const result = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${this[token].token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `url=${url}`
        }).then(res => res.text());
        const json = JSON.parse(result);
        if (!json.words_result || json.words_result.length === 0) {
            return null;
        }
        let res = '';
        for (let i = 0; i < json.words_result.length; i++) {
            res = res + json.words_result[i].words;
        }
        return res;
    }
    /**
     * 消息检查
     * @param {import('mirai-ts').MessageType.ChatMessage} msg 
     */
    async check(msg) {
        const documents = await BlackKeyword.find({});
        if (msg.plain) {
            for (let i = 0; i < documents.length; i++) {
                if (check.match(msg.plain, documents[i].keyword)) { // 文本
                    this[mute](msg, documents[i]); // 禁言
                    return true;
                }
            }
        }
        // 涩图
        if (this[adultOn]) {
            msg.messageChain.forEach(async smsg => {
                if (smsg.type === 'Image') {
                    if (await this[adultCheck](smsg.url)) {
                        this[api].mute(msg.sender.group.id, msg.sender.id, 30 * 60);
                        msg.reply('检测到涩图 封禁半小时 ver.alpha');
                        this[notice](msg);
                        return true;
                    }
                }
            });
        }
        // OCR
        if (!this[options].ocr.enable) return false;
        let imageMd5 = '';
        for (let i = 0; i < msg.messageChain.length; i++) {
            if (msg.messageChain[i].type === 'Image') {
                imageMd5 = msg.messageChain[i].url.match(/\-([^-\/]{32})/)[1];
                if (!this[cache][imageMd5]) {
                    if (this[cache].i > 500) { // 缓存大于500
                        delete this[cache];
                        this[cache] = { i: 0 };
                    }
                    this[cache][imageMd5] = { text: await this[ocr](msg.messageChain[i].url) };
                    this[cache].i++;
                }
                for (let index = 0; index < documents.length; index++) {
                    if (this[cache][imageMd5] && this[cache][imageMd5].text && check.match(this[cache][imageMd5].text, documents[index].keyword)) {
                        this[mute](msg, documents[index]); // 禁言
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * 禁言
     * @param {import('mirai-ts').MessageType.ChatMessage} msg 
     * @param {Object} document 
     */
    [mute](msg, document) {
        let keywordText;
        if (document.keyword.includes) {
            keywordText = Array.isArray(document.keyword.includes) ? document.keyword.includes.join('&') : document.keyword.includes;
        }
        if (document.keyword.re) {
            keywordText = typeof (document.keyword.re) === 'string' ? document.keyword.re : document.keyword.re.pattern;
        }
        if (document.keyword.is) {
            keywordText = Array.isArray(document.keyword.includes) ? document.keyword.is.join('/') : document.keyword.is;
        }
        this[api].mute(msg.sender.group.id, msg.sender.id, (document.meta && document.meta.muteTime) || this[options].muteTime).then(res => {
            if (res.code === 0) {
                msg.reply(`检测到关键词: ${keywordText},type: ${document.type} ObjectID: ${document._id}\n予以处罚`);
            }
        });
        if (document.meta.notice) {
            this[notice](msg);
        }
    }
    /**
     * 通知管理员
     * @param {import('mirai-ts').MessageType.ChatMessage} msg 
     */
    async [notice](msg) {
        if (!this[admin]) return;
        const memberList = await this[api].memberList(msg.sender.group.id);
        const adminList = this[admin].concat(this[master]);
        let noticeList = [];
        memberList.forEach(_member => {
            adminList.forEach(_admin => {
                if (_member.id === _admin) {
                    noticeList.push(Message.At(_admin));
                }
            });
        });
        if (noticeList.length === 0) return;
        noticeList.unshift(Message.Plain('过来收拾人\n'));
        msg.reply(noticeList);
    }
    /**
     * 向数据库添加关键词
     * @param {String} keyword 
     * @param {'is'|'re'|'includes'} type 
     * @returns {Promise<import("mongodb").InsertOneWriteOpResult>}
     */
    async addKeyword(keyword, type) {
        let r;
        let blackKeyword;
        switch (type) {
            case 'includes':
                const keywordArray = keyword.split('|');
                if ((await BlackKeyword.find({ keyword: { includes: keywordArray }, type }).count()) > 0) throw new Error('已存在');
                blackKeyword = new BlackKeyword(
                    {
                        keyword: { includes: keywordArray },
                        type
                    }
                );
                await blackKeyword.save();
                r = blackKeyword.get('id');
                break;
            case 're':
                if ((await BlackKeyword.find({ keyword: { re: keyword }, type }).count()) > 0) throw new Error('已存在');
                blackKeyword = new BlackKeyword(
                    {
                        keyword: { re: keyword },
                        type
                    }
                );
                await blackKeyword.save();
                r = blackKeyword.get('id');
                break;
            case 'is':
                if ((await BlackKeyword.find({ keyword: { is: keyword }, type }).count()) > 0) throw new Error('已存在');
                blackKeyword = new BlackKeyword(
                    {
                        keyword: { is: keyword },
                        type
                    }
                );
                await blackKeyword.save();
                r = blackKeyword.get('id');
                break;
            default:
                throw new Error('类型错误');
        }
        return r;
    }
    /**
     * 删除关键词
     * @param {String} keyword 
     * @param {'is'|'re'|'includes'} type 
     */
    async deleteKeyword(keyword, type) {
        if (type === 'includes') {
            const keywordArray = keyword.split('|');
            const r = await BlackKeyword.deleteOne({
                keyword: {
                    includes: keywordArray
                },
                type
            });
            return r;
        } else if (type === 'is' || type === 're') {
            const r = await BlackKeyword.deleteOne({
                keyword: {
                    [type]: keyword
                },
                type
            });
            return r;
        }
        throw new Error('类型错误');
    }
    /**
     * 设置关键词元数据
     * @param {String} id 
     * @param {Object} meta 
     */
    async setKeywordMeta(id, meta) {
        const _id = ObjectId(id);
        const r = await BlackKeyword.updateOne({ _id }, { $set: { meta } });
        return r;
    }
    /**
     * 成人图片检查开关
     * @param {boolean} on 
     */
    adultCheckSwitch() {
        this[adultOn] = !this[adultOn];
        return this[adultOn] ? 'on' : 'off';
    }
};