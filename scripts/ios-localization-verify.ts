import {
  catalogStrings,
  formatSlots,
  record,
  unitValue,
  verifyCatalogEntry,
} from "./ios-localization-catalog.js";
import {
  anchorIdentity,
  type CurrentAudit,
  currentFormat,
  inventorySources,
  type SourceAnchor,
  scanBoundaries,
} from "./ios-localization-current.js";
import {
  containsHan,
  isChineseWireLiteral,
} from "./ios-localization-source.js";
import type {
  Catalogs,
  Manifest,
  Report,
  Sources,
} from "./ios-localization-types.js";

function evidence(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        record(v) && typeof v.path === "string" && typeof v.source === "string",
    )
  );
}
export function isCurrentAudit(value: unknown): value is CurrentAudit {
  return (
    record(value) &&
    value.version === 1 &&
    Array.isArray(value.anchors) &&
    value.anchors.every(
      (a) =>
        record(a) &&
        typeof a.path === "string" &&
        Number.isInteger(a.line) &&
        typeof a.literal === "string" &&
        typeof a.context === "string" &&
        typeof a.reason === "string" &&
        [
          "lookup",
          "alias-default",
          "bounded",
          "wire",
          "userdata",
          "structure",
          "constant",
        ].includes(String(a.kind)) &&
        (a.catalogKey === undefined || typeof a.catalogKey === "string") &&
        (a.arguments === undefined ||
          (Array.isArray(a.arguments) &&
            a.arguments.every(
              (x) =>
                record(x) &&
                typeof x.name === "string" &&
                typeof x.expression === "string" &&
                ["String", "Int", "Int32", "Int64", "Double"].includes(
                  String(x.type),
                ) &&
                ["%@", "%lld", "%d", "%lf"].includes(String(x.specifier)),
            ))) &&
        (a.evidence === undefined || evidence(a.evidence)),
    ) &&
    evidence(value.declarations) &&
    Array.isArray(value.boundaries) &&
    value.boundaries.every(
      (b) =>
        record(b) &&
        typeof b.path === "string" &&
        Number.isInteger(b.line) &&
        typeof b.source === "string" &&
        typeof b.reason === "string" &&
        [
          "localized",
          "userdata",
          "external",
          "formatted",
          "category",
          "bounded",
        ].includes(String(b.disposition)) &&
        (b.mappingKeys === undefined ||
          (Array.isArray(b.mappingKeys) &&
            b.mappingKeys.every((k) => typeof k === "string"))) &&
        (b.evidence === undefined || evidence(b.evidence)),
    )
  );
}
const specifiers = {
  String: "%@",
  Int: "%lld",
  Int64: "%lld",
  Int32: "%d",
  Double: "%lf",
};
const boundaryID = (b: { path: string; source: string }) =>
  JSON.stringify([b.path, b.source]);
