import type { Locale } from "./locales.js";
import type { CatalogShape } from "./message-types.js";
import { de } from "./messages-de.js";
import { en } from "./messages-en.js";
import { es } from "./messages-es.js";
import { fil } from "./messages-fil.js";
import { fr } from "./messages-fr.js";
import { hi } from "./messages-hi.js";
import { id } from "./messages-id.js";
import { it } from "./messages-it.js";
import { ja } from "./messages-ja.js";
import { ko } from "./messages-ko.js";
import { ms } from "./messages-ms.js";
import { nl } from "./messages-nl.js";
import { pl } from "./messages-pl.js";
import { pt } from "./messages-pt.js";
import { th } from "./messages-th.js";
import { tr } from "./messages-tr.js";
import { vi } from "./messages-vi.js";
import { zhTW } from "./messages-zh-tw.js";

export type { Locale } from "./locales.js";
export type Messages = CatalogShape<typeof zhTW>;

export const translations: Record<Locale, Messages> = {
  "zh-TW": zhTW,
  en,
  ja,
  ko,
  hi,
  es,
  fr,
  pt,
  id,
  de,
  vi,
  tr,
  fil,
  th,
  it,
  pl,
  ms,
  nl,
};
