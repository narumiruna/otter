import type { Locale } from "./locales.js";
import type { CatalogShape } from "./message-types.js";
import { en } from "./messages-en.js";
import { ja } from "./messages-ja.js";
import { ko } from "./messages-ko.js";
import { zhTW } from "./messages-zh-tw.js";

export type { Locale } from "./locales.js";
export type Messages = CatalogShape<typeof zhTW>;

export const translations: Record<Locale, Messages> = {
  "zh-TW": zhTW,
  en,
  ja,
  ko,
};
