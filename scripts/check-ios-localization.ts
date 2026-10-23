// Explicit audit: npx tsx scripts/check-ios-localization.ts [--audit-only]
// This file validates authored localization contracts. It does not generate resources.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { languageOptions } from "../apps/web/src/client/i18n/locales.js";
import { translations } from "../apps/web/src/client/i18n/messages.js";
import {
  isCurrentAudit,
  verifyCurrentSources,
} from "./ios-localization-verify.js";

export const supportedLocales = languageOptions.map(({ locale }) => locale);
export const swiftRoots = ["apps/ios/Otter", "apps/ios/Sources/OtterKit"];
export const manifestPath = "apps/ios/Localization/native-messages.json";
export type {
  Argument,
  Catalogs,
  DynamicSite,
  Exclusion,
  Manifest,
  NativeMessage,
  Occurrence,
  Report,
  Sources,
  SwiftLiteral,
  WebContract,
} from "./ios-localization-types.js";

import type {
  Catalogs,
  Manifest,
  NativeMessage,
  Occurrence,
  Report,
  Sources,
  SwiftLiteral,
  WebContract,
} from "./ios-localization-types.js";

export {
  containsHan,
  isChineseWireLiteral,
  scanSwift,
  swiftFormat,
} from "./ios-localization-source.js";

import {
  containsHan,
  isChineseWireLiteral,
  scanSwift,
  swiftFormat,
} from "./ios-localization-source.js";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}
function oneOf(value: unknown, options: string[]): boolean {
  return typeof value === "string" && options.includes(value);
}
function occurrence(value: unknown): value is Occurrence {
  return (
    record(value) &&
    typeof value.path === "string" &&
    Number.isInteger(value.line) &&
    Number(value.line) > 0 &&
    Number.isInteger(value.ordinal) &&
    Number(value.ordinal) >= 0 &&
    (value.role === undefined || value.role === "presentation-anchor") &&
    (value.usage === undefined ||
      oneOf(value.usage, [
        "ui-static",
        "ui-template",
        "dynamic-owned",
        "error",
        "print",
        "permission",
      ]))
  );
}
function occurrences(value: unknown): value is Occurrence[] {
  return Array.isArray(value) && value.length > 0 && value.every(occurrence);
}
function stringMap(value: unknown): value is Record<string, string> {
  return (
    record(value) && Object.values(value).every((v) => typeof v === "string")
  );
}
function webContract(value: unknown): value is WebContract {
  return (
    record(value) &&
    typeof value.key === "string" &&
    record(value.parameters) &&
    Object.values(value.parameters).every(
      (v) => v === "string" || v === "number",
    ) &&
    strings(value.pluralParameters) &&
    (value.pluralFormsByLocale === undefined ||
      (record(value.pluralFormsByLocale) &&
        Object.values(value.pluralFormsByLocale).every(
          (forms) =>
            Array.isArray(forms) &&
            forms.every(
              (form) =>
                record(form) &&
                typeof form.parameter === "string" &&
                stringMap(form.forms),
            ),
        )))
  );
}
function message(value: unknown): value is NativeMessage {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    typeof value.sourceChinese !== "string" ||
    !occurrences(value.occurrences)
  )
    return false;
  if (
    !oneOf(value.classification, [
      "ui-static",
      "ui-template",
      "dynamic-owned",
      "error",
      "print",
      "permission",
    ])
  )
    return false;
  const f = value.format;
  if (
    !record(f) ||
    !oneOf(f.state, ["specified", "needsExtraction"]) ||
    typeof f.swiftKey !== "string" ||
    !strings(f.pluralParameters) ||
    !Array.isArray(f.arguments)
  )
    return false;
  if (
    !f.arguments.every(
      (a) =>
        record(a) &&
        typeof a.name === "string" &&
        typeof a.expression === "string" &&
        oneOf(a.type, ["String", "Int", "Int32", "Int64", "Double"]) &&
        oneOf(a.specifier, ["%@", "%lld", "%d", "%lf"]),
    )
  )
    return false;
  const t = value.translation;
  if (!record(t)) return false;
  if (
    t.status !== "needsNativeTranslation" &&
    t.status !== "native" &&
    !(
      t.status === "web" &&
      typeof t.key === "string" &&
      oneOf(t.match, ["exact", "semantic"]) &&
      typeof t.rationale === "string" &&
      stringMap(t.parameterMap) &&
      Array.isArray(t.sharedValues) &&
      t.sharedValues.every(strings)
    )
  )
    return false;
  return (
    record(value.migration) &&
    oneOf(value.migration.status, [
      "pending",
      "existingCatalog",
      "verified",
      "retired",
    ]) &&
    typeof value.migration.note === "string" &&
    (value.migration.catalogKey === undefined ||
      typeof value.migration.catalogKey === "string") &&
    (value.migration.currentSources === undefined ||
      strings(value.migration.currentSources)) &&
    (value.migration.replacedBy === undefined ||
      strings(value.migration.replacedBy))
  );
}
export function isManifest(value: unknown): value is Manifest {
  return (
    record(value) &&
    value.schemaVersion === 1 &&
    (value.currentSource === undefined ||
      isCurrentAudit(value.currentSource)) &&
    (value.resourceLocaleIDs === undefined ||
      stringMap(value.resourceLocaleIDs)) &&
    (value.idToKey === undefined || stringMap(value.idToKey)) &&
    strings(value.locales) &&
    Array.isArray(value.webFunctions) &&
    value.webFunctions.every(webContract) &&
    Array.isArray(value.messages) &&
    value.messages.every(message) &&
    Array.isArray(value.exclusions) &&
    value.exclusions.every(
      (e) =>
        record(e) &&
        oneOf(e.classification, ["wire", "userdata", "constant"]) &&
        typeof e.reason === "string" &&
        typeof e.value === "string" &&
        occurrences(e.occurrences) &&
        (e.presentationKey === undefined ||
          typeof e.presentationKey === "string"),
    ) &&
    Array.isArray(value.dynamicSites) &&
    value.dynamicSites.every(
      (s) =>
        record(s) &&
        typeof s.path === "string" &&
        Number.isInteger(s.line) &&
        typeof s.source === "string" &&
        oneOf(s.disposition, [
          "owned",
          "userdata",
          "external",
          "formatted",
          "category",
          "localized",
        ]) &&
        typeof s.migration === "string",
    )
  );
}

