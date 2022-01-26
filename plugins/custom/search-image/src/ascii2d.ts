import { searchByUrl, Item } from "../../../module/ascii2d";
import { getImage } from "../../../utils";
import { Message, MessageType } from "mirai-ts";
import { Logger } from "el-bot/dist/bot/logger";

/**
 * 格式化结果
 * @param {Item} item
 *
 */
async function formatResult(item: Item): Promise<MessageType.MessageChain> {
  let title: string | undefined,
    type: string | undefined,
    url: string | undefined;
  if (item.source) {
    title = item.source.title;
    type = item.source.type;
    url = item.source.url;
  } else if (item.externalInfo) {
    if (typeof item.externalInfo.content === "string") {
      return [
        await getImage(item.thumbnailUrl),
        Message.Plain(`\n` + item.externalInfo.content + "\n------------\n"),
      ];
    } else {
      title = item.externalInfo.content.title;
      type = item.externalInfo.content.type;
      url = item.externalInfo.content.url;
    }
  }
  return [
    await getImage(item.thumbnailUrl),
    Message.Plain(
      `\n标题：${title ?? "未知"}` +
        `\n站点：${type ?? "未知"}` +
        `\n链接：${url ?? "未知"}` +
        "\n------------\n"
    ),
  ];
  //   return r;
}

/**
 * ascii2d搜索
 * @param {String} url
 * @param {Logger} logger
 */
export default async function (
  url: string,
  logger: Logger
): Promise<MessageType.MessageChain> {
  let content: MessageType.MessageChain = [];
  content = content.concat(Message.Plain("特徴検索\n"));
  try {
    const result = await searchByUrl(url, "bovw");
    for (let i = 0; i < 2; i++) {
      const item = result.items[i];
      content = content.concat(await formatResult(item));
    }
  } catch (e) {
    logger.warning(e.message);
    content = content.concat(Message.Plain("失败\n"));
  }
  content = content.concat(Message.Plain("色合検索\n"));
  try {
    const result = await searchByUrl(url, "color");
    for (let i = 0; i < 2; i++) {
      const item = result.items[i];
      content = content.concat(await formatResult(item));
    }
  } catch (e) {
    logger.warning(e.message);
    content = content.concat(Message.Plain("失败\n"));
  }
  content = content.concat(Message.Plain("Script by：老森"));
  return content;
}
