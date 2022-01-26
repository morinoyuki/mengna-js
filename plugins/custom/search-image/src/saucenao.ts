import { getImage } from "../../../utils";
import sagiri, { Options, SagiriResult } from "sagiri";
import { Message, MessageType } from "mirai-ts";

export interface SaucenaoResult {
  content: MessageType.MessageChain;
  similarity: number;
}

export interface Client {
  (url: string): Promise<SaucenaoResult>;
}
// 格式化saucenao结果
async function formatResult(
  result: SagiriResult
): Promise<MessageType.MessageChain> {
  const r = [
    await getImage(result.thumbnail),
    Message.Plain(
      `\n相似度：${result.similarity}` +
      `\n站点：${result.site}` +
      `\n链接：${result.url}` +
      `\n作者：${result.authorName ?? "未知"}` +
      "\n------------\n"
    ),
  ];
  return r;
}

/**
 * 获取Client
 * @param {String[]} token
 * @param {Options} options
 */
export default function (token: string[], options: Options): Client {
  if (!options.results) options.results = 4;
  const client = token.map((v) => {
    return sagiri(v, options);
  });
  let tokenIndex = 0;
  return async (url: string): Promise<SaucenaoResult> => {
    const result = await client[tokenIndex](url);
    tokenIndex = (tokenIndex + 1) % client.length;
    let content = [] as MessageType.MessageChain;
    let num = 0;
    for (
      let i = 0;
      i < (result.length > options.results! ? options.results! : result.length);
      i++
    ) {
      if (result[0].similarity < 40) break;
      content = content.concat(await formatResult(result[i]));
      num++;
    }
    if (content.length == 0) throw new Error("无结果");
    content = content.concat(Message.Plain(`${num}个结果 Script by：老森`));
    return {
      content,
      similarity: result[0].similarity,
    } as SaucenaoResult;
  };
}