export { inspectFormatter, resolveWebMessage } from "./ios-localization-web.js";

import {
  decodeScriptEscapes,
  inspectFormatter,
} from "./ios-localization-web.js";

const sorted = (values: string[]) => [...values].sort().join("\0");
const identity = (site: Occurrence) =>
  `${site.path}:${site.line}:${site.ordinal}`;
const specifiers = {
  String: "%@",
  Int: "%lld",
  Int64: "%lld",
  Int32: "%d",
  Double: "%lf",
};
const counts = [
  0, 1, 2, 3, 4, 5, 6, 9, 11, 12, 21, 22, 100, 101, 1000, 1000000, 0.1, 1.4,
  1.5, 2.5,
];

export function validateManifest(
  input: unknown,
  catalogs: Catalogs,
  sources: Sources,
  nativeCatalog?: unknown,
): Report {
  const report: Report = { errors: [], pending: [], counts: {} };
  const error = (text: string) => report.errors.push(text);
  if (!isManifest(input)) {
    error("Invalid manifest structure");
    return report;
  }
  const manifest = input;
  if (sorted(manifest.locales) !== sorted(supportedLocales))
    error("Expected the 18 supported locale IDs, without duplicates");
  if (sorted(Object.keys(catalogs)) !== sorted(supportedLocales))
    error("Web catalog locale IDs differ");
  const sourceCatalog = catalogs["zh-TW"] ?? {};
  const functions = Object.keys(sourceCatalog).filter(
    (key) => typeof sourceCatalog[key] === "function",
  );
  if (sorted(manifest.webFunctions.map((c) => c.key)) !== sorted(functions))
    error("Web function contracts are incomplete or duplicated");
  const contracts = new Map(manifest.webFunctions.map((c) => [c.key, c]));
  for (const contract of manifest.webFunctions) {
    const unionPlural = new Set<string>();
    for (const locale of supportedLocales) {
      const value = catalogs[locale]?.[contract.key];
      if (typeof value !== "function") {
        error(
          `${locale}.${contract.key}: expected a formatter, not a flattened fallback`,
        );
        continue;
      }
      const shape = inspectFormatter(value);
      if (sorted(shape.parameters) !== sorted(Object.keys(contract.parameters)))
        error(`${locale}.${contract.key}: parameter shape differs`);
      for (const p of shape.pluralParameters) unionPlural.add(p);
      if (contract.pluralParameters.length) {
        const expected = contract.pluralFormsByLocale?.[locale];
        if (
          !expected ||
          JSON.stringify(expected) !== JSON.stringify(shape.pluralForms)
        )
          error(
            `${locale}.${contract.key}: CLDR plural forms differ from the authored contract`,
          );
      }
      for (const plural of shape.pluralForms) {
        if (contract.parameters[plural.parameter] !== "number")
          error(`${locale}.${contract.key}: plural argument must be numeric`);
        if (!plural.forms.other)
          error(`${locale}.${contract.key}: missing CLDR other form`);
        // pluralForm deliberately uses other for categories without a distinct form.
        // Preserve that branch structure, including distinct Polish few/many forms.
      }
      // Exercise each numeric input independently. This includes all supported CLDR categories.
      for (const numeric of [
        undefined,
        ...Object.keys(contract.parameters).filter(
          (p) => contract.parameters[p] === "number",
        ),
      ]) {
        for (const count of numeric ? counts : [2]) {
          const values = Object.fromEntries(
            Object.entries(contract.parameters).map(([name, type]) => [
              name,
              type === "number"
                ? name === numeric
                  ? count
                  : 2
                : `ARG_${name}_END`,
            ]),
          );
          try {
            const output: unknown = value(values);
            if (
              typeof output !== "string" ||
              !output.trim() ||
              /undefined|NaN|\{\w+\}/.test(output)
            )
              error(`${locale}.${contract.key}: invalid formatter output`);
            else
              for (const parameter of Object.values(values))
                if (!output.includes(String(parameter)))
                  error(
                    `${locale}.${contract.key}: formatter lost an argument`,
                  );
          } catch {
            error(`${locale}.${contract.key}: formatter threw`);
          }
        }
      }
    }
    if (sorted([...unionPlural]) !== sorted(contract.pluralParameters))
      error(`${contract.key}: plural contract differs from Web functions`);
  }
  // Equal individual terms can be correct. A copied locale catalog cannot be correct.
  for (const locale of supportedLocales) {
    if (locale === "zh-TW") continue;
    for (const base of supportedLocales) {
      if (base === locale) continue;
      const keys = Object.keys(sourceCatalog).filter(
        (key) => typeof sourceCatalog[key] === "string",
      );
      if (
        keys.length &&
        keys.every((key) => catalogs[locale]?.[key] === catalogs[base]?.[key])
      )
        error(`${locale}: duplicated ${base} locale fallback`);
    }
  }
  if (manifest.currentSource) {
    const current = verifyCurrentSources(
      manifest,
      sources,
      nativeCatalog,
      catalogs,
    );
    current.errors.unshift(...report.errors);
    current.counts.errors = current.errors.length;
    return current;
  }
  const literals = Object.entries(sources).flatMap(([path, text]) =>
    scanSwift(text, path),
  );
  const actual = new Map(
    literals.map((literal) => [identity(literal), literal]),
  );
  const covered = new Set<string>();
  const ids = new Set<string>();
  function cover(site: Occurrence, value: string): SwiftLiteral | undefined {
    const key = identity(site);
    const literal = actual.get(key);
    if (!literal || literal.value !== value)
      error(`${key}: source literal differs (code-point exact comparison)`);
    if (covered.has(key)) error(`${key}: occurrence classified twice`);
    covered.add(key);
    return literal;
  }
  let mapped = 0;
  let native = 0;
  let existing = 0;
  for (const m of manifest.messages) {
    if (
      !/^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$/.test(m.id) ||
      ids.has(m.id)
    )
      error(`${m.id}: invalid or duplicate stable semantic ID`);
    ids.add(m.id);
    if (!m.sourceChinese.trim()) error(`${m.id}: empty source`);
    if (!m.migration.note.trim()) error(`${m.id}: migration note required`);
    const names = m.format.arguments.map((a) => a.name);
    if (new Set(names).size !== names.length)
      error(`${m.id}: duplicate argument names`);
    for (const a of m.format.arguments)
      if (specifiers[a.type] !== a.specifier)
        error(`${m.id}: Swift parameter specifier differs from type`);
    for (const p of m.format.pluralParameters)
      if (!m.format.arguments.some((a) => a.name === p && a.type !== "String"))
        error(`${m.id}: invalid plural argument`);
    for (const site of m.occurrences) {
      const literal =
        site.role === "presentation-anchor"
          ? actual.get(identity(site))
          : cover(site, m.sourceChinese);
      if (
        site.role === "presentation-anchor" &&
        (!literal ||
          literal.value !== m.sourceChinese ||
          !isChineseWireLiteral(literal, sources))
      )
        error(`${m.id}: invalid presentation-only wire anchor`);
      if (!literal || m.format.state === "needsExtraction") continue;
      if (
        literal.interpolations.length !== m.format.arguments.length ||
        literal.interpolations.some(
          (s, i) => s !== m.format.arguments[i]?.expression,
        )
      )
        error(`${m.id}: Swift interpolation expressions differ`);
      else if (
        swiftFormat(
          literal.value,
          literal.interpolations,
          m.format.arguments,
        ) !== m.format.swiftKey
      )
        error(`${m.id}: compiled Swift format key differs`);
      if (
        site.role !== "presentation-anchor" &&
        isChineseWireLiteral(literal, sources) &&
        containsHan(literal.value)
      )
        error(`${m.id}: persisted category raw value must not be localized`);
    }
    if (m.format.state === "needsExtraction")
      report.pending.push(
        `${m.id}: extract visible text from HTML/wire wrapper before localization`,
      );
    if (m.translation.status !== "web") {
      native++;
      report.pending.push(`${m.id}: needs 18 native translations`);
    } else {
      mapped++;
      const t = m.translation;
      const original = sourceCatalog[t.key];
      const contract = contracts.get(t.key);
      if (typeof original !== "string" && typeof original !== "function") {
        error(`${m.id}: unknown Web key ${t.key}`);
        continue;
      }
      if (!t.rationale.trim())
        error(`${m.id}: context review rationale required`);
      const webParams = contract ? Object.keys(contract.parameters) : [];
      if (
        sorted(Object.keys(t.parameterMap)) !== sorted(webParams) ||
        sorted(Object.values(t.parameterMap)) !== sorted(names)
      )
        error(`${m.id}: Web/Swift parameter map differs`);
      for (const [web, name] of Object.entries(t.parameterMap)) {
        const arg = m.format.arguments.find((a) => a.name === name);
        if (
          (contract?.parameters[web] === "number") !==
          (arg?.type !== "String")
        )
          error(`${m.id}: Web/Swift parameter types differ`);
      }
      if (
        contract &&
        sorted(contract.pluralParameters.map((p) => t.parameterMap[p])) !==
          sorted(m.format.pluralParameters)
      )
        error(`${m.id}: preserve Web plural parameters`);
      if (t.match === "exact") {
        let expected = m.sourceChinese;
        for (const arg of m.format.arguments)
          expected = expected.replace(
            arg.expression,
            `{${Object.keys(t.parameterMap).find((p) => t.parameterMap[p] === arg.name)}}`,
          );
        // Template text comes from syntax, not from one empty formatter call.
        if (
          typeof original === "string"
            ? original !== expected
            : !inspectFormatter(original).parameters.length ||
              !decodeScriptEscapes(original.toString()).includes(expected)
        )
          error(`${m.id}: exact Web source differs`);
      }
      const shared = new Map<string, string[]>();
      for (const locale of supportedLocales) {
        const value = catalogs[locale]?.[t.key];
        if (typeof value !== typeof original)
          error(`${m.id}/${locale}: Web value shape differs`);
        if (typeof value === "string") {
          if (!value.trim() || /\{\w+\}/.test(value))
            error(`${m.id}/${locale}: empty or flattened template`);
          const group = shared.get(value) ?? [];
          group.push(locale);
          shared.set(value, group);
        }
      }
      const groups = [...shared.values()]
        .filter((g) => g.length > 1)
        .map(sorted)
        .sort();
      if (sorted(groups) !== sorted(t.sharedValues.map(sorted)))
        error(
          `${m.id}: unreviewed duplicate locale values (shared terms need explicit groups)`,
        );
    }
    if (m.migration.status === "pending")
      report.pending.push(`${m.id}: native lookup/migration pending`);
    else existing++;
  }
  for (const e of manifest.exclusions) {
    if (!e.reason.trim()) error("Exclusion needs a reason");
    if (e.presentationKey && !ids.has(e.presentationKey))
      error(`Unknown category presentation key: ${e.presentationKey}`);
    for (const site of e.occurrences) {
      const literal = cover(site, e.value);
      if (
        literal &&
        e.classification === "wire" &&
        !isChineseWireLiteral(literal, sources)
      )
        error(`${identity(site)}: Chinese wire exclusion is not permitted`);
      if (
        literal &&
        e.classification !== "wire" &&
        containsHan(literal.value) &&
        !(
          literal.path === "apps/ios/Sources/OtterKit/AppPreferences.swift" &&
          ["正體中文", "日本語"].includes(literal.value)
        )
      )
        error(
          `${identity(site)}: owned Chinese copy cannot be excluded as a constant or user data`,
        );
    }
  }
  for (const literal of literals)
    if (!covered.has(identity(literal)))
      error(
        `${identity(literal)}: unclassified literal ${JSON.stringify(literal.value)}`,
      );
  for (const site of manifest.dynamicSites) {
    if (sources[site.path]?.split("\n")[site.line - 1]?.trim() !== site.source)
      error(`${site.path}:${site.line}: dynamic source differs`);
    if (!site.migration.trim())
      error(`${site.path}:${site.line}: dynamic migration rule required`);
    if (["owned", "category"].includes(site.disposition))
      report.pending.push(
        `${site.path}:${site.line}: dynamic ${site.disposition} migration pending`,
      );
  }
  report.counts = {
    sourceFiles: Object.keys(sources).length,
    literals: literals.length,
    chineseOccurrences: literals.filter((l) => containsHan(l.value)).length,
    messages: manifest.messages.length,
    mappedWeb: mapped,
    needsNativeTranslation: native,
    existingCatalog: existing,
    exclusions: manifest.exclusions.reduce(
      (sum, e) => sum + e.occurrences.length,
      0,
    ),
    dynamicSites: manifest.dynamicSites.length,
    webFunctions: manifest.webFunctions.length,
    pluralWebFunctions: manifest.webFunctions.filter(
      (c) => c.pluralParameters.length,
    ).length,
    pending: report.pending.length,
    templateKeys: manifest.messages.filter((m) => m.format.arguments.length)
      .length,
    nativePluralKeys: manifest.messages.filter(
      (m) => m.format.pluralParameters.length,
    ).length,
    extractionKeys: manifest.messages.filter(
      (m) => m.format.state === "needsExtraction",
    ).length,
    ...Object.fromEntries(
      [
        "ui-static",
        "ui-template",
        "dynamic-owned",
        "error",
        "print",
        "permission",
      ].map((kind) => [
        kind,
        manifest.messages.reduce(
          (count, m) =>
            count +
            m.occurrences.filter(
              (site) =>
                site.role !== "presentation-anchor" &&
                (site.usage ?? m.classification) === kind,
            ).length,
          0,
        ),
      ]),
    ),
  };
  return report;
}

