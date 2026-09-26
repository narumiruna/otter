import {
  type TripBackup,
  type TripBackupV2,
  validateTripBackupV1,
} from "@narumitw/otter-core/backup";
import {
  convertExpenseMinor,
  type ExchangeRates,
  fixedExchangeRates,
  isCurrency,
} from "@narumitw/otter-core/money";
import type { Pool as PgPool, PoolClient } from "pg";
import { recordExpenseChanges } from "./server-expense-history.js";
import { ExpenseRateError } from "./server-expense-rates.js";
import { insertExpense } from "./server-expense-store.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import {
  type BuildTripPayload,
  currentUser,
  loadTripForUser,
  makeId,
  nowIso,
  requestBody,
  sendError,
  tripNameExistsForUser,
  withTransaction,
} from "./server-support.js";

export function registerBackupRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  buildTripPayload: BuildTripPayload,
) {
  app.get(
    "/api/trips/:tripId/backup",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const trip = await loadTripForUser(
        pool,
        currentUser(context).id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.currentUserRole !== "owner") {
        return sendError(context, 403, "只有擁有者可下載完整備份");
      }
      return context.json(tripBackupV2(trip));
    },
  );

  app.post(
    "/api/trips/restore",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      let backup: TripBackup;
      try {
        const body = requestBody(context);
        backup = validateTripBackupV1("version" in body ? body : body.backup);
      } catch (error) {
        return sendError(
          context,
          400,
          error instanceof Error ? error.message : "備份格式錯誤",
        );
      }

      let tripId: string;
      try {
        tripId = await withTransaction(pool, async (client) => {
          const newTripId = makeId("trip");
          const createdAt = nowIso();
          const name = await uniqueRestoredTripName(
            client,
            user.id,
            backup.trip.name,
          );
          await client.query(
            `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
            [newTripId, user.id, name, backup.trip.baseCurrency, createdAt],
          );
          await client.query(
            `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
           VALUES ($1, $2, $3, 'owner', $4)`,
            [makeId("member"), newTripId, user.id, createdAt],
          );

          const participantIds = new Map<string, string>();
          for (const participant of backup.trip.participants) {
            const participantId = makeId("participant");
            participantIds.set(participant.id, participantId);
            await client.query(
              `INSERT INTO participants (id, trip_id, name, created_at)
             VALUES ($1, $2, $3, $4)`,
              [participantId, newTripId, participant.name, createdAt],
            );
          }

          const restoredRates: ExchangeRates = {
            [backup.trip.baseCurrency]: 1,
          };
          for (const [currency, rate] of Object.entries(
            backup.trip.exchangeRates ?? {},
          )) {
            if (
              currency === backup.trip.baseCurrency ||
              rate === undefined ||
              !isCurrency(currency)
            ) {
              continue;
            }
            const saved = await client.query<{ rate_to_base: string }>(
              `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
             VALUES ($1, $2, $3) RETURNING rate_to_base`,
              [newTripId, currency, rate],
            );
            restoredRates[currency] = Number(saved.rows[0].rate_to_base);
          }

          const restoredParticipantId = (id: string): string => {
            const restored = participantIds.get(id);
            if (!restored)
              throw new Error("Validated backup participant is missing");
            return restored;
          };
          for (const expense of backup.trip.expenses) {
            const exchangeRate =
              backup.version === 2 && "exchangeRate" in expense
                ? expense.exchangeRate
                : {
                    baseCurrency: backup.trip.baseCurrency,
                    rateToBase:
                      expense.currency === backup.trip.baseCurrency
                        ? 1
                        : (restoredRates[expense.currency] ??
                          Number(
                            fixedExchangeRates(backup.trip.baseCurrency)[
                              expense.currency
                            ].toPrecision(12),
                          )),
                    source: "legacy" as const,
                  };
            try {
              convertExpenseMinor(
                expense.amountMinor,
                expense.currency,
                backup.trip.baseCurrency,
                exchangeRate,
                {
                  ...fixedExchangeRates(backup.trip.baseCurrency),
                  ...restoredRates,
                },
              );
            } catch {
              throw new ExpenseRateError("備份支出換算金額超出範圍");
            }
            await insertExpense(client, newTripId, {
              ...expense,
              exchangeRate,
              id: makeId("expense"),
              category: expense.category ?? "其他",
              tags: expense.tags ?? [],
              paidById: restoredParticipantId(expense.paidById),
              participantIds: expense.participantIds.map(restoredParticipantId),
              participantShares: expense.participantShares?.map((share) => ({
                ...share,
                participantId: restoredParticipantId(share.participantId),
              })),
            });
          }

          for (const payment of backup.trip.settlementPayments ?? []) {
            await client.query(
              `INSERT INTO settlement_payments
               (id, trip_id, from_id, to_id, amount_minor, currency, paid_at, note, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                makeId("payment"),
                newTripId,
                participantIds.get(payment.fromId),
                participantIds.get(payment.toId),
                payment.amountMinor,
                payment.currency,
                payment.paidAt,
                payment.note,
                payment.createdAt,
              ],
            );
          }

          await recordExpenseChanges(
            client,
            newTripId,
            [],
            user,
            "backup_restore",
          );
          return newTripId;
        });
      } catch (error) {
        if (error instanceof ExpenseRateError)
          return sendError(context, 400, error.message);
        throw error;
      }

      const restored = await loadTripForUser(pool, user.id, tripId);
      if (!restored) {
        throw new Error("Trip disappeared after restore");
      }
      return context.json(await buildTripPayload(restored), 201);
    },
  );
}

function tripBackupV2(
  trip: NonNullable<Awaited<ReturnType<typeof loadTripForUser>>>,
): TripBackupV2 {
  return {
    exportedAt: nowIso(),
    trip: {
      baseCurrency: trip.baseCurrency,
      ...(trip.exchangeRates ? { exchangeRates: trip.exchangeRates } : {}),
      expenses: trip.expenses.map((expense) => ({
        amountMinor: expense.amountMinor,
        category: expense.category,
        createdAt: expense.createdAt,
        currency: expense.currency,
        exchangeRate: expense.exchangeRate ?? {
          baseCurrency: trip.baseCurrency,
          rateToBase: Number(
            fixedExchangeRates(trip.baseCurrency)[expense.currency].toPrecision(
              12,
            ),
          ),
          source: "legacy" as const,
        },
        description: expense.description,
        expenseDate: expense.expenseDate,
        id: expense.id,
        paidById: expense.paidById,
        participantIds: expense.participantIds,
        ...(expense.participantShares
          ? { participantShares: expense.participantShares }
          : {}),
        tags: expense.tags ?? [],
      })),
      name: trip.name,
      participants: trip.participants,
      settlementPayments: trip.settlementPayments ?? [],
    },
    version: 2,
  };
}

async function uniqueRestoredTripName(
  client: PoolClient,
  userId: string,
  name: string,
): Promise<string> {
  if (!(await tripNameExistsForUser(client, userId, name))) {
    return name;
  }
  for (let index = 1; ; index += 1) {
    const suffix = ` (restored${index === 1 ? "" : ` ${index}`})`;
    const candidate = `${name.slice(0, 100 - suffix.length).trimEnd()}${suffix}`;
    if (!(await tripNameExistsForUser(client, userId, candidate))) {
      return candidate;
    }
  }
}
