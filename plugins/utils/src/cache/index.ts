import Bot from "el-bot";
import schedule from "node-schedule";
// const { ICa }= require('./cache.schema');
import fs from "fs";
import { ImageCache, ICache } from "./cache.schema";
import { Logger } from "el-bot/dist/bot/logger";
import { MessageType } from "mirai-ts";
import { CallbackError } from "mongoose";

const dir: string = "./mcl/data/net.mamoe.mirai-api-http/images";
export default class CacheManager {
  private static instance: CacheManager;
  private log: Logger;
  private qq: number;
  /**
   * 搜图缓存管理器
   * @param {Bot} ctx
   */
  constructor(ctx: Bot) {
    const config = ctx.el.bot;
    const cron = <string>config.cache?.cron ?? "";
    this.log = ctx.logger;
    this.qq = ctx.el.qq;
    if (cron) this.timer(cron);
  }
  /**
   * 获取实例 单例模式
   * @param {Bot} ctx
   */
  static getInstance(ctx: Bot): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(ctx);
    }
    return CacheManager.instance;
  }
  /**
   * 设置定时器
   * @param {String} cron
   */
  private timer(cron: string) {
    this.log.success("[cache-manager] 定时器开始工作");
    schedule.scheduleJob(cron, () => {
      this.flushCache();
    });
  }
  /**
   * 清空缓存
   */
  flushCache() {
    ImageCache.deleteMany({ bot: this.qq }, {}, (err: CallbackError) => {
      if (err) {
        this.log.error(`[cache-manager] ${err.message}`);
        return;
      }
      this.log.success("[cache-manager] 已清空数据库中的缓存条目");
      fs.readdir(dir, (err, files) => {
        if (err) {
          this.log.error("[cache-manager] 图片文件列表读取失败");
          return;
        }
        files.forEach((file) => {
          if (fs.statSync(`${dir}/${file}`).isFile())
            fs.unlinkSync(`${dir}/${file}`);
        });
        this.log.success("[cache-manager] 已清空图片临时文件");
      });
    });
  }
  /**
   * 获取缓存
   * @param {String} imageMd5
   * @param {String} type
   */
  async getCache(imageMd5: string, type: string): Promise<ICache | null> {
    try {
      const r = await ImageCache.findOne({
        imageMd5,
        type,
        bot: this.qq,
      });
      return r;
    } catch (e) {
      this.log.error("[cache-manager] 缓存读取失败");
      return null;
    }
  }
  /**
   * 写入缓存
   * @param {String} imageMd5
   * @param {String} type
   * @param {MessageType.MessageChain} msg
   * @param {Number} similarity
   */
  async setCache(
    imageMd5: string,
    type: string,
    msg: MessageType.MessageChain,
    similarity: number = 0
  ): Promise<ICache> {
    const imageCache = new ImageCache({
      imageMd5,
      date: Date.now(),
      type,
      similarity,
      bot: this.qq,
      msg,
    });
    try {
      const r = await imageCache.save();
      this.log.success("[cache-manager] 缓存成功");
      return r;
    } catch (err) {
      this.log.error(`[cache-manager] ${err.message}`);
      throw err;
    }
  }
}
