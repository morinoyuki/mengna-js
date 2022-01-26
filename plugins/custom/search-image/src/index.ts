import Bot, { utils } from "el-bot";
import { Message, MessageType } from "mirai-ts";
import { Options } from "sagiri";
import { getCacheManager, coolDown } from "../../../utils";
import CacheManager from "../../../utils/dist/cache";
import saucenao, { Client, SaucenaoResult } from "./saucenao";
import ascii2d from "./ascii2d";
import iqdb, { IqdbResult } from "./iqdb";
import { Logger } from "el-bot/dist/bot/logger";

interface SearchOptions {
  token: string[];
  options: Options;
}

let client: Client;
let cache: CacheManager;

// 配置项
let searchImage = {
  token: [],
  options: {
    results: 2,
  },
} as SearchOptions;

function limitTime(
  time: number,
  fn: () => Promise<IqdbResult | SaucenaoResult | MessageType.MessageChain>
) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("超时"));
    }, time);
    fn().then(resolve).catch(reject);
  });
}

async function saSearch(
  url: string,
  imageMd5: string,
  logger: Logger
): Promise<SaucenaoResult> {
  logger.info("[search-image] [saucenao] 检查缓存");
  const saucenaoCache = await cache.getCache(imageMd5, "saucenao");
  let content = [] as MessageType.MessageChain;
  let similarity = 0;
  if (saucenaoCache) {
    logger.success("[search-image] [saucenao] 使用缓存数据");
    content = saucenaoCache.msg as MessageType.MessageChain;
    similarity = saucenaoCache.similarity;
  } else {
    logger.info("[search-image] [saucenao] 搜索中");
    try {
      const saData = (await limitTime(
        3 * 60 * 1000,
        async () => await client(url)
      )) as SaucenaoResult;
      logger.success("[search-image] [saucenao] 搜索结束");
      content = saData.content;
      similarity = saData.similarity;
      cache.setCache(imageMd5, "saucenao", content, similarity);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`[search-image] ${e.message}`);
        content = [Message.Plain(e.message)];
      }
      similarity = 0;
    }
  }
  return {
    content,
    similarity,
  } as SaucenaoResult;
}

async function a2dSearch(
  url: string,
  imageMd5: string,
  logger: Logger
): Promise<MessageType.MessageChain> {
  logger.info("[search-image] [ascii2d] 检查缓存");
  const ascii2dCache = await cache.getCache(imageMd5, "ascii2d");
  if (ascii2dCache) {
    logger.success("[search-image] [ascii2d] 使用缓存数据");
    return ascii2dCache.msg as MessageType.MessageChain;
  }
  logger.info("[search-image] [ascii2d] 搜索中");
  try {
    const a2dContent = (await limitTime(
      3 * 60 * 1000,
      async () => await ascii2d(url, logger)
    )) as MessageType.MessageChain;
    logger.success("[search-image] [ascii2d] 搜索结束");
    cache.setCache(imageMd5, "ascii2d", a2dContent, 0);
    return a2dContent;
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`[search-image] ${e.message}`);
      return [Message.Plain(e.message)] as MessageType.MessageChain;
    }
  }
  return [Message.Plain('未知错误')] as MessageType.MessageChain;
}

async function iqdbSearch(
  url: string,
  imageMd5: string,
  logger: Logger
): Promise<IqdbResult> {
  logger.info("[search-image] [iqdb] 检查缓存");
  const iqdbCache = await cache.getCache(imageMd5, "iqdb");
  if (iqdbCache) {
    logger.success("[search-image] [iqdb] 使用缓存数据");
    return {
      content: iqdbCache.msg,
      similarity: iqdbCache.similarity,
    } as IqdbResult;
  } else {
    logger.info("[search-image] [iqdb] 搜索中");
    try {
      const iqData = (await limitTime(
        3 * 60 * 1000,
        async () => await iqdb(url)
      )) as IqdbResult;
      logger.success("[search-image] [iqdb] 搜索结束");
      cache.setCache(imageMd5, "iqdb", iqData.content, iqData.similarity);
      return iqData;
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`[search-image] ${e.message}`);
        return {
          content: [Message.Plain("error: " + e.message)],
          similarity: 0,
        } as IqdbResult;
      }
      return {
        content: [Message.Plain("error: 未知")],
        similarity: 0,
      } as IqdbResult;
    }
  }
}

/**
 * 搜图
 * @param {Bot} ctx
 * @param {SearchOptions} options
 */
