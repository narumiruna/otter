import { scanSwift, swiftFormat } from "./ios-localization-source.js";
import type {
  Argument,
  Sources,
  SwiftLiteral,
} from "./ios-localization-types.js";

export interface SourceAnchor {
  path: string;
  line: number;
  literal: string;
  context: string;
  catalogKey?: string;
  arguments?: Argument[];
  kind:
    | "lookup"
    | "alias-default"
    | "bounded"
    | "wire"
    | "userdata"
    | "structure"
    | "constant";
  reason: string;
  evidence?: { path: string; source: string }[];
}
export interface CurrentAudit {
  version: 1;
  anchors: SourceAnchor[];
  boundaries: Boundary[];
  declarations: { path: string; source: string }[];
}
export interface Boundary {
  path: string;
  line: number;
  source: string;
  disposition:
    | "localized"
    | "userdata"
    | "external"
    | "formatted"
    | "category"
    | "bounded";
  reason: string;
  mappingKeys?: string[];
  evidence?: { path: string; source: string }[];
}
export function anchorIdentity(
  a: Pick<SourceAnchor, "path" | "literal" | "context">,
): string {
  return JSON.stringify([a.path, a.literal, a.context]);
}
export function sourceContext(text: string, literal: SwiftLiteral): string {
  const start = literal.start ?? 0;
  const end = literal.end ?? start;
  let from = text.lastIndexOf("\n", start) + 1;
  if (!text.slice(from, start).trim()) {
    for (let count = 0; count < 3 && from > 0; count++) {
      const previous = text.lastIndexOf("\n", from - 2) + 1;
      if (/[(:]\s*$/.test(text.slice(previous, from))) from = previous;
      else break;
    }
  }
  const nativeStart = text.lastIndexOf("NativeLocalization.string(", start);
  if (
    nativeStart >= 0 &&
    start - nativeStart < 400 &&
    /defaultValue:\s*$/.test(text.slice(nativeStart, start))
  ) {
    from = text.lastIndexOf("\n", nativeStart) + 1;
  }
  const to = text.indexOf("\n", end);
  return `${text.slice(from, start)}<literal>${text.slice(end, to < 0 ? text.length : to)}`
    .trim()
    .replace(/\s+/g, " ");
}
export function inventorySources(
  sources: Sources,
): { literal: SwiftLiteral; anchor: SourceAnchor }[] {
  return Object.entries(sources).flatMap(([path, text]) =>
    scanSwift(text, path).map((literal) => ({
      literal,
      anchor: {
        path,
        line: literal.line,
        literal: literal.value,
        context: sourceContext(text, literal),
        kind: "constant" as const,
        reason: "",
      },
    })),
  );
}
/** Record dynamic presentation and localization calls, including literal-free calls. */
export function scanBoundaries(
  sources: Sources,
): { path: string; line: number; source: string }[] {
  const result: { path: string; line: number; source: string }[] = [];
  for (const [path, text] of Object.entries(sources)) {
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      if (/^\s*(?:\/\/|\*)/.test(line)) continue;
      const calls = [
        ...line.matchAll(
          /\b(?:Text|NeutralText|LocalizedStringKey|NativeLocalization\.string|Picker|Label|Button|Section|navigationTitle|accessibilityLabel|accessibilityValue)\s*\(\s*([^\n]*)/g,
        ),
      ];
      if (
        calls.some((call) => {
          const argument = call[1].replace(/^verbatim:\s*/, "");
          return (
            argument.length > 0 &&
            !argument.startsWith('"') &&
            !argument.startsWith("action:")
          );
        })
      )
        result.push({ path, line: index + 1, source: line.trim() });
    }
  }
  return result;
}
export function currentFormat(
  anchor: SourceAnchor,
  literal: SwiftLiteral,
): string {
  return swiftFormat(
    literal.value,
    literal.interpolations,
    anchor.arguments ?? [],
    literal,
  );
}
