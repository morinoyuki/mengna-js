import download from "download";
import adultCheck from "./adult-check";
import stringRandom from "string-random";
import { Message, MessageType } from "mirai-ts";
import CacheManager from "./cache";
import axios from "axios";
import path = require("path");
export type Cache = CacheManager;
export const getCacheManager = CacheManager.getInstance;

export interface ReplyCallback {
  (msgChain: string | MessageType.MessageChain, quote?: boolean): Promise<void>;
}
export interface CoolMethods {
  checkCoolDown: (qq: number, reply?: ReplyCallback) => boolean;
  setCoolDown: (qq: number, time: number) => void;
}
interface CoolData {
  [key: string]: number;
}


/**
 * 安全的获取图片
 * @param {String} url
 */
export async function getImage(
  url: string
): Promise<MessageType.Image | MessageType.Plain> {
  const imageDir = "./data/net.mamoe.mirai-api-http/images";
  try {
    if (await adultCheck.isAdult(url)) {
      return Message.Plain("[Adult]");
    }
    const fileName = `${stringRandom(32)}.temp`;
    await download(url, path.join("./mcl", imageDir), {
      filename: fileName,
    });
    return Message.Image(null, null, path.join(imageDir, fileName));
  } catch {
    return Message.Plain("[error]");
  }
}
/**
 * 格式化秒数
 * @param {Number} sec
 */
export function secFormat(sec: number): string {
  const date = {
    d: Math.floor(sec / 60 / 60 / 24),
    h: Math.floor((sec / 60 / 60) % 24),
    m: Math.floor((sec / 60) % 60),
    s: Math.floor(sec % 60),
  };
  return (
    (date.d ? `${date.d}天` : "") +
    (date.h ? `${date.h}小时` : "") +
    (date.m ? `${date.m}分钟` : "") +
    (date.s ? `${date.s}秒` : "")
  );
}

export function coolDown(): CoolMethods {
  const coolDownData: CoolData = {};
  /**
   * 设置冷却时间
   * @param {Number} qq
   * @param {Number} time
   */
  const setCoolDown = (qq: number, time: number) => {
    if (qq === 3580562304 || qq === 454693264) return;
    coolDownData[String(qq)] = Date.now() + time * 1000;
  };
  /**
   * 检查冷却
   * @param {Number} qq
   * @param {ReplyCallback} reply
   */
  const checkCoolDown = (qq: number, reply?: ReplyCallback): boolean => {
    const time = coolDownData[String(qq)] ?? 0;
    if (time < Date.now()) {
      if (time) delete coolDownData[String(qq)];
      return true;
    }
    if (typeof reply === "function")
      reply(`冷却中 ${secFormat((time - Date.now()) / 1000)}`);
    return false;
  };
  return {
    checkCoolDown,
    setCoolDown,
  };
}