export function loadSwiftSources(root: string): Sources {
  const result: Sources = {};
  function visit(path: string) {
    for (const entry of readdirSync(resolve(root, path), {
      withFileTypes: true,
    })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) visit(child);
      else if (entry.name.endsWith(".swift"))
        result[child] = readFileSync(resolve(root, child), "utf8");
    }
  }
  for (const path of swiftRoots) visit(path);
  return result;
}

export function checkRepository(root: string): Report {
  const manifest: unknown = JSON.parse(
    readFileSync(resolve(root, manifestPath), "utf8"),
  );
  const report = validateManifest(
    manifest,
    translations,
    loadSwiftSources(root),
    JSON.parse(
      readFileSync(
        resolve(root, "apps/ios/Otter/Resources/Localizable.xcstrings"),
        "utf8",
      ),
    ),
  );
  // Existing catalog coverage is independent of planned new keys.
  if (isManifest(manifest) && !manifest.currentSource) {
    const catalog: unknown = JSON.parse(
      readFileSync(
        resolve(root, "apps/ios/Otter/Resources/Localizable.xcstrings"),
        "utf8",
      ),
    );
    for (const m of manifest.messages.filter(
      (m) => m.migration.status === "existingCatalog",
    )) {
      if (!record(catalog) || !record(catalog.strings)) {
        report.errors.push("Invalid existing String Catalog");
        break;
      }
      const entry = catalog.strings[m.sourceChinese];
      for (const locale of supportedLocales) {
        const resourceID = locale === "zh-TW" ? "zh-Hant" : locale;
        const localizations =
          record(entry) && record(entry.localizations)
            ? entry.localizations
            : {};
        const unit = record(localizations[resourceID])
          ? localizations[resourceID].stringUnit
          : undefined;
        if (
          !record(unit) ||
          unit.state !== "translated" ||
          m.translation.status !== "web" ||
          unit.value !==
            translations[locale][
              m.translation.key as keyof typeof translations.en
            ]
        )
          report.errors.push(
            `${m.id}/${locale}: existing catalog differs from Web`,
          );
      }
    }
  }
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--audit-only"))
    throw new Error("Usage: check-ios-localization.ts [--audit-only]");
  const root = fileURLToPath(new URL("..", import.meta.url));
  const report = checkRepository(root);
  console.log(JSON.stringify(report.counts, null, 2));
  for (const issue of report.errors) console.error(`ERROR ${issue}`);
  if (!args.includes("--audit-only"))
    for (const issue of report.pending) console.error(`PENDING ${issue}`);
  process.exitCode =
    report.errors.length ||
    (!args.includes("--audit-only") && report.pending.length)
      ? 1
      : 0;
}