export function verifyCurrentSources(
  manifest: Manifest,
  sources: Sources,
  catalog: unknown,
  catalogs: Catalogs,
): Report {
  const report: Report = { errors: [], pending: [], counts: {} };
  const error = (s: string) => report.errors.push(s);
  const audit = manifest.currentSource;
  const strings = catalogStrings(catalog);
  if (!audit || !isCurrentAudit(audit) || !strings) {
    error("Invalid current source audit or String Catalog");
    return report;
  }
  if (
    !record(catalog) ||
    catalog.sourceLanguage !== "zh-Hant" ||
    catalog.version !== "1.0"
  )
    error("Invalid String Catalog metadata");
  if (
    JSON.stringify(Object.entries(manifest.resourceLocaleIDs ?? {}).sort()) !==
    JSON.stringify(
      manifest.locales
        .map((locale) => [locale, locale === "zh-TW" ? "zh-Hant" : locale])
        .sort(),
    )
  )
    error("Web/Apple resource locale mapping differs");
  const activeMappings = manifest.messages
    .filter((m) => m.migration.status !== "retired")
    .map((m) => [m.id, m.migration.catalogKey])
    .sort();
  if (
    JSON.stringify(Object.entries(manifest.idToKey ?? {}).sort()) !==
    JSON.stringify(activeMappings)
  )
    error("Explicit idToKey mapping differs from active message contracts");
  const inventory = inventorySources(sources);
  const actual = new Map<string, typeof inventory>();
  for (const item of inventory) {
    const id = anchorIdentity(item.anchor);
    actual.set(id, [...(actual.get(id) ?? []), item]);
  }
  const reviewed = new Map<string, SourceAnchor[]>();
  const contracts = new Map<
    string,
    { args: NonNullable<SourceAnchor["arguments"]>; plural: string[] }
  >();
  const sourceKeys = new Set<string>();
  let bypasses = 0;
  for (const a of audit.anchors) {
    const id = anchorIdentity(a);
    reviewed.set(id, [...(reviewed.get(id) ?? []), a]);
    const item = actual.get(id)?.shift();
    if (!item) {
      error(
        `${a.path}:${a.line}: missing/changed reviewed source ${JSON.stringify(a.literal)}`,
      );
      continue;
    }
    const location = `${a.path}:${item.literal.line}`;
    if (!a.reason.trim()) error(`${location}: source review reason required`);
    for (const e of a.evidence ?? [])
      if (!sources[e.path]?.includes(e.source))
        error(`${location}: producer evidence changed: ${e.path} ${e.source}`);
    if (["lookup", "alias-default", "bounded"].includes(a.kind)) {
      if (!a.catalogKey || !strings[a.catalogKey]) {
        error(
          `${location}: missing required catalogKey ${a.catalogKey ?? a.literal}`,
        );
        continue;
      }
      sourceKeys.add(a.catalogKey);
      try {
        const compiled = currentFormat(a, item.literal);
        if (a.kind !== "alias-default" && compiled !== a.catalogKey)
          error(
            `${location}: compiled source key ${compiled} != ${a.catalogKey}`,
          );
        if (a.kind === "alias-default") {
          const context = item.anchor.context;
          if (
            !context.includes("defaultValue:") ||
            !context.includes(`"${a.catalogKey}"`)
          )
            error(`${location}: alias default lacks its StaticString key`);
        }
      } catch {
        error(`${location}: source interpolation arity/expression differs`);
      }
      for (const [index, arg] of (a.arguments ?? []).entries()) {
        if (
          arg.expression !== item.literal.interpolations[index] ||
          arg.specifier !== specifiers[arg.type]
        )
          error(`${location}: typed interpolation contract differs`);
        if (
          /NativeDisplayFormatting\.|\.formatted\(|\.joined\(/.test(
            arg.expression,
          ) &&
          arg.type !== "String"
        )
          error(`${location}: formatted interpolation must be String/%@`);
      }
      // A catalog row does not prove a String producer performs a lookup.
      if (
        a.kind === "lookup" &&
        !a.context.includes("NativeLocalization.string") &&
        (/\b(?:message|reason|issue)\s*=|errorDescription: String|message: .*\?\?/.test(
          a.context,
        ) ||
          /Text\(\s*verbatim:\s*<literal>/.test(a.context))
      ) {
        bypasses++;
        error(
          `${location}: unmigrated owned String producer for ${a.catalogKey}`,
        );
      }
    } else if (a.kind === "wire" && containsHan(a.literal)) {
      const categorySelector =
        a.path.endsWith("/ExpenseCategory.swift") &&
        ["餐飲", "交通", "住宿", "門票", "購物", "其他"].includes(a.literal) &&
        a.context.startsWith("case ");
      const csvFallback =
        a.path.endsWith("/CSV.swift") &&
        a.literal === "未知" &&
        /names\[/.test(a.context);
      if (
        !isChineseWireLiteral(item.literal, sources) &&
        !categorySelector &&
        !csvFallback
      )
        error(`${location}: Chinese wire exclusion lacks a known data context`);
    } else if (
      containsHan(a.literal) &&
      a.kind !== "wire" &&
      a.kind !== "structure" &&
      !["正體中文", "日本語"].includes(a.literal)
    ) {
      // Neutral compositions may contain fullwidth punctuation, never owned words.
      let owned = a.literal;
      for (const interpolation of item.literal.interpolations)
        owned = owned.replace(interpolation, "");
      if (containsHan(owned))
        error(`${location}: owned Chinese cannot be excluded as ${a.kind}`);
    }
  }
  let newLiterals = 0;
  for (const items of actual.values())
    for (const { anchor: a, literal: l } of items) {
      newLiterals++;
      error(
        `${a.path}:${l.line}: unclassified new source literal ${JSON.stringify(a.literal)}`,
      );
    }
  const boundaries = scanBoundaries(sources);
  const actualBoundaries = new Set(boundaries.map(boundaryID));
  const reviewedBoundaries = new Set(audit.boundaries.map(boundaryID));
  for (const b of boundaries)
    if (!reviewedBoundaries.has(boundaryID(b)))
      error(`${b.path}:${b.line}: unreviewed dynamic boundary ${b.source}`);
  for (const b of audit.boundaries) {
    if (!actualBoundaries.has(boundaryID(b)))
      error(`${b.path}:${b.line}: dynamic boundary changed ${b.source}`);
    if (!b.reason.trim())
      error(`${b.path}:${b.line}: dynamic boundary reason required`);
    if (
      /LocalizedStringKey\((?!["\s])/.test(b.source) &&
      !b.mappingKeys?.length &&
      b.disposition !== "localized"
    )
      error(
        `${b.path}:${b.line}: unbounded dynamic lookup requires mappingKeys`,
      );
    for (const key of b.mappingKeys ?? [])
      if (!strings[key])
        error(`${b.path}:${b.line}: missing dynamic mapping key ${key}`);
    for (const e of b.evidence ?? [])
      if (!sources[e.path]?.includes(e.source))
        error(`${b.path}:${b.line}: dynamic producer evidence changed`);
  }
  for (const e of audit.declarations)
    if (!sources[e.path]?.includes(e.source))
      error(`${e.path}: typed producer declaration changed: ${e.source}`);
  const ids = new Set<string>();
  let verified = 0;
  let retired = 0;
  for (const m of manifest.messages) {
    if (ids.has(m.id)) error(`${m.id}: duplicate stable ID`);
    ids.add(m.id);
    const migration = m.migration;
    if (migration.status === "retired") {
      retired++;
      if (
        !migration.note.trim() ||
        migration.catalogKey ||
        migration.currentSources?.length
      )
        error(`${m.id}: invalid retirement record`);
      for (const id of migration.replacedBy ?? [])
        if (!manifest.messages.some((row) => row.id === id))
          error(`${m.id}: unknown replacement ${id}`);
      continue;
    }
    if (
      migration.status !== "verified" &&
      migration.status !== "existingCatalog"
    )
      report.pending.push(`${m.id}: native lookup/migration pending`);
    if (m.format.state === "needsExtraction")
      report.pending.push(`${m.id}: owned wrapper extraction pending`);
    if (m.translation.status === "needsNativeTranslation")
      report.pending.push(`${m.id}: native translation review pending`);
    const key = migration.catalogKey;
    if (!key || !strings[key]) {
      error(`${m.id}: missing required catalogKey ${key ?? m.format.swiftKey}`);
      continue;
    }
    if (!migration.currentSources?.length)
      error(`${m.id}: no current source anchors`);
    for (const id of migration.currentSources ?? []) {
      const anchors = reviewed.get(id);
      if (!anchors?.some((a) => a.catalogKey === key))
        error(`${m.id}: current source anchor does not prove lookup ${key}`);
    }
    const args = m.format.arguments;
    const prior = contracts.get(key);
    if (
      prior &&
      JSON.stringify(prior.args.map((a) => [a.type, a.specifier])) !==
        JSON.stringify(args.map((a) => [a.type, a.specifier]))
    )
      error(`${m.id}: incompatible shared key argument types`);
    contracts.set(key, { args, plural: m.format.pluralParameters });
    for (const a of audit.anchors.filter(
      (a) =>
        a.catalogKey === key &&
        (a.kind === "alias-default" || a.literal !== key),
    )) {
      if (
        JSON.stringify((a.arguments ?? []).map((x) => x.specifier)) !==
        JSON.stringify(args.map((x) => x.specifier))
      )
        error(`${a.path}:${a.line}/${m.id}: source/catalog typeMismatch`);
    }
    if (m.translation.status === "web") {
      const t = m.translation;
      const parameters =
        manifest.webFunctions.find((f) => f.key === t.key)?.parameters ?? {};
      for (const locale of manifest.locales) {
        const original = catalogs[locale]?.[t.key];
        let expected: unknown = original;
        if (typeof original === "function") {
          const tokens = Object.fromEntries(
            Object.keys(parameters).map((name) => [
              name,
              `OTTER_ARG_${name}_END`,
            ]),
          );
          expected = original(tokens);
          if (typeof expected === "string") {
            let formatted = expected;
            for (const [name, token] of Object.entries(tokens)) {
              const index = args.findIndex(
                (a) => a.name === t.parameterMap[name],
              );
              if (index < 0) {
                error(`${m.id}: unknown Web parameter ${name}`);
                continue;
              }
              formatted = formatted.replaceAll(
                token,
                `%${index + 1}$${args[index].specifier.slice(1)}`,
              );
            }
            expected = formatted;
          }
        }
        const entry = strings[key];
        const value =
          record(entry) && record(entry.localizations)
            ? unitValue(
                entry.localizations[locale === "zh-TW" ? "zh-Hant" : locale],
              )
            : undefined;
        if (value !== expected)
          error(`${m.id}/${locale}: catalog differs from actual Web value`);
      }
    }
    verified++;
  }
  for (const [key, entry] of Object.entries(strings)) {
    const contract = contracts.get(key);
    // Unused authored resources are still checked; infer only their physical key signature.
    const args =
      contract?.args ??
      formatSlots(key).map((slot, i) => ({
        name: `arg${i}`,
        expression: "",
        type:
          slot.type === "@"
            ? ("String" as const)
            : slot.type === "d"
              ? ("Int32" as const)
              : ("Int" as const),
        specifier:
          slot.type === "@"
            ? ("%@" as const)
            : slot.type === "d"
              ? ("%d" as const)
              : ("%lld" as const),
      }));
    report.errors.push(
      ...verifyCatalogEntry(
        key,
        entry,
        manifest.locales,
        args,
        contract?.plural ?? [],
      ),
    );
  }
  report.counts = {
    localeValues: Object.keys(strings).length * manifest.locales.length,
    mappedWebFunctionRows: manifest.messages.filter((m) => {
      const t = m.translation;
      return (
        t.status === "web" && manifest.webFunctions.some((f) => f.key === t.key)
      );
    }).length,
    mappedPluralWebFunctionRows: manifest.messages.filter((m) => {
      const t = m.translation;
      return (
        t.status === "web" &&
        manifest.webFunctions.some(
          (f) => f.key === t.key && f.pluralParameters.length,
        )
      );
    }).length,
    sourceFiles: Object.keys(sources).length,
    literals: inventory.length,
    reviewedLiterals: audit.anchors.length,
    messages: manifest.messages.length,
    verifiedMessages: verified,
    retiredMessages: retired,
    catalogKeys: Object.keys(strings).length,
    sourceCatalogKeys: sourceKeys.size,
    missing: report.errors.filter((e) =>
      /missing required|missing catalog/.test(e),
    ).length,
    typeMismatch: report.errors.filter((e) =>
      /typeMismatch|typed interpolation/.test(e),
    ).length,
    dynamicSites: boundaries.length,
    unmigrated: bypasses,
    newSourceLiterals: newLiterals,
    webFunctions: manifest.webFunctions.length,
    pluralWebFunctions: manifest.webFunctions.filter(
      (f) => f.pluralParameters.length,
    ).length,
    mappedWeb: manifest.messages.filter((m) => m.translation.status === "web")
      .length,
    nativePluralKeys: manifest.messages.filter(
      (m) =>
        m.migration.status !== "retired" && m.format.pluralParameters.length,
    ).length,
    compiledPluralKeys: new Set(
      manifest.messages
        .filter(
          (m) =>
            m.migration.status !== "retired" &&
            m.format.pluralParameters.length,
        )
        .map((m) => m.migration.catalogKey),
    ).size,
    pending: report.pending.length,
    errors: report.errors.length,
  };
  return report;
}
