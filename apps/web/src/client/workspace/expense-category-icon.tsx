import type { ExpenseCategory } from "@narumitw/otter-core/expense-metadata";
import {
  BackpackIcon,
  BookmarkIcon,
  CookieIcon,
  FileTextIcon,
  HomeIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

const categoryIcons = {
  交通: RocketIcon,
  住宿: HomeIcon,
  其他: FileTextIcon,
  購物: BackpackIcon,
  門票: BookmarkIcon,
  餐飲: CookieIcon,
} satisfies Record<ExpenseCategory, typeof FileTextIcon>;

export function ExpenseCategoryIcon({
  category = "其他",
}: {
  category?: ExpenseCategory;
}) {
  const Icon = categoryIcons[category];
  return (
    <span
      className="expense-category-icon"
      data-category={category}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
