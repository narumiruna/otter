import type { Argument } from "./ios-localization-types.js";

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export interface FormatSlot {
  position: number;
  type: string;
}
/** Foundation printf positions are one-based; %% is never an argument. */
export function formatSlots(value: string): FormatSlot[] {
  const slots: FormatSlot[] = [];
  let next = 1;
  for (const match of value.matchAll(
    /%%|%(?:(\d+)\$)?(?:#@(\w+)@|[-+ #0]*\d*(?:\.\d+)?(@|lld|ld|d|lf|f))/g,
  )) {
    if (match[0] === "%%") continue;
    const position = match[1] ? Number(match[1]) : next++;
    slots.push({ position, type: match[2] ? `#@${match[2]}@` : match[3] });
  }
  return slots;
}
const typeFor = (argument: Argument) => argument.specifier.slice(1);
export function catalogStrings(
  value: unknown,
): Record<string, unknown> | undefined {
  return record(value) && record(value.strings) ? value.strings : undefined;
}
export function unitValue(value: unknown): string | undefined {
  if (
    !record(value) ||
    !record(value.stringUnit) ||
    value.stringUnit.state !== "translated" ||
    typeof value.stringUnit.value !== "string" ||
    !value.stringUnit.value.trim()
  )
    return undefined;
  return value.stringUnit.value;
}
export function verifyCatalogEntry(
  key: string,
  entry: unknown,
  locales: string[],
  args: Argument[],
  pluralNames: string[],
): string[] {
  const errors: string[] = [];
  if (!record(entry) || !record(entry.localizations))
    return [`${key}: missing catalog key/localizations`];
  if (
    Object.keys(entry.localizations).sort().join() !==
    locales
      .map((l) => (l === "zh-TW" ? "zh-Hant" : l))
      .sort()
      .join()
  )
    errors.push(`${key}: catalog must contain exactly 18 resource locale IDs`);
  for (const locale of locales) {
    const local = entry.localizations[locale === "zh-TW" ? "zh-Hant" : locale];
    const value = unitValue(local);
    const prefix = `${key}/${locale}`;
    if (!value || !record(local)) {
      errors.push(`${prefix}: missing translated value`);
      continue;
    }
    if (/\{\w+\}|undefined|NaN/.test(value))
      errors.push(`${prefix}: unresolved template`);
    const substitutions = record(local.substitutions)
      ? local.substitutions
      : {};
    if (
      Object.keys(substitutions).sort().join() !==
      [...pluralNames].sort().join()
    )
      errors.push(`${prefix}: plural substitutions differ`);
    const resolved = formatSlots(value).map((slot) => {
      if (!slot.type.startsWith("#@")) return slot;
      const name = slot.type.slice(2, -1);
      const sub = substitutions[name];
      if (
        !record(sub) ||
        !Number.isInteger(sub.argNum) ||
        typeof sub.formatSpecifier !== "string"
      ) {
        errors.push(`${prefix}: invalid substitution ${name}`);
        return slot;
      }
      return { position: Number(sub.argNum), type: sub.formatSpecifier };
    });
    const signature = resolved
      .map((s) => `${s.position}:${s.type}`)
      .sort()
      .join();
    const expected = args
      .map((a, i) => `${i + 1}:${typeFor(a)}`)
      .sort()
      .join();
    if (signature !== expected)
      errors.push(`${prefix}: typeMismatch ${signature} != ${expected}`);
    for (const [name, substitution] of Object.entries(substitutions)) {
      if (!record(substitution)) continue;
      const index = args.findIndex((a) => a.name === name);
      if (
        index < 0 ||
        args[index].type === "String" ||
        substitution.argNum !== index + 1 ||
        substitution.formatSpecifier !== typeFor(args[index])
      )
        errors.push(`${prefix}: plural argument contract differs for ${name}`);
      const forms =
        record(substitution.variations) &&
        record(substitution.variations.plural)
          ? substitution.variations.plural
          : {};
      const categories = new Intl.PluralRules(locale).resolvedOptions()
        .pluralCategories;
      if (Object.keys(forms).sort().join() !== categories.sort().join())
        errors.push(`${prefix}: CLDR plural forms differ for ${name}`);
      for (const [category, form] of Object.entries(forms)) {
        const text = unitValue(form);
        if (!text) {
          errors.push(`${prefix}/${name}/${category}: missing translated form`);
          continue;
        }
        // A substitution's local %lld refers only to its argNum, not global argument 1.
        const slots = formatSlots(text);
        if (
          slots.length !== 1 ||
          slots[0].position !== 1 ||
          slots[0].type !== substitution.formatSpecifier
        )
          errors.push(
            `${prefix}/${name}/${category}: substitution scope/type differs`,
          );
      }
    }
  }
  return errors;
}
