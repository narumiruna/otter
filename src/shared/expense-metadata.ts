export const expenseCategories = [
  "餐飲",
  "交通",
  "住宿",
  "門票",
  "購物",
  "其他",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === "string" &&
    (expenseCategories as readonly string[]).includes(value)
  );
}

export function normalizeExpenseTags(value: unknown): string[] {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : value == null
        ? []
        : null;
  if (!rawTags) {
    throw new Error("標籤格式錯誤");
  }
  const tags = [
    ...new Set(
      rawTags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean),
    ),
  ];
  if (tags.length > 10) {
    throw new Error("標籤最多 10 個");
  }
  if (tags.some((tag) => tag.length > 24)) {
    throw new Error("標籤最多 24 字");
  }
  return tags;
}
