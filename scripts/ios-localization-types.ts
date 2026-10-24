export type Catalogs = Record<string, Record<string, unknown>>;
export type Sources = Record<string, string>;
export interface Occurrence {
  path: string;
  line: number;
  ordinal: number;
  role?: "presentation-anchor";
  usage?: NativeMessage["classification"];
}
export interface SwiftLiteral extends Occurrence {
  value: string;
  interpolations: string[];
  start?: number;
  end?: number;
  hashes?: string;
  multilineIndent?: string;
}
export interface Argument {
  name: string;
  expression: string;
  type: "String" | "Int" | "Int32" | "Int64" | "Double";
  specifier: "%@" | "%lld" | "%d" | "%lf";
}
export interface WebContract {
  key: string;
  parameters: Record<string, "string" | "number">;
  pluralParameters: string[];
  pluralFormsByLocale?: Record<
    string,
    { parameter: string; forms: Record<string, string> }[]
  >;
}
export interface NativeMessage {
  id: string;
  sourceChinese: string;
  classification:
    | "ui-static"
    | "ui-template"
    | "dynamic-owned"
    | "error"
    | "print"
    | "permission";
  occurrences: Occurrence[];
  format: {
    state: "specified" | "needsExtraction";
    swiftKey: string;
    arguments: Argument[];
    pluralParameters: string[];
  };
  translation:
    | { status: "needsNativeTranslation" | "native" }
    | {
        status: "web";
        key: string;
        match: "exact" | "semantic";
        rationale: string;
        parameterMap: Record<string, string>;
        sharedValues: string[][];
      };
  migration: {
    status: "pending" | "existingCatalog" | "verified" | "retired";
    note: string;
    catalogKey?: string;
    currentSources?: string[];
    replacedBy?: string[];
  };
}
export interface Exclusion {
  classification: "wire" | "userdata" | "constant";
  reason: string;
  value: string;
  occurrences: Occurrence[];
  presentationKey?: string;
}
export interface DynamicSite {
  path: string;
  line: number;
  source: string;
  disposition:
    | "owned"
    | "userdata"
    | "external"
    | "formatted"
    | "category"
    | "localized";
  migration: string;
}
export interface Manifest {
  schemaVersion: 1;
  locales: string[];
  webFunctions: WebContract[];
  messages: NativeMessage[];
  exclusions: Exclusion[];
  dynamicSites: DynamicSite[];
  currentSource?: import("./ios-localization-current.js").CurrentAudit;
  resourceLocaleIDs?: Record<string, string>;
  idToKey?: Record<string, string>;
}
export interface Report {
  errors: string[];
  pending: string[];
  counts: Record<string, number>;
}
