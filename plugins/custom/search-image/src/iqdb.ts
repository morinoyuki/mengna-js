import axios from "axios";
import { getImage } from "../../../utils";
import FormData from "form-data";
import { JSDOM } from "jsdom";
import { Message, MessageType } from "mirai-ts";

export interface Item {
  similarity: number;
  image?: string;
  url?: string[];
}
export interface IqdbResult {
  similarity: number;
  content: MessageType.MessageChain;
}

async function getDom(url: string): Promise<Document> {
  const form = new FormData();
  form.append("MAX_FILE_SIZE", 8388608);
  const service = [1, 2, 3, 4, 5, 6, 11, 13];
  service.forEach((v) => {
    form.append("service[]", v);
  });
  form.append("url", url);
  const { data } = await axios.post<string>("http://iqdb.org/", form, {
    headers: form.getHeaders(),
  });
  const {
    window: { document },
  } = new JSDOM(data);
  return document;
}
/**
 * 解析单个结果信息
 * @param {Element} div
 */
function parseItemInfo(div: Element): Item {
  if (div.classList.contains("nomatch")) {
    return {
      similarity: 0,
    } as Item;
  }
  const trArray = Array.from(div.querySelectorAll("tr")).slice(1);
  const image = "http://iqdb.org" + trArray[0].querySelector("img")!.src;
  const url = Array.from(div.querySelectorAll("a")).map((a) => {
    if (a.href.indexOf("http") === 0) {
      return a.href;
    }
    return "http:" + a.href;
  });
  const similarity = Number(
    trArray[trArray.length - 1].firstElementChild!.textContent!.match(
      /([0-9.]+)/
    )![1]
  );
  return {
    image,
    url,
    similarity,
  } as Item;
}
async function getSearchResults(url: string): Promise<Item[]> {
  const document = await getDom(url);
  const result = Array.from(document.querySelectorAll("#pages > div"))
    .slice(1)
    .map(parseItemInfo);
  return result;
}

async function formatResult(result: Item): Promise<MessageType.MessageChain> {
  const r = [
    await getImage(result.image!),
    Message.Plain(
      `\n相似度：${result.similarity}\n链接：${result.url!.join(
        "\n"
      )}\n------------\n`
    ),
  ];
  return r;
}
export default async function (url: string): Promise<IqdbResult> {
  const result = await getSearchResults(url);
  let r = {
    content: [],
    similarity: result[0] ? result[0].similarity : 0,
  } as IqdbResult;
  if (result.length <= 1 && r.similarity === 0) {
    r.content.push(Message.Plain("无符合的结果"));
    return r;
  }
  for (let i = 0; i < (result.length > 4 ? 4 : result.length); i++) {
    if (result[i].similarity === 0 && i === 0) {
      r.content.push(Message.Plain("下列为低相似度结果\n------------\n"));
      continue;
    }
    r.content = r.content.concat(await formatResult(result[i]));
  }
  r.content = r.content.concat(Message.Plain("Script by：老森"));
  return r;
}
