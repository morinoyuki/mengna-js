import { Schema, model, Document } from "mongoose";
import { MessageType } from "mirai-ts";

const schema = new Schema({
  imageMd5: { type: String, index: true, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, index: true, required: true },
  similarity: { type: Number, default: 0 },
  bot: { type: Number, required: true },
  msg: Array,
});

export interface ICache extends Document {
  imageMd5: string;
  date: Date;
  type: string;
  similarity: number;
  bot: number;
  msg: MessageType.MessageChain;
}
export const ImageCache = model<ICache>("imageCache", schema);
