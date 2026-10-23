import type {
  Argument,
  Sources,
  SwiftLiteral,
} from "./ios-localization-types.js";
/** Scan lexical bodies, not rendered text. Nested strings remain separate occurrences. */
export function scanSwift(text: string, path: string): SwiftLiteral[] {
  const found: Omit<SwiftLiteral, "ordinal">[] = [];
  const n = text.length;
  function code(start: number, interpolation = false): number {
    let i = start;
    let depth = 0;
    while (i < n) {
      if (text.startsWith("//", i)) {
        const end = text.indexOf("\n", i);
        i = end < 0 ? n : end + 1;
      } else if (text.startsWith("/*", i)) {
        let comments = 1;
        i += 2;
        while (i < n && comments) {
          if (text.startsWith("/*", i)) {
            comments++;
            i += 2;
          } else if (text.startsWith("*/", i)) {
            comments--;
            i += 2;
          } else i++;
        }
        if (comments) throw new Error(`${path}: unterminated comment`);
      } else if (text[i] === '"' || /^#+"/.test(text.slice(i, i + 32))) {
        i = string(i);
      } else if (interpolation && text[i] === ")" && depth === 0) {
        return i + 1;
      } else {
        if (interpolation && text[i] === "(") depth++;
        if (interpolation && text[i] === ")") depth--;
        i++;
      }
    }
    if (interpolation) throw new Error(`${path}: unterminated interpolation`);
    return i;
  }
  function string(start: number): number {
    const hashes = text.slice(start).match(/^#+/)?.[0] ?? "";
    const quote = start + hashes.length;
    const delimiter = text.startsWith('"""', quote) ? '"""' : '"';
    const closing = delimiter + hashes;
    const escapePrefix = `\\${hashes}`;
    const body = quote + delimiter.length;
    const interpolations: string[] = [];
    let i = body;
    while (i < n) {
      if (text.startsWith(closing, i)) {
        found.push({
          path,
          line: text.slice(0, start).split("\n").length,
          value: text.slice(body, i),
          interpolations,
          start,
          end: i + closing.length,
          hashes,
          multilineIndent:
            delimiter === '"""'
              ? text.slice(text.lastIndexOf("\n", i) + 1, i)
              : undefined,
        });
        return i + closing.length;
      }
      if (text.startsWith(`${escapePrefix}(`, i)) {
        const expressionStart = i;
        i = code(i + escapePrefix.length + 1, true);
        interpolations.push(text.slice(expressionStart, i));
      } else if (text.startsWith(escapePrefix, i)) i += escapePrefix.length + 1;
      else i++;
    }
    throw new Error(`${path}: unterminated string`);
  }
  code(0);
  const ordinals = new Map<number, number>();
  // Keep lexical order even when the scanner finds inner strings first.
  // Ordinals use discovery order, as in the original Python inventory.
  return found.map((item) => {
    const ordinal = ordinals.get(item.line) ?? 0;
    ordinals.set(item.line, ordinal + 1);
    return { ...item, ordinal };
  });
}

export function containsHan(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

/** Source text comparisons must not normalize punctuation or Unicode code points. */
export function swiftFormat(
  value: string,
  interpolations: string[],
  args: Argument[],
  literal?: Pick<SwiftLiteral, "hashes" | "multilineIndent">,
): string {
  if (args.length !== interpolations.length)
    throw new Error("Interpolation arity mismatch");
  let offset = 0;
  let result = "";
  for (const [index, interpolation] of interpolations.entries()) {
    const start = value.indexOf(interpolation, offset);
    if (start < 0) throw new Error("Interpolation not found");
    result +=
      value.slice(offset, start).replaceAll("%", "%%") + args[index].specifier;
    offset = start + interpolation.length;
  }
  result += interpolations.length
    ? value.slice(offset).replaceAll("%", "%%")
    : value.slice(offset);
  if (literal?.multilineIndent !== undefined) {
    result = result.replace(/^\r?\n/, "").replace(/\r?\n[^\S\r\n]*$/, "");
    const indent = literal.multilineIndent;
    result = result
      .split("\n")
      .map((line) =>
        line.startsWith(indent) ? line.slice(indent.length) : line,
      )
      .join("\n");
  }
  const prefix = `\\${literal?.hashes ?? ""}`;
  let decoded = "";
  for (let i = 0; i < result.length; ) {
    if (!result.startsWith(prefix, i)) {
      decoded += result[i++];
      continue;
    }
    const escapedText = result.slice(i + prefix.length);
    const unicode = escapedText.match(/^u\{([\da-fA-F]+)\}/);
    const continuation = escapedText.match(/^\r?\n[\t ]*/);
    if (continuation) {
      i += prefix.length + continuation[0].length;
    } else if (unicode) {
      decoded += String.fromCodePoint(Number.parseInt(unicode[1], 16));
      i += prefix.length + unicode[0].length;
    } else {
      const escapes: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        "0": "\0",
        '"': '"',
        "\\": "\\",
        "'": "'",
      };
      if (!(escapedText[0] in escapes))
        throw new Error("Unsupported Swift escape");
      decoded += escapes[escapedText[0]];
      i += prefix.length + 1;
    }
  }
  return decoded;
}

const categoryValues = new Set([
  "餐飲",
  "交通",
  "住宿",
  "門票",
  "購物",
  "其他",
]);
/** A Chinese wire exclusion needs a known data context, not merely Chinese text. */
export function isChineseWireLiteral(
  literal: SwiftLiteral,
  sources: Sources,
): boolean {
  if (!containsHan(literal.value)) return true;
  const line = sources[literal.path]?.split("\n")[literal.line - 1] ?? "";
  if (!categoryValues.has(literal.value)) return false;
  if (literal.path === "apps/ios/Sources/OtterKit/ExpenseCategory.swift")
    return /case \w+ =/.test(line);
  const locations: Record<string, RegExp> = {
    "apps/ios/Otter/Views/ExpenseEditorState.swift": /var category =|\["餐飲"/,
    "apps/ios/Otter/Views/ExpenseEditorView.swift": /\["餐飲"/,
    "apps/ios/Sources/OtterKit/BackupPreview.swift": /\["", "餐飲"|\["餐飲"/,
    "apps/ios/Sources/OtterKit/ExpenseQuery.swift": /category \?\?/,
    "apps/ios/Sources/OtterKit/Finance.swift": /category \?\?/,
    "apps/ios/Sources/OtterKit/CSV.swift": /expense.category \?\?/,
  };
  return locations[literal.path]?.test(line) ?? false;
}
