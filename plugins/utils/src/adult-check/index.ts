import axios from "axios";
import { Result } from "./types";
const key: string = "ba699e8df51ceff5e37aeb5f9ff432e6";

async function submitRemoteImage(url: string): Promise<Result> {
  const { data } = await axios.get<Result>(
    `https://www.moderatecontent.com/api/v2?key=${key}&url=${encodeURI(url)}`
  );
  return data;
}
async function isAdult(url: string): Promise<boolean> {
  try {
    const data = await submitRemoteImage(url);
    if (data.error_code !== 0) return false;
    if (data.rating_index === 3) return true;
    return false;
  } catch {
    return false;
  }
}
async function getData(url: string): Promise<Result> {
  return await submitRemoteImage(url);
}
export default {
  isAdult,
  getData,
};
