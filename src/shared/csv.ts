import { isDateOnly } from "./date.js";
import {
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
  toMajor,
} from "./money.js";
import type {
  Balance,
  Participant,
  Settlement,
  SettlementPayment,
  Trip,
} from "./settlement.js";

const expenseHeaders = [
  "date",
  "description",
  "amount",
  "currency",
  "paid_by",
  "category",
  "tags",
  "split_participants",
];
const resultHeaders = [
  "type",
  "participant",
  "from",
  "to",
  "amount",
  "currency",
  "note",
];
const importRequiredHeaders = [
  "date",
  "description",
  "amount",
  "currency",
  "paid_by",
  "split_participants",
];

export type ExpenseImportCsvRow = {
  rowNumber: number;
  date: string;
  description: string;
  amount: string;
  currency: string;
  paidBy: string;
  category: string;
  tags: string;
  splitParticipants: string[];
  splitShares?: { name: string; amount: string }[];
};

export type CsvImportError = {
  row: number;
  message: string;
};

export type ExpenseImportCsvResult = {
  rows: ExpenseImportCsvRow[];
  errors: CsvImportError[];
};

export function tripExpensesCsv(trip: Trip): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const rows = trip.expenses.map((expense) => [
    expense.expenseDate,
    expense.description,
    formatAmount(expense.amountMinor, expense.currency),
    expense.currency,
    participantById.get(expense.paidById) ?? "未知",
    expense.category ?? "其他",
    (expense.tags ?? []).join("|"),
    splitParticipantsCell(trip, expense),
  ]);

  return csvRows([expenseHeaders, ...rows]);
}

export function tripResultsCsv(
  balances: Balance[],
  settlements: Settlement[],
  payments: SettlementPayment[] = [],
  participants: Participant[] = [],
): string {
  const participantById = new Map(participants.map((p) => [p.id, p.name]));
  const balanceRows = balances.map((balance) => [
    "balance",
    balance.name,
    "",
    "",
    formatAmount(balance.amountMinor, balance.currency),
    balance.currency,
    "",
  ]);
  const settlementRows = settlements.map((settlement) => [
    "settlement",
    "",
    settlement.fromName,
    settlement.toName,
    formatAmount(settlement.amountMinor, settlement.currency),
    settlement.currency,
    "",
  ]);
  const paymentRows = payments.map((payment) => [
    "payment",
    "",
    participantById.get(payment.fromId) ?? payment.fromId,
    participantById.get(payment.toId) ?? payment.toId,
    formatAmount(payment.amountMinor, payment.currency),
    payment.currency,
    payment.note,
  ]);

  return csvRows([
    resultHeaders,
    ...balanceRows,
    ...settlementRows,
    ...paymentRows,
  ]);
}

export function parseExpenseImportCsv(
  text: string,
  participantNames: readonly string[] = [],
): ExpenseImportCsvResult {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) {
    return { errors: [{ message: "CSV 沒有資料", row: 1 }], rows: [] };
  }

  const headers = rows[0].map((header) => header.trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const missingHeaders = importRequiredHeaders.filter(
    (header) => !headerIndex.has(header),
  );
  if (missingHeaders.length > 0) {
    return {
      errors: [{ message: `缺少欄位：${missingHeaders.join(", ")}`, row: 1 }],
      rows: [],
    };
  }

  const knownNames = new Set(
    participantNames.map((name) => name.trim().toLocaleLowerCase()),
  );
  const parsedRows: ExpenseImportCsvRow[] = [];
  const errors: CsvImportError[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    const rowNumber = index + 2;
    const get = (header: string) =>
      (row[headerIndex.get(header) ?? -1] ?? "").trim();
    const date = get("date");
    const description = get("description");
    const amount = get("amount");
    const currency = get("currency");
    const paidBy = get("paid_by");
    const splitParticipantsText = get("split_participants");
    const splitCells = splitParticipantsText
      .split(";")
      .map((name) => name.trim())
      .filter(Boolean);
    const rawSplitShares = splitCells.map((cell) => {
      const separator = cell.indexOf("=");
      return separator === -1
        ? null
        : {
            amount: cell.slice(separator + 1).trim(),
            name: cell.slice(0, separator).trim(),
          };
    });
    const hasExplicitSplit = rawSplitShares.some(Boolean);
    const splitShares = hasExplicitSplit
      ? rawSplitShares.filter(
          (share): share is { name: string; amount: string } => !!share,
        )
      : undefined;
    const splitParticipants = hasExplicitSplit
      ? (splitShares ?? []).map((share) => share.name)
      : splitCells;

    if (!isDateOnly(date)) {
      errors.push({ message: "日期格式必須是 YYYY-MM-DD", row: rowNumber });
    }
    if (!description || description.length > 120) {
      errors.push({ message: "描述需為 1-120 字", row: rowNumber });
    }
    if (!isCurrency(currency)) {
      errors.push({ message: "不支援的貨幣", row: rowNumber });
    } else {
      try {
        parseAmountToMinor(amount, currency);
      } catch {
        errors.push({ message: "金額格式錯誤", row: rowNumber });
      }
    }
    if (!paidBy) {
      errors.push({ message: "付款人必填", row: rowNumber });
    }
    if (splitParticipants.length === 0) {
      errors.push({ message: "分帳參與者必填", row: rowNumber });
    }
    if (hasExplicitSplit && splitShares?.length !== splitCells.length) {
      errors.push({ message: "不平均分帳需每位成員都有金額", row: rowNumber });
    }
    if (hasExplicitSplit && isCurrency(currency)) {
      let splitTotal = 0;
      for (const share of splitShares ?? []) {
        try {
          splitTotal += parseAmountToMinor(share.amount, currency);
        } catch {
          errors.push({ message: "分帳金額格式錯誤", row: rowNumber });
          break;
        }
      }
      try {
        if (splitTotal !== parseAmountToMinor(amount, currency)) {
          errors.push({
            message: "分帳金額加總必須等於支出金額",
            row: rowNumber,
          });
        }
      } catch {
        // amount error is reported above
      }
    }
    if (knownNames.size > 0) {
      const names = [paidBy, ...splitParticipants].filter(Boolean);
      const unknown = names.find(
        (name) => !knownNames.has(name.trim().toLocaleLowerCase()),
      );
      if (unknown) {
        errors.push({ message: `找不到參與者：${unknown}`, row: rowNumber });
      }
    }

    parsedRows.push({
      amount,
      category: get("category"),
      currency,
      date,
      description,
      paidBy,
      rowNumber,
      splitParticipants,
      ...(splitShares ? { splitShares } : {}),
      tags: get("tags"),
    });
  }

  return { errors, rows: parsedRows };
}

function splitParticipantsCell(
  trip: Trip,
  expense: Trip["expenses"][number],
): string {
  const participantById = new Map(
    trip.participants.map((participant) => [participant.id, participant.name]),
  );
  const shares = new Map(
    expense.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]) ?? [],
  );
  return expense.participantIds
    .map((id) => {
      const name = participantById.get(id) ?? "未知";
      const share = shares.get(id);
      return share === undefined
        ? name
        : `${name}=${formatAmount(share, expense.currency)}`;
    })
    .join("; ");
}

function csvRows(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function formatAmount(
  amountMinor: number,
  currency: keyof typeof currencyInfo,
): string {
  return toMajor(amountMinor, currency).toFixed(
    currencyInfo[currency].minorUnits,
  );
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
