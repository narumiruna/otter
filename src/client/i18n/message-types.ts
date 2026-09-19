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
