import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  interpolate,
  pluralForm,
} from "../apps/web/src/client/i18n/message-types.js";
import { translations } from "../apps/web/src/client/i18n/messages.js";
import {
  type Catalogs,
  checkRepository,
  containsHan,
  inspectFormatter,
  isChineseWireLiteral,
  isManifest,
  type Manifest,
  type NativeMessage,
  resolveWebMessage,
  type Sources,
  scanSwift,
  supportedLocales,
  swiftFormat,
  validateManifest,
} from "./check-ios-localization.js";
import { formatSlots, verifyCatalogEntry } from "./ios-localization-catalog.js";
import {
  anchorIdentity,
  inventorySources,
  scanBoundaries,
} from "./ios-localization-current.js";

const path = "apps/ios/Otter/Views/Example.swift";
function fixture() {
  const sources: Sources = { [path]: 'Text("取消")\n' };
  const catalogs: Catalogs = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      { cancel: locale === "zh-TW" ? "取消" : `${locale}: Cancel` },
    ]),
  );
  const message: NativeMessage = {
    id: "action.cancel",
    sourceChinese: "取消",
    classification: "ui-static",
    occurrences: [{ path, line: 1, ordinal: 0 }],
    format: {
      state: "specified",
      swiftKey: "取消",
      arguments: [],
      pluralParameters: [],
    },
    translation: {
      status: "web",
      key: "cancel",
      match: "exact",
      rationale: "Cancel the current action.",
      parameterMap: {},
      sharedValues: [],
    },
    migration: {
      status: "pending",
      note: "Replace the source label with a locale-aware lookup.",
    },
  };
  const manifest: Manifest = {
    schemaVersion: 1,
    locales: [...supportedLocales],
    webFunctions: [],
    messages: [message],
    exclusions: [],
    dynamicSites: [],
  };
  return { manifest, catalogs, sources, message };
}
const errors = (f: ReturnType<typeof fixture>) =>
  validateManifest(f.manifest, f.catalogs, f.sources).errors;

function templateFixture() {
  const f = fixture();
  const body = String.raw`第 \(row) 列：\(message)`;
  f.sources[path] = `Text("${body}")\n`;
  f.message.sourceChinese = body;
  f.message.format = {
    state: "specified",
    swiftKey: "第 %lld 列：%@",
    pluralParameters: [],
    arguments: [
      {
        name: "row",
        expression: String.raw`\(row)`,
        type: "Int",
        specifier: "%lld",
      },
      {
        name: "message",
        expression: String.raw`\(message)`,
        type: "String",
        specifier: "%@",
      },
    ],
  };
  f.message.translation = {
    status: "web",
    key: "row",
    match: "exact",
    rationale: "CSV row and error message.",
    parameterMap: { row: "row", message: "message" },
    sharedValues: [],
  };
  f.catalogs = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      {
        ...f.catalogs[locale],
        row:
          locale === "zh-TW"
            ? (values: Record<string, number | string>) =>
                interpolate("第 {row} 列：{message}", values)
            : (values: Record<string, number | string>) =>
                interpolate(`${locale}: {row}: {message}`, values),
      },
    ]),
  );
  f.manifest.webFunctions = [
    {
      key: "row",
      parameters: { row: "number", message: "string" },
      pluralParameters: [],
    },
  ];
  return f;
}

