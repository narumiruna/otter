import type { MessageFormatter } from "../apps/web/src/client/i18n/message-types.js";
import type { Catalogs } from "./ios-localization-types.js";
export interface FunctionShape {
  parameters: string[];
  pluralParameters: string[];
  pluralForms: { parameter: string; forms: Record<string, string> }[];
}
/** Inspect the actual formatter syntax. Do not flatten functions by calling them with {}. */
export function decodeScriptEscapes(text: string): string {
  return text.replace(
    /\\(?:x([\da-f]{2})|u([\da-f]{4})|u\{([\da-f]+)\})/gi,
    (_m, x: string, u: string, point: string) =>
      String.fromCodePoint(Number.parseInt(x || u || point, 16)),
  );
}
export function inspectFormatter(formatter: {
  toString(): string;
}): FunctionShape {
  const source = formatter.toString();
  const parameters = [
    ...new Set([...source.matchAll(/(?<!\$)\{(\w+)\}/g)].map((m) => m[1])),
  ].sort();
  const pluralParameters = new Set<string>();
  const pluralForms: FunctionShape["pluralForms"] = [];
  // Accept native ESM and the (0, module.helper)(...) form used by tsx/Vitest.
  const quoted = String.raw`("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')`;
  const decode = (text: string) =>
    text
      .slice(1, -1)
      .replace(
        /\\(?:x([\da-f]{2})|u([\da-f]{4})|u\{([\da-f]+)\}|([\\"'nrt]))/gi,
        (_m, x: string, u: string, point: string, char: string) => {
          if (x || u || point)
            return String.fromCodePoint(Number.parseInt(x || u || point, 16));
          return { n: "\n", r: "\r", t: "\t" }[char] ?? char;
        },
      );
  const binary = new RegExp(
    String.raw`\bpluralize\)?\s*\(\s*\w+\.(\w+)\s*,\s*${quoted}(?:\s*,\s*${quoted})?`,
    "g",
  );
  for (const match of source.matchAll(binary)) {
    pluralParameters.add(match[1]);
    const one = decode(match[2]);
    pluralForms.push({
      parameter: match[1],
      forms: { one, other: match[3] ? decode(match[3]) : `${one}s` },
    });
  }
  const cldr =
    /\bpluralForm\)?\s*\(\s*["'][^"']*["']\s*,\s*\w+\.(\w+)\s*,\s*\{/g;
  for (const match of source.matchAll(cldr)) {
    pluralParameters.add(match[1]);
    const tail = source.slice(match.index + match[0].length);
    const forms: Record<string, string> = {};
    // Forms are flat objects of string literals. Stop at the first non-property.
    const property = new RegExp(
      String.raw`^\s*,?\s*(one|two|few|many|zero|other)\s*:\s*${quoted}`,
    );
    let remaining = tail;
    for (
      let item = remaining.match(property);
      item;
      item = remaining.match(property)
    ) {
      forms[item[1]] = decode(item[2]);
      remaining = remaining.slice(item[0].length);
    }
    pluralForms.push({ parameter: match[1], forms });
  }
  return {
    parameters,
    pluralParameters: [...pluralParameters].sort(),
    pluralForms,
  };
}

export function resolveWebMessage(
  catalogs: Catalogs,
  locale: string,
  key: string,
): string | MessageFormatter {
  const value = catalogs[locale]?.[key];
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "function")
    return (values) => {
      const output: unknown = value(values);
      if (typeof output !== "string" || !output.trim())
        throw new Error(`${locale}.${key}: invalid formatter output`);
      return output;
    };
  throw new Error(`${locale}.${key}: missing or invalid Web value`);
}
