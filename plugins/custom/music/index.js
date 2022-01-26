const { Message } = require('mirai-ts');
const axios = require('axios').default;
// const stringRandom = require('string-random');
const NeteaseMusic = require('simple-netease-cloud-music');
const { default: Bot } = require('el-bot');
const qqMusic = require('qq-music-api');
const { coolDown } = require('../../utils');
qqMusic.setCookie('_qpsvr_localtk=0.3749926805038728;euin=7e4P7wEiowCP;fqm_pvqid=d233841b-edbe-4b61-b8f3-251ce71a29d3;fqm_sessionid=126c5718-d273-4bfa-bff5-b3632fe8a22d;login_type=1;pgv_info=ssid=s2971326624;pgv_pvid=2715866681;psrf_access_token_expiresAt=1636955172;psrf_musickey_createtime=1629179172;psrf_qqaccess_token=080354453C2EEEA10E7B84C3E5EDD0B3;psrf_qqopenid=D7A3B220BA4CAF9F14C0904862C5662A;psrf_qqrefresh_token=72C073E6EE7708FDD9FEB2F6C0E69E3A;psrf_qqunionid=;ptcz=4d540b988a3631c647dfe9e7dcd0c7e7080157982759db0c8d93ff333241a070;qm_keyst=Q_H_L_2GIJR460eeO-HvRFeqhd8lec3NcKcetxH8NOUuFvgk8TeoEjMyZx2lo2rxN3rZ5;qqmusic_key=Q_H_L_2GIJR460eeO-HvRFeqhd8lec3NcKcetxH8NOUuFvgk8TeoEjMyZx2lo2rxN3rZ5;RK=uKIo39JuQr;tmeLoginType=2;uin=454693264;wxopenid=;wxrefresh_token=;wxunionid=;qm_keyst=Q_H_L_2GIJR460eeO-HvRFeqhd8lec3NcKcetxH8NOUuFvgk8TeoEjMyZx2lo2rxN3rZ5;ts_last=y.qq.com/n/ryqq/songDetail/004ZGtR50HAuAj;ts_refer=ADTAGh5_playsong;ts_uid=5267705280;')
const nm = new NeteaseMusic();

/**
 * 获取APP内容
 * @param {any} song 
 * @param {string} type 
 */
function getAppContent(song, type = '163') {
    let jumpUrl;
    let musicUrl;
    let preview;
    let title;
    let appid;
    const kind = type === 'qq' ? 'QQMusic' : 'NeteaseCloudMusic';
    let ar;
    if (type === 'qq') {
        appid = 1101079856;
        jumpUrl = `https://i.y.qq.com/v8/playsong.html?_wv=1&songid=${song.id}&souce=qqshare&source=qqshare&ADTAG=qqshar`;
        musicUrl = song.url;
        preview = `http://y.gtimg.cn/music/photo_new/T002R300x300M000${song.album.pmid}.jpg`;
        title = song.name.length > 27 ? song.name.substring(0, 27) + '...' : song.name;
        let arArr = [];
        song.singer.forEach((v) => {
            arArr = arArr.concat(v.name);
        });
        const arStr = arArr.join('/');
        ar = arStr.length > 36 ? arStr.substring(0, 36) + '...' : arStr;
    } else {
        appid = 100495085;
        jumpUrl = `https://y.music.163.com/m/song?app_version=7.3.12&id=${song.id}`;
        musicUrl = `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
        preview = song.al.picUrl;
        title = song.name.length > 27 ? song.name.substring(0, 27) + '...' : song.name;
        let arArr = [];
        song.ar.forEach((v) => {
            arArr = arArr.concat(v.name);
        });
        const arStr = arArr.join('/');
        ar = arStr.length > 36 ? arStr.substring(0, 36) + '...' : arStr;
    }
    return [Message.MusicShare(kind, title, ar, jumpUrl, preview, musicUrl, "")];
}

/**
 * QQ音乐搜索
 * @param {string} keyword 
 */
async function qqMusicSearch(keyword) {
    const { data } = await axios.get(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.song&searchid=&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURI(keyword)}`);
    const j = /callback\((.+)\)$/.exec(data)[1];
    return JSON.parse(j);
}

/**
 * 点歌
 * @param {Bot} ctx 
 */
module.exports = async (ctx) => {
    const { mirai, logger } = ctx;
    // uin = ctx.el.qq;
    const cool = coolDown()
    mirai.on('message', async (msg) => {
        if (msg.plain.indexOf('届かない恋') != -1) {
            msg.reply([Message.Voice(null, null, './data/net.mamoe.mirai-api-http/voices/茅野愛衣 - 届かない恋.silk')]);
            return;
        }
        const typeString = msg.plain.split(" ")[0].toLowerCase();
        const keyword = msg.plain.slice(typeString.length).trim();
        if (typeString === '网易点歌' || typeString === '点歌') {
            if (!cool.checkCoolDown(msg.sender.id, msg.reply)) {
                return;
            }
            if (!keyword) {
                msg.reply('请输入关键词');
                return;
            }
            try {
                const { result } = await nm.search(keyword);
                if (!result.songCount) {
                    msg.reply('搜索不到');
                    return;
                }
                const appData = getAppContent(result.songs[0]);
                msg.reply(appData);
                cool.setCoolDown(msg.sender.id, 5 * 60);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        } else if (typeString === 'qq点歌') {
            if (!cool.checkCoolDown(msg.sender.id, msg.reply)) {
                return;
            }
            if (!keyword) {
                msg.reply('请输入关键词');
                return;
            }
            try {
                const r = await qqMusicSearch(keyword);
                if (!r.data.song.curnum) {
                    msg.reply('搜索不到');
                    return;
                }
                let song = r.data.song.list[0];
                const musicUrl = await qqMusic.api('song/url', { id: song.mid });
                // console.log(musicUrl);
                if (!musicUrl || !musicUrl.data) {
                    throw new Error('音频地址为空');
                }
                logger.info(`[music] QQ音频地址:${musicUrl.data}`);
                song.url = musicUrl.data;
                const appData = getAppContent(song, 'qq');
                msg.reply(appData);
                cool.setCoolDown(msg.sender.id, 5 * 60);
            } catch (e) {
                logger.error(`[music] ${e.message}`);
                msg.reply('失败');
            }
        } else if (/music\.163\.com.*song\?id=\d+|music.163.com\/.*song\/\d+/i.test(
            (msg.messageChain.length > 1 && msg.messageChain[1].type === 'Xml') ? msg.messageChain[1].xml : msg.plain
        )) {
            const netEaseId = (msg.messageChain[1].type === 'Xml' ? msg.messageChain[1].xml : msg.plain)
                .match(/music\.163\.com.*song\?id=(\d+)|music.163.com\/.*song\/(\d+)/i)[1]
            const result = await nm.song(netEaseId)
            const appData = getAppContent(result.songs[0])
            msg.reply(appData)
        }
    });
};