import type { CatalogShape } from "./message-types.js";
import { en } from "./messages-en.js";
import { zhTW } from "./messages-zh-tw.js";

export type Locale = "en" | "zh-TW";
export type Messages = CatalogShape<typeof zhTW>;

export const translations: Record<Locale, Messages> = {
  "zh-TW": zhTW,
  en,
};
