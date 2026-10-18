export type MessageValues = Record<string, number | string>;
export type MessageFormatter = (values: MessageValues) => string;

export type CatalogShape<Catalog> = {
  [Key in keyof Catalog]: Catalog[Key] extends MessageFormatter
    ? MessageFormatter
    : string;
};

export function interpolate(message: string, values: MessageValues): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const pluralRules = new Map<string, Intl.PluralRules>();

export function pluralForm(
  locale: string,
  value: number | string | undefined,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  if (value === undefined || value === "") return forms.other;
  const count = Number(value);
  if (!Number.isFinite(count)) return forms.other;
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return forms[rules.select(count)] ?? forms.other;
}

export function pluralize(
  value: MessageValues[string],
  singular: string,
  plural = `${singular}s`,
): string {
  return Number(value) === 1 ? singular : plural;
}