describe("source scanning", () => {
  test("scans three nested Swift interpolation levels without treating comments as strings", () => {
    const source = String.raw`// "忽略"
/* "忽略" /* "也忽略" */ */
Text("分帳：\(rows.map { "\($0.names.map { "\($0)" }.joined(separator: ", "))" }.joined(separator: "; "))")`;
    const found = scanSwift(source, path);
    const outer = found.find((literal) => literal.value.startsWith("分帳："));
    expect(outer?.line).toBe(3);
    expect(outer?.interpolations).toHaveLength(1);
    expect(outer?.interpolations[0]).toContain(
      String.raw`names.map { "\($0)" }`,
    );
    expect(found.map((literal) => literal.value)).toContain(String.raw`\($0)`);
    expect(found.some((literal) => literal.value.includes("忽略"))).toBe(false);
    expect(new Set(found.map((literal) => literal.ordinal)).size).toBe(
      found.length,
    );
  });

  test("handles multiline strings, raw strings, escaped quotes and comments", () => {
    const source =
      'let a = ##"中文\\##(value ?? "預設")"##\nlet b = """\n列印\n"""\nlet c = "quote: \\""';
    // Keep the escaped-quote fixture separate to avoid JavaScript escaping ambiguity.
    const raw = scanSwift(source.split("\nlet c")[0], path);
    expect(raw.find((l) => l.value.startsWith("中文"))?.interpolations).toEqual(
      [String.raw`\##(value ?? "預設")`],
    );
    expect(raw.some((l) => l.value === "\n列印\n")).toBe(true);
    expect(
      scanSwift(String.raw`let c = "quote: \" and \\"`, path)[0].value,
    ).toBe(String.raw`quote: \" and \\`);
  });

  test("detects Han outside the BMP and keeps punctuation code points distinct", () => {
    expect(containsHan("𠀀")).toBe(true);
    expect(containsHan("日本語")).toBe(true);
    expect(containsHan("、 · ⋯ …")).toBe(false);
    const f = fixture();
    f.sources[path] = 'Text("取消⋯")';
    f.message.sourceChinese = "取消…";
    expect(errors(f).some((e) => e.includes("code-point exact"))).toBe(true);
  });

  test("compiles typed format slots, literal percent signs and Swift escapes", () => {
    const f = templateFixture();
    expect(errors(f)).toEqual([]);
    expect(
      swiftFormat(
        String.raw`100%\n第 \(row) 列`,
        [String.raw`\(row)`],
        [f.message.format.arguments[0]],
      ),
    ).toBe("100%%\n第 %lld 列");
    expect(() => scanSwift('Text("未完成', path)).toThrow(
      "unterminated string",
    );
  });
});

describe("manifest contracts", () => {
  test("a valid audited mapping can still be incomplete", () => {
    const f = fixture();
    const report = validateManifest(f.manifest, f.catalogs, f.sources);
    expect(report.errors).toEqual([]);
    expect(report.pending).toContain(
      "action.cancel: native lookup/migration pending",
    );
    f.message.translation = { status: "needsNativeTranslation" };
    expect(
      validateManifest(f.manifest, f.catalogs, f.sources).pending,
    ).toContain("action.cancel: needs 18 native translations");
  });

  test("rejects malformed input, unsupported locales and duplicate stable IDs", () => {
    expect(isManifest({ messages: [] })).toBe(false);
    expect(validateManifest({}, {}, {}).errors).toEqual([
      "Invalid manifest structure",
    ]);
    const f = fixture();
    f.manifest.locales[0] = "zh-Hant";
    f.manifest.messages.push(structuredClone(f.message));
    expect(errors(f).join("\n")).toMatch(/18 supported locale IDs/);
    expect(errors(f).join("\n")).toMatch(/duplicate stable semantic ID/);
  });

  test("rejects missing, moved, changed and multiply classified source occurrences", () => {
    const f = fixture();
    f.sources[path] += 'Text("儲存")\n';
    expect(errors(f).join("\n")).toMatch(/unclassified literal/);
    f.message.occurrences[0].line = 2;
    expect(errors(f).join("\n")).toMatch(/source literal differs/);
    f.message.occurrences[0].line = 1;
    f.manifest.exclusions.push({
      classification: "constant",
      value: "取消",
      reason: "Incorrect exclusion",
      occurrences: f.message.occurrences,
    });
    expect(errors(f).join("\n")).toMatch(/classified twice/);
    expect(errors(f).join("\n")).toMatch(
      /owned Chinese copy cannot be excluded/,
    );
  });

  test("rejects wrong Web shapes, empty text, unreviewed equal values and locale fallbacks", () => {
    const f = fixture();
    f.catalogs.ja.cancel = "";
    f.catalogs.ko.cancel = () => "Cancel";
    f.catalogs.fr.cancel = f.catalogs.en.cancel;
    expect(errors(f).join("\n")).toMatch(/empty or flattened template/);
    expect(errors(f).join("\n")).toMatch(/Web value shape differs/);
    expect(errors(f).join("\n")).toMatch(/duplicate locale values/);
    expect(errors(f).join("\n")).toMatch(/duplicated en locale fallback/);
  });

  test("requires contextual semantic aliases rather than a first ambiguous Chinese match", () => {
    const f = fixture();
    f.catalogs["zh-TW"].cancel = "關閉";
    expect(errors(f).join("\n")).toMatch(/exact Web source differs/);
    if (f.message.translation.status !== "web")
      throw new Error("Fixture must use Web mapping");
    f.message.translation.match = "semantic";
    f.message.translation.rationale = "";
    expect(errors(f).join("\n")).toMatch(/context review rationale required/);
  });

  test("rejects lost, renamed or mistyped interpolation parameters", () => {
    const f = templateFixture();
    f.message.format.arguments[0].specifier = "%@";
    expect(errors(f).join("\n")).toMatch(/specifier differs from type/);
    f.message.format.arguments[0].specifier = "%lld";
    f.catalogs.ja.row = (values: Record<string, number | string>) =>
      interpolate("第 {row} 列", values);
    expect(errors(f).join("\n")).toMatch(
      /parameter shape differs|lost an argument/,
    );
    if (f.message.translation.status !== "web")
      throw new Error("Fixture must use Web mapping");
    f.message.translation.parameterMap.row = "message";
    expect(errors(f).join("\n")).toMatch(
      /parameter map differs|parameter types differ/,
    );
  });

  test("treats HTML/JSON wrapper extraction and owned dynamic display as pending work", () => {
    const f = fixture();
    f.message.format.state = "needsExtraction";
    f.manifest.dynamicSites.push({
      path,
      line: 1,
      source: 'Text("取消")',
      disposition: "owned",
      migration: "Change the String helper to accept a localized resource.",
    });
    const report = validateManifest(f.manifest, f.catalogs, f.sources);
    expect(report.pending.join("\n")).toMatch(/extract visible text/);
    expect(report.pending.join("\n")).toMatch(
      /dynamic owned migration pending/,
    );
    f.manifest.dynamicSites[0].line = 2;
    expect(errors(f).join("\n")).toMatch(/dynamic source differs/);
  });
});

describe("wire and presentation separation", () => {
  test("allows category raw values only in specific data contexts", () => {
    const categoryPath = "apps/ios/Sources/OtterKit/ExpenseCategory.swift";
    const sources = {
      [categoryPath]: 'case food = "餐飲"',
      [path]: 'Text("餐飲")',
    };
    expect(
      isChineseWireLiteral(
        scanSwift(sources[categoryPath], categoryPath)[0],
        sources,
      ),
    ).toBe(true);
    expect(
      isChineseWireLiteral(scanSwift(sources[path], path)[0], sources),
    ).toBe(false);
    expect(
      isChineseWireLiteral(
        scanSwift('case message = "請重新登入"', categoryPath)[0],
        sources,
      ),
    ).toBe(false);
  });

  test("permits a separate presentation contract but never localizes saved categories", () => {
    const f = fixture();
    const categoryPath = "apps/ios/Sources/OtterKit/ExpenseCategory.swift";
    f.sources = { [categoryPath]: 'case food = "餐飲"' };
    f.message.sourceChinese = "餐飲";
    f.message.format.swiftKey = "餐飲";
    f.catalogs["zh-TW"].cancel = "餐飲";
    f.message.occurrences = [{ path: categoryPath, line: 1, ordinal: 0 }];
    expect(errors(f).join("\n")).toMatch(
      /persisted category raw value must not be localized/,
    );
    f.message.occurrences[0].role = "presentation-anchor";
    f.manifest.exclusions = [
      {
        classification: "wire",
        value: "餐飲",
        reason: "Persisted raw value; label is separate.",
        presentationKey: f.message.id,
        occurrences: [{ path: categoryPath, line: 1, ordinal: 0 }],
      },
    ];
    expect(errors(f)).toEqual([]);
  });
});

function currentFixture() {
  const f = fixture();
  const anchors = inventorySources(f.sources).map(({ anchor }) => ({
    ...anchor,
    kind: "lookup" as const,
    catalogKey: "取消",
    arguments: [],
    reason: "Reviewed SwiftUI literal lookup.",
  }));
  f.manifest.resourceLocaleIDs = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      locale === "zh-TW" ? "zh-Hant" : locale,
    ]),
  );
  f.manifest.idToKey = { "action.cancel": "取消" };
  f.manifest.currentSource = {
    version: 1,
    anchors,
    boundaries: [],
    declarations: [],
  };
  f.message.migration = {
    status: "verified",
    catalogKey: "取消",
    currentSources: anchors.map(anchorIdentity),
    note: "Actual source and published catalog checked.",
  };
  const catalog = {
    sourceLanguage: "zh-Hant",
    version: "1.0",
    strings: {
      取消: {
        localizations: Object.fromEntries(
          supportedLocales.map((locale) => [
            locale === "zh-TW" ? "zh-Hant" : locale,
            {
              stringUnit: {
                state: "translated",
                value: f.catalogs[locale].cancel,
              },
            },
          ]),
        ),
      },
    },
  };
  const report = () =>
    validateManifest(f.manifest, f.catalogs, f.sources, catalog);
  return { ...f, catalog, report };
}

describe("current integration contracts", () => {
  test("has no planned work when source and all resource values are verified", () => {
    const f = currentFixture();
    expect(f.report().errors).toEqual([]);
    expect(f.report().pending).toEqual([]);
  });

  test("does not fail on line shifts or indentation", () => {
    const f = currentFixture();
    f.sources[path] = `// New comment\n\n    ${f.sources[path]}`;
    expect(f.report().errors).toEqual([]);
  });

  test("does not classify new English constants or new Chinese labels by default", () => {
    const f = currentFixture();
    f.sources[path] += '\nlet newNotice = "New notice"\nText("新的訊息")';
    expect(
      f.report().errors.filter((e) => e.includes("unclassified new source")),
    ).toHaveLength(2);
  });

  test("detects missing keys, empty values and locale metadata changes", () => {
    const f = currentFixture();
    f.catalog.strings.取消.localizations.en.stringUnit.value = "";
    expect(f.report().errors.join("\n")).toMatch(/missing translated value/);
    f.catalog.sourceLanguage = "zh-TW";
    expect(f.report().errors.join("\n")).toMatch(/metadata/);
    f.manifest.resourceLocaleIDs = { "zh-TW": "zh-TW" };
    expect(f.report().errors.join("\n")).toMatch(/resource locale mapping/);
    f.message.migration.catalogKey = "missing";
    expect(f.report().errors.join("\n")).toMatch(
      /missing required catalogKey missing/,
    );
  });

  test("does not use a verified schema status to hide an owned String bypass", () => {
    const f = currentFixture();
    f.sources[path] = 'let message = "取消"';
    const anchor = inventorySources(f.sources)[0].anchor;
    Object.assign(f.manifest.currentSource?.anchors[0] ?? {}, anchor, {
      kind: "lookup",
      reason: "Invalid raw producer.",
      catalogKey: "取消",
      arguments: [],
    });
    f.message.migration.currentSources = [anchorIdentity(anchor)];
    expect(f.report().errors.join("\n")).toMatch(
      /unmigrated owned String producer/,
    );
  });

  test("detects a new dynamic lookup even without any new string literal", () => {
    const f = currentFixture();
    f.sources[path] += "\nText(LocalizedStringKey(userInput))";
    expect(f.report().errors.join("\n")).toMatch(/unreviewed dynamic boundary/);
    const audit = f.manifest.currentSource;
    if (!audit) throw new Error("Missing audit");
    audit.boundaries = scanBoundaries(f.sources).map((b) => ({
      ...b,
      disposition: "userdata",
      reason: "Not a bounded local enum.",
    }));
    expect(f.report().errors.join("\n")).toMatch(/unbounded dynamic lookup/);
  });

  test("checks producer declarations, not only literal source lines", () => {
    const f = currentFixture();
    f.manifest.currentSource?.declarations.push({
      path,
      source: "let title: LocalizedStringKey",
    });
    expect(f.report().errors.join("\n")).toMatch(
      /typed producer declaration changed/,
    );
  });

  test("requires explicit ID mappings and real current source anchors", () => {
    const f = currentFixture();
    f.manifest.idToKey = {};
    f.message.migration.currentSources = [];
    expect(f.report().errors.join("\n")).toMatch(/idToKey mapping/);
    expect(f.report().errors.join("\n")).toMatch(/no current source anchors/);
  });

  test("does not accept an arbitrary Chinese wire exclusion", () => {
    const f = currentFixture();
    const a = f.manifest.currentSource?.anchors[0];
    if (!a) throw new Error("Missing source anchor");
    a.kind = "wire";
    delete a.catalogKey;
    expect(f.report().errors.join("\n")).toMatch(
      /wire exclusion lacks a known data context/,
    );
  });

  test("keeps unresolved migration pending nonzero", () => {
    const f = currentFixture();
    f.message.migration.status = "pending";
    expect(f.report().pending).toEqual([
      "action.cancel: native lookup/migration pending",
    ]);
  });

  test("supports intentional StaticString keys without requiring physical default keys", () => {
    const f = currentFixture();
    f.sources[path] =
      'Text(NativeLocalization.string("action.cancel", defaultValue: "取消"))';
    const inventory = inventorySources(f.sources);
    const audit = f.manifest.currentSource;
    if (!audit) throw new Error("Missing audit");
    audit.anchors = inventory.map(({ anchor }) => ({
      ...anchor,
      kind: anchor.literal === "action.cancel" ? "lookup" : "alias-default",
      catalogKey: "action.cancel",
      arguments: [],
      reason: "Intentional static semantic alias.",
    }));
    audit.boundaries = scanBoundaries(f.sources).map((b) => ({
      ...b,
      disposition: "localized",
      reason: "Typed StaticString/defaultValue producer.",
    }));
    f.message.migration.catalogKey = "action.cancel";
    f.message.migration.currentSources = audit.anchors.map(anchorIdentity);
    f.manifest.idToKey = { "action.cancel": "action.cancel" };
    const catalog = {
      ...f.catalog,
      strings: { "action.cancel": f.catalog.strings.取消 },
    };
    expect(
      validateManifest(f.manifest, f.catalogs, f.sources, catalog).errors,
    ).toEqual([]);
  });

  test("keeps automatic extraction disabled for the manually maintained catalog", () => {
    const project = readFileSync(
      new URL("../apps/ios/project.yml", import.meta.url),
      "utf8",
    );
    expect(project).toMatch(/^ {4}SWIFT_EMIT_LOC_STRINGS: NO$/m);
  });

  test("audits the actual repository source and published resources", () => {
    const report = checkRepository(
      fileURLToPath(new URL("..", import.meta.url)),
    );
    expect(report.errors).toEqual([]);
    expect(report.pending).toEqual([]);
    expect(report.counts).toMatchObject({
      catalogKeys: 839,
      localeValues: 15102,
      mappedWeb: 205,
      mappedWebFunctionRows: 10,
      mappedPluralWebFunctionRows: 0,
      nativePluralKeys: 14,
      compiledPluralKeys: 13,
      retiredMessages: 4,
    });
  });
});

describe("Foundation resource signatures", () => {
  test("keeps positional argument types and ignores escaped percent signs", () => {
    expect(formatSlots("100%% %2$@ %1$lld %#@count@")).toEqual([
      { position: 2, type: "@" },
      { position: 1, type: "lld" },
      { position: 1, type: "#@count@" },
    ]);
  });

  test("uses each substitution's local scope and preserves all locale CLDR forms", () => {
    const args = templateFixture().message.format.arguments;
    const entry = {
      localizations: {
        en: {
          stringUnit: { state: "translated", value: "%#@row@ %2$@" },
          substitutions: {
            row: {
              argNum: 1,
              formatSpecifier: "lld",
              variations: {
                plural: {
                  one: {
                    stringUnit: { state: "translated", value: "%lld row" },
                  },
                  other: {
                    stringUnit: { state: "translated", value: "%lld rows" },
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(verifyCatalogEntry("rows", entry, ["en"], args, ["row"])).toEqual(
      [],
    );
    entry.localizations.en.substitutions.row.argNum = 2;
    expect(
      verifyCatalogEntry("rows", entry, ["en"], args, ["row"]).join("\n"),
    ).toMatch(/typeMismatch|plural argument/);
    entry.localizations.en.substitutions.row.argNum = 1;
    entry.localizations.en.substitutions.row.variations.plural.one.stringUnit.value =
      "%@ row";
    expect(
      verifyCatalogEntry("rows", entry, ["en"], args, ["row"]).join("\n"),
    ).toMatch(/scope\/type/);
  });

  test("does not accept a missing CLDR category or an empty branch", () => {
    const args = [templateFixture().message.format.arguments[0]];
    const entry = {
      localizations: {
        pl: {
          stringUnit: { state: "translated", value: "%#@row@" },
          substitutions: {
            row: {
              argNum: 1,
              formatSpecifier: "lld",
              variations: {
                plural: {
                  other: { stringUnit: { state: "translated", value: "" } },
                },
              },
            },
          },
        },
      },
    };
    expect(
      verifyCatalogEntry("rows", entry, ["pl"], args, ["row"]).join("\n"),
    ).toMatch(/CLDR plural forms differ/);
    expect(
      verifyCatalogEntry("rows", entry, ["pl"], args, ["row"]).join("\n"),
    ).toMatch(/missing translated form/);
  });

  test("distinguishes formatted String slots from numeric slots", () => {
    const arg = templateFixture().message.format.arguments[0];
    const entry = {
      localizations: {
        en: { stringUnit: { state: "translated", value: "%@" } },
      },
    };
    expect(
      verifyCatalogEntry("number", entry, ["en"], [arg], []).join("\n"),
    ).toMatch(/typeMismatch/);
  });

  test("normalizes raw escapes and multiline indentation without changing literal backslashes", () => {
    const raw = scanSwift(
      String.raw`##"literal \\n / \##n / \##u{4E2D}"##`,
      path,
    )[0];
    expect(swiftFormat(raw.value, [], [], raw)).toBe("literal \\\\n / \n / 中");
    const multiline = scanSwift(
      'let s = """\n    first\n      second\n    """',
      path,
    )[0];
    expect(swiftFormat(multiline.value, [], [], multiline)).toBe(
      "first\n  second",
    );
    expect(swiftFormat("100%", [], [])).toBe("100%");
  });
});

describe("Web function reuse", () => {
  test("keeps all 77 actual formatters callable and does not flatten plural forms", () => {
    const keys = Object.keys(translations.en).filter(
      (key) =>
        typeof translations.en[key as keyof typeof translations.en] ===
        "function",
    );
    expect(keys).toHaveLength(77);
    const pluralKeys = keys.filter((key) =>
      Object.values(translations).some(
        (catalog) =>
          inspectFormatter(catalog[key as keyof typeof catalog])
            .pluralParameters.length,
      ),
    );
    expect(pluralKeys).toHaveLength(19);
    const shape = inspectFormatter(translations.pl.countEntries);
    expect(shape.pluralForms[0].forms).toMatchObject({
      one: "{count} wpis",
      few: "{count} wpisy",
      many: "{count} wpisów",
      other: "{count} wpisu",
    });
    const reused = resolveWebMessage(translations, "pl", "countEntries");
    if (typeof reused !== "function")
      throw new Error("Formatter was flattened");
    for (const count of [0, 1, 2, 5, 12, 22, 1.5, 1000000])
      expect(reused({ count })).toBe(translations.pl.countEntries({ count }));
    expect(() =>
      resolveWebMessage(translations, "missing", "countEntries"),
    ).toThrow();
  });

  test("detects formatter replacement that loses a locale-specific CLDR branch", () => {
    const f = fixture();
    const formatter = (values: Record<string, number | string>) =>
      interpolate(
        pluralForm("pl", values.count, {
          one: "{count} item",
          few: "{count} few",
          many: "{count} many",
          other: "{count} other",
        }),
        values,
      );
    const shape = inspectFormatter(formatter);
    f.manifest.webFunctions = [
      {
        key: "count",
        parameters: { count: "number" },
        pluralParameters: ["count"],
        pluralFormsByLocale: Object.fromEntries(
          supportedLocales.map((locale) => [locale, shape.pluralForms]),
        ),
      },
    ];
    for (const locale of supportedLocales) f.catalogs[locale].count = formatter;
    expect(errors(f)).toEqual([]);
    f.catalogs.pl.count = (values: Record<string, number | string>) =>
      interpolate("{count} items", values);
    expect(errors(f).join("\n")).toMatch(/CLDR plural forms differ/);
  });
});
