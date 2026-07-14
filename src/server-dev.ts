import type { Pool as PgPool, PoolClient } from "pg";
import {
  hashPassword,
  makeId,
  normalizeEmail,
  nowIso,
} from "./server-support.js";
import type { ExpenseCategory } from "./shared/expense-metadata.js";
import type { Currency } from "./shared/money.js";

export type DevelopmentAdminCredentials = {
  email: string;
  name: string;
  password: string;
};

type DevelopmentExpense = {
  amountMinor: number;
  category: ExpenseCategory;
  createdAt: string;
  currency: Currency;
  description: string;
  expenseDate: string;
  id: string;
  paidById: string;
  splits: { participantId: string; shareMinor?: number }[];
  tags: string[];
};

type DevelopmentTrip = {
  archivedAt: string | null;
  baseCurrency: Currency;
  createdAt: string;
  exchangeRates: Partial<Record<Currency, number>>;
  expenses: DevelopmentExpense[];
  id: string;
  name: string;
  participants: { id: string; name: string }[];
  settlementPayments: {
    amountMinor: number;
    createdAt: string;
    currency: Currency;
    fromId: string;
    id: string;
    note: string;
    paidAt: string;
    toId: string;
  }[];
};

const tokyoParticipants = {
  admin: "participant_dev_tokyo_admin",
  mei: "participant_dev_tokyo_mei",
  yijun: "participant_dev_tokyo_yijun",
  zhihao: "participant_dev_tokyo_zhihao",
};

const tainanParticipants = {
  admin: "participant_dev_tainan_admin",
  akai: "participant_dev_tainan_akai",
  xiaoqing: "participant_dev_tainan_xiaoqing",
};

const newYorkParticipants = {
  admin: "participant_dev_newyork_admin",
  anna: "participant_dev_newyork_anna",
  david: "participant_dev_newyork_david",
  kevin: "participant_dev_newyork_kevin",
};

const europeParticipants = {
  admin: "participant_dev_europe_admin",
  eileen: "participant_dev_europe_eileen",
  leo: "participant_dev_europe_leo",
  nina: "participant_dev_europe_nina",
};