export default async function (
  ctx: Bot,
  options: SearchOptions
): Promise<void> {
  if (!ctx.db) return;
  const { mirai, logger } = ctx;
  utils.config.merge(searchImage, options);
  const cool = coolDown();
  const iCool = coolDown();
  client = saucenao(searchImage.token, searchImage.options);
  cache = getCacheManager(ctx);
  const autoRemove = (result: any) => {
    if (result.code === 0)
      setTimeout(() => {
        mirai.api.recall(result.messageId).then((r) => {
          if (r.code === 0)
            logger.success("[search-image] 成功撤回: " + result.messageId);
        });
      }, 2 * 60 * 1000 - 5000);
  };
  const searchImageFlag = new Set<number>();
  const a2dFlag = new Set<number>();
  const iqdbFlag = new Set<number>();
  mirai.on("message", async (msg) => {
    if (
      msg.plain.trim() === "搜图" &&
      cool.checkCoolDown(msg.sender.id, msg.reply)
    ) {
      searchImageFlag.add(msg.sender.id);
      cool.setCoolDown(msg.sender.id, 5 * 60);
      if (msg.messageChain.length == 2) {
        msg.reply("请发送要搜索的图片");
        return;
      }
    } else if (
      (msg.plain.trim() === "a2d" || msg.plain.trim() === "ascii2d") &&
      cool.checkCoolDown(msg.sender.id, msg.reply)
    ) {
      cool.setCoolDown(msg.sender.id, 5 * 60);
      a2dFlag.add(msg.sender.id);
      if (msg.messageChain.length == 2) {
        msg.reply("请发送要搜索的图片");
        return;
      }
    } else if (
      (msg.plain.trim() === "iqdb" || msg.plain.trim() === "iq搜图") &&
      iCool.checkCoolDown(msg.sender.id, msg.reply)
    ) {
      iCool.setCoolDown(msg.sender.id, 5 * 60);
      iqdbFlag.add(msg.sender.id);
      if (msg.messageChain.length == 2) {
        msg.reply("请发送要搜索的图片");
        return;
      }
    }
    if (searchImageFlag.has(msg.sender.id)) {
      msg.messageChain.forEach(async (message) => {
        if (message.type === "Image") {
          const imageMd5 = message.url!.match(/\-([^-\/]{32})/)![1];
          logger.success("[search-image] 取得图片MD5: " + imageMd5);
          let saData = await saSearch(message.url!, imageMd5, logger);
          if (saData.similarity >= 40) {
            if (saData.similarity < 60) {
              saData.content = [
                ...saData.content,
                Message.Plain("\n相似度过低 正在尝试iqdb查询"),
              ];
            } else if (saData.similarity < 80) {
              saData.content = [
                ...saData.content,
                Message.Plain("\n相似度较低 若不对请尝试a2d命令进行搜索"),
              ];
              cool.setCoolDown(msg.sender.id, 0);
            }
            msg
              .reply(saData.content)
              .then((v) => autoRemove(v))
              .catch((v) => {
                msg.reply(`错误:${v.message}`);
              });
          } else {
            msg.reply("SauceNAO查询失败 正在尝试iqdb查询");
          }
          if (saData.similarity <= 60) {
            iCool.setCoolDown(msg.sender.id, 10 * 60);
            let iqData = await iqdbSearch(message.url!, imageMd5, logger);
            if (iqData.similarity !== 0) {
              msg
                .reply(iqData.content)
                .then((v) => autoRemove(v))
                .catch((v) => {
                  msg.reply(`错误:${v.message}`);
                });
            } else {
              msg
                .reply([
                  ...iqData.content,
                  Message.Plain("\n正在尝试ascii2d查询"),
                ])
                .then((v) => autoRemove(v))
                .catch((v) => {
                  msg.reply(`错误:${v.message}`);
                });
            }
            if (iqData.similarity < 60) {
              msg
                .reply(await a2dSearch(message.url!, imageMd5, logger))
                .then((v) => autoRemove(v))
                .catch((v) => {
                  msg.reply(`错误:${v.message}`);
                });
            }
          }
        }
      });
      if (searchImageFlag.has(msg.sender.id))
        searchImageFlag.delete(msg.sender.id);
    } else if (a2dFlag.has(msg.sender.id)) {
      msg.messageChain.forEach(async (message) => {
        if (message.type === "Image") {
          const imageMd5 = message.url!.match(/\-([^-\/]{32})/)![1];
          logger.success("[search-image] 取得图片MD5: " + imageMd5);
          msg
            .reply(await a2dSearch(message.url!, imageMd5, logger))
            .then((v) => autoRemove(v))
            .catch((v) => {
              msg.reply(`错误:${v.message}`);
            });
        }
      });
      if (a2dFlag.has(msg.sender.id))
        a2dFlag.delete(msg.sender.id);
    } else if (iqdbFlag.has(msg.sender.id)) {
      msg.messageChain.forEach(async (message) => {
        if (message.type === "Image") {
          const imageMd5 = message.url!.match(/\-([^-\/]{32})/)![1];
          logger.success("[search-image] 取得图片MD5: " + imageMd5);
          const data = await iqdbSearch(message.url!, imageMd5, logger);
          msg
            .reply(data.content)
            .then((v) => autoRemove(v))
            .catch((v) => {
              msg.reply(`错误:${v.message}`);
            });
        }
      });
      if (iqdbFlag.has(msg.sender.id))
        iqdbFlag.delete(msg.sender.id);
    }
  });
}