const developmentTrips: DevelopmentTrip[] = [
  {
    archivedAt: null,
    baseCurrency: "TWD",
    createdAt: "2026-04-01T08:00:00.000Z",
    exchangeRates: { EUR: 35.2, JPY: 0.218, USD: 32.5 },
    expenses: [
      {
        amountMinor: 1280,
        category: "餐飲",
        createdAt: "2026-04-03T00:30:00.000Z",
        currency: "JPY",
        description: "羽田機場早餐",
        expenseDate: "2026-04-03",
        id: "expense_dev_tokyo_breakfast",
        paidById: tokyoParticipants.admin,
        splits: [
          { participantId: tokyoParticipants.admin },
          { participantId: tokyoParticipants.zhihao },
        ],
        tags: ["機場", "早餐"],
      },
      {
        amountMinor: 10320,
        category: "交通",
        createdAt: "2026-04-03T01:20:00.000Z",
        currency: "JPY",
        description: "Skyliner 車票",
        expenseDate: "2026-04-03",
        id: "expense_dev_tokyo_skyliner",
        paidById: tokyoParticipants.admin,
        splits: Object.values(tokyoParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["機場交通", "電車"],
      },
      {
        amountMinor: 168000,
        category: "住宿",
        createdAt: "2026-04-03T06:00:00.000Z",
        currency: "JPY",
        description: "上野飯店四晚",
        expenseDate: "2026-04-03",
        id: "expense_dev_tokyo_hotel",
        paidById: tokyoParticipants.mei,
        splits: Object.values(tokyoParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["上野", "四晚"],
      },
      {
        amountMinor: 5200,
        category: "餐飲",
        createdAt: "2026-04-03T11:30:00.000Z",
        currency: "JPY",
        description: "阿夫利拉麵",
        expenseDate: "2026-04-03",
        id: "expense_dev_tokyo_ramen",
        paidById: tokyoParticipants.mei,
        splits: Object.values(tokyoParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["晚餐", "拉麵"],
      },
      {
        amountMinor: 15200,
        category: "門票",
        createdAt: "2026-04-04T02:00:00.000Z",
        currency: "JPY",
        description: "teamLab Borderless",
        expenseDate: "2026-04-04",
        id: "expense_dev_tokyo_teamlab",
        paidById: tokyoParticipants.zhihao,
        splits: Object.values(tokyoParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["麻布台", "展覽"],
      },
      {
        amountMinor: 2860,
        category: "餐飲",
        createdAt: "2026-04-04T14:10:00.000Z",
        currency: "JPY",
        description: "便利商店宵夜",
        expenseDate: "2026-04-04",
        id: "expense_dev_tokyo_convenience",
        paidById: tokyoParticipants.yijun,
        splits: [
          { participantId: tokyoParticipants.admin },
          { participantId: tokyoParticipants.yijun },
          { participantId: tokyoParticipants.zhihao },
        ],
        tags: ["宵夜", "便利商店"],
      },
      {
        amountMinor: 9200,
        category: "餐飲",
        createdAt: "2026-04-05T03:00:00.000Z",
        currency: "JPY",
        description: "築地海鮮丼",
        expenseDate: "2026-04-05",
        id: "expense_dev_tokyo_tsukiji",
        paidById: tokyoParticipants.admin,
        splits: [
          { participantId: tokyoParticipants.admin, shareMinor: 3000 },
          { participantId: tokyoParticipants.mei, shareMinor: 2200 },
          { participantId: tokyoParticipants.yijun, shareMinor: 2000 },
          { participantId: tokyoParticipants.zhihao, shareMinor: 2000 },
        ],
        tags: ["必吃", "海鮮"],
      },
      {
        amountMinor: 4680,
        category: "購物",
        createdAt: "2026-04-05T09:40:00.000Z",
        currency: "JPY",
        description: "藥妝店代購",
        expenseDate: "2026-04-05",
        id: "expense_dev_tokyo_cosmetics",
        paidById: tokyoParticipants.yijun,
        splits: [
          { participantId: tokyoParticipants.admin, shareMinor: 3500 },
          { participantId: tokyoParticipants.yijun, shareMinor: 1180 },
        ],
        tags: ["代購", "藥妝"],
      },
    ],
    id: "trip_dev_tokyo_2026",
    name: "東京賞櫻五日",
    participants: [
      { id: tokyoParticipants.admin, name: "Admin" },
      { id: tokyoParticipants.mei, name: "美咲" },
      { id: tokyoParticipants.zhihao, name: "志豪" },
      { id: tokyoParticipants.yijun, name: "怡君" },
    ],
    settlementPayments: [
      {
        amountMinor: 2500,
        createdAt: "2026-04-06T05:00:00.000Z",
        currency: "TWD",
        fromId: tokyoParticipants.zhihao,
        id: "payment_dev_tokyo_partial",
        note: "先匯一部分，回台後再結清",
        paidAt: "2026-04-06",
        toId: tokyoParticipants.admin,
      },
    ],
  },
  {
    archivedAt: null,
    baseCurrency: "TWD",
    createdAt: "2026-06-10T02:00:00.000Z",
    exchangeRates: { EUR: 35.5, JPY: 0.22, USD: 32.4 },
    expenses: [
      {
        amountMinor: 4470,
        category: "交通",
        createdAt: "2026-06-19T01:00:00.000Z",
        currency: "TWD",
        description: "台鐵來回票",
        expenseDate: "2026-06-19",
        id: "expense_dev_tainan_train",
        paidById: tainanParticipants.admin,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["高鐵替代", "早鳥"],
      },
      {
        amountMinor: 7800,
        category: "住宿",
        createdAt: "2026-06-19T07:00:00.000Z",
        currency: "TWD",
        description: "中西區老屋民宿兩晚",
        expenseDate: "2026-06-19",
        id: "expense_dev_tainan_hotel",
        paidById: tainanParticipants.xiaoqing,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["民宿", "兩晚"],
      },
      {
        amountMinor: 960,
        category: "餐飲",
        createdAt: "2026-06-20T00:20:00.000Z",
        currency: "TWD",
        description: "國華街牛肉湯",
        expenseDate: "2026-06-20",
        id: "expense_dev_tainan_soup",
        paidById: tainanParticipants.akai,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["早餐", "排隊名店"],
      },
      {
        amountMinor: 1800,
        category: "交通",
        createdAt: "2026-06-20T02:00:00.000Z",
        currency: "TWD",
        description: "機車租借兩天",
        expenseDate: "2026-06-20",
        id: "expense_dev_tainan_scooter",
        paidById: tainanParticipants.admin,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["租車", "市區移動"],
      },
      {
        amountMinor: 450,
        category: "門票",
        createdAt: "2026-06-20T06:30:00.000Z",
        currency: "TWD",
        description: "古蹟聯票",
        expenseDate: "2026-06-20",
        id: "expense_dev_tainan_tickets",
        paidById: tainanParticipants.xiaoqing,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["赤崁樓", "安平古堡"],
      },
      {
        amountMinor: 1680,
        category: "餐飲",
        createdAt: "2026-06-20T13:30:00.000Z",
        currency: "TWD",
        description: "海安路酒吧",
        expenseDate: "2026-06-20",
        id: "expense_dev_tainan_bar",
        paidById: tainanParticipants.akai,
        splits: [
          { participantId: tainanParticipants.akai, shareMinor: 920 },
          { participantId: tainanParticipants.xiaoqing, shareMinor: 760 },
        ],
        tags: ["調酒", "續攤"],
      },
      {
        amountMinor: 1260,
        category: "購物",
        createdAt: "2026-06-21T08:00:00.000Z",
        currency: "TWD",
        description: "蝦餅與蜜餞伴手禮",
        expenseDate: "2026-06-21",
        id: "expense_dev_tainan_gifts",
        paidById: tainanParticipants.admin,
        splits: Object.values(tainanParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["伴手禮", "團購"],
      },
    ],
    id: "trip_dev_tainan_2026",
    name: "台南週末美食團",
    participants: [
      { id: tainanParticipants.admin, name: "Admin" },
      { id: tainanParticipants.akai, name: "阿凱" },
      { id: tainanParticipants.xiaoqing, name: "小晴" },
    ],
    settlementPayments: [
      {
        amountMinor: 1000,
        createdAt: "2026-06-21T10:00:00.000Z",
        currency: "TWD",
        fromId: tainanParticipants.akai,
        id: "payment_dev_tainan_cash",
        note: "回程車站先付現金",
        paidAt: "2026-06-21",
        toId: tainanParticipants.admin,
      },
    ],
  },
  {
    archivedAt: null,
    baseCurrency: "USD",
    createdAt: "2026-05-01T04:00:00.000Z",
    exchangeRates: { EUR: 1.08, JPY: 0.0068, TWD: 0.0308 },
    expenses: [
      {
        amountMinor: 18640,
        category: "住宿",
        createdAt: "2026-05-12T15:00:00.000Z",
        currency: "USD",
        description: "Brooklyn 公寓三晚",
        expenseDate: "2026-05-12",
        id: "expense_dev_newyork_apartment",
        paidById: newYorkParticipants.anna,
        splits: Object.values(newYorkParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["Brooklyn", "Airbnb"],
      },
      {
        amountMinor: 13600,
        category: "門票",
        createdAt: "2026-05-13T13:00:00.000Z",
        currency: "USD",
        description: "百老匯音樂劇",
        expenseDate: "2026-05-13",
        id: "expense_dev_newyork_broadway",
        paidById: newYorkParticipants.admin,
        splits: Object.values(newYorkParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["百老匯", "晚場"],
      },
      {
        amountMinor: 7280,
        category: "餐飲",
        createdAt: "2026-05-13T18:30:00.000Z",
        currency: "USD",
        description: "Chelsea Market 晚餐",
        expenseDate: "2026-05-13",
        id: "expense_dev_newyork_dinner",
        paidById: newYorkParticipants.david,
        splits: [
          { participantId: newYorkParticipants.admin, shareMinor: 1840 },
          { participantId: newYorkParticipants.anna, shareMinor: 1620 },
          { participantId: newYorkParticipants.david, shareMinor: 2080 },
          { participantId: newYorkParticipants.kevin, shareMinor: 1740 },
        ],
        tags: ["晚餐", "含小費"],
      },
      {
        amountMinor: 13600,
        category: "交通",
        createdAt: "2026-05-14T01:00:00.000Z",
        currency: "TWD",
        description: "機場接送預付款",
        expenseDate: "2026-05-14",
        id: "expense_dev_newyork_transfer",
        paidById: newYorkParticipants.kevin,
        splits: Object.values(newYorkParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["跨幣別", "機場"],
      },
      {
        amountMinor: 11600,
        category: "購物",
        createdAt: "2026-05-14T16:00:00.000Z",
        currency: "USD",
        description: "Outlet 共用行李箱",
        expenseDate: "2026-05-14",
        id: "expense_dev_newyork_luggage",
        paidById: newYorkParticipants.admin,
        splits: [
          { participantId: newYorkParticipants.admin },
          { participantId: newYorkParticipants.kevin },
        ],
        tags: ["Outlet", "共用品"],
      },
      {
        amountMinor: 3890,
        category: "其他",
        createdAt: "2026-05-15T12:00:00.000Z",
        currency: "USD",
        description: "行李寄放與服務費",
        expenseDate: "2026-05-15",
        id: "expense_dev_newyork_storage",
        paidById: newYorkParticipants.anna,
        splits: Object.values(newYorkParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["行李", "服務費"],
      },
    ],
    id: "trip_dev_newyork_2026",
    name: "紐約出差延長玩",
    participants: [
      { id: newYorkParticipants.admin, name: "Admin" },
      { id: newYorkParticipants.anna, name: "Anna" },
      { id: newYorkParticipants.david, name: "David" },
      { id: newYorkParticipants.kevin, name: "Kevin" },
    ],
    settlementPayments: [],
  },
  {
    archivedAt: "2026-01-10T04:00:00.000Z",
    baseCurrency: "EUR",
    createdAt: "2025-12-15T06:00:00.000Z",
    exchangeRates: { JPY: 0.0059, TWD: 0.0282, USD: 0.92 },
    expenses: [
      {
        amountMinor: 24800,
        category: "住宿",
        createdAt: "2025-12-29T12:00:00.000Z",
        currency: "EUR",
        description: "巴黎公寓四晚",
        expenseDate: "2025-12-29",
        id: "expense_dev_europe_apartment",
        paidById: europeParticipants.admin,
        splits: Object.values(europeParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["巴黎", "跨年"],
      },
      {
        amountMinor: 9800,
        category: "交通",
        createdAt: "2025-12-30T07:00:00.000Z",
        currency: "EUR",
        description: "歐洲之星車票",
        expenseDate: "2025-12-30",
        id: "expense_dev_europe_train",
        paidById: europeParticipants.leo,
        splits: Object.values(europeParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["跨國列車", "早鳥"],
      },
      {
        amountMinor: 7640,
        category: "餐飲",
        createdAt: "2025-12-31T18:00:00.000Z",
        currency: "EUR",
        description: "跨年晚餐",
        expenseDate: "2025-12-31",
        id: "expense_dev_europe_dinner",
        paidById: europeParticipants.eileen,
        splits: [
          { participantId: europeParticipants.admin, shareMinor: 2100 },
          { participantId: europeParticipants.eileen, shareMinor: 1840 },
          { participantId: europeParticipants.leo, shareMinor: 1850 },
          { participantId: europeParticipants.nina, shareMinor: 1850 },
        ],
        tags: ["跨年", "套餐"],
      },
      {
        amountMinor: 8800,
        category: "門票",
        createdAt: "2026-01-02T08:00:00.000Z",
        currency: "EUR",
        description: "羅浮宮與橘園美術館",
        expenseDate: "2026-01-02",
        id: "expense_dev_europe_museums",
        paidById: europeParticipants.nina,
        splits: Object.values(europeParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["博物館", "套票"],
      },
      {
        amountMinor: 4200,
        category: "其他",
        createdAt: "2026-01-03T10:00:00.000Z",
        currency: "USD",
        description: "旅遊保險加購",
        expenseDate: "2026-01-03",
        id: "expense_dev_europe_insurance",
        paidById: europeParticipants.admin,
        splits: Object.values(europeParticipants).map((participantId) => ({
          participantId,
        })),
        tags: ["跨幣別", "保險"],
      },
    ],
    id: "trip_dev_europe_2025",
    name: "歐洲跨年（已封存）",
    participants: [
      { id: europeParticipants.admin, name: "Admin" },
      { id: europeParticipants.eileen, name: "Eileen" },
      { id: europeParticipants.leo, name: "Leo" },
      { id: europeParticipants.nina, name: "Nina" },
    ],
    settlementPayments: [
      {
        amountMinor: 6000,
        createdAt: "2026-01-08T04:00:00.000Z",
        currency: "EUR",
        fromId: europeParticipants.leo,
        id: "payment_dev_europe_settled",
        note: "已用 Wise 轉帳",
        paidAt: "2026-01-08",
        toId: europeParticipants.admin,
      },
    ],
  },
];

export function developmentAdminCredentials(
  env: NodeJS.ProcessEnv,
): DevelopmentAdminCredentials | null {
  if (env.NODE_ENV !== "development") {
    return null;
  }

  const email = normalizeEmail(env.DEV_ADMIN_EMAIL ?? "");
  const password = env.DEV_ADMIN_PASSWORD ?? "";
  const name = env.DEV_ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) {
    throw new Error(
      "DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD are required in development",
    );
  }
  if (!email.includes("@")) {
    throw new Error("DEV_ADMIN_EMAIL must be a valid email");
  }
  if (password.length < 8) {
    throw new Error("DEV_ADMIN_PASSWORD must contain at least 8 characters");
  }

  return { email, name, password };
}

export async function ensureDevelopmentAdmin(
  pool: PgPool,
  credentials: DevelopmentAdminCredentials,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [
      makeId("user"),
      credentials.name,
      normalizeEmail(credentials.email),
      hashPassword(credentials.password),
      nowIso(),
    ],
  );
  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error("Failed to create development admin");
  }
  return userId;
}

export async function ensureDevelopmentFixtures(
  pool: PgPool,
  userId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const trip of developmentTrips) {
      await insertDevelopmentTrip(client, trip, userId);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertDevelopmentTrip(
  client: PoolClient,
  trip: DevelopmentTrip,
  userId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO trips
       (id, owner_id, name, base_currency, created_at, archived_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      trip.id,
      userId,
      trip.name,
      trip.baseCurrency,
      trip.createdAt,
      trip.archivedAt,
    ],
  );
  await client.query(
    `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
     VALUES ($1, $2, $3, 'owner', $4)
     ON CONFLICT (trip_id, user_id) DO NOTHING`,
    [`member_${trip.id}_${userId}`, trip.id, userId, trip.createdAt],
  );

  for (const participant of trip.participants) {
    await client.query(
      `INSERT INTO participants (id, trip_id, name, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [participant.id, trip.id, participant.name, trip.createdAt],
    );
  }

  for (const [currency, rate] of Object.entries(trip.exchangeRates)) {
    await client.query(
      `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, currency) DO NOTHING`,
      [trip.id, currency, rate],
    );
  }

  for (const expense of trip.expenses) {
    await client.query(
      `INSERT INTO expenses
         (id, trip_id, description, amount_minor, currency, paid_by_id,
          created_at, expense_date, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        expense.id,
        trip.id,
        expense.description,
        expense.amountMinor,
        expense.currency,
        expense.paidById,
        expense.createdAt,
        expense.expenseDate,
        expense.category,
        expense.tags,
      ],
    );
    for (const [position, split] of expense.splits.entries()) {
      await client.query(
        `INSERT INTO expense_participants
           (expense_id, trip_id, participant_id, position, share_minor)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (expense_id, participant_id) DO NOTHING`,
        [
          expense.id,
          trip.id,
          split.participantId,
          position,
          split.shareMinor ?? null,
        ],
      );
    }
  }

  for (const payment of trip.settlementPayments) {
    await client.query(
      `INSERT INTO settlement_payments
         (id, trip_id, from_id, to_id, amount_minor, currency, paid_at, note,
          created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        payment.id,
        trip.id,
        payment.fromId,
        payment.toId,
        payment.amountMinor,
        payment.currency,
        payment.paidAt,
        payment.note,
        payment.createdAt,
      ],
    );
  }
}
