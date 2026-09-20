import {
  type TripBackupV1,
  validateTripBackupV1,
} from "@narumitw/otter-core/backup";
import type { Pool as PgPool, PoolClient } from "pg";
import { insertExpense } from "./server-expense-store.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import {
  asyncHandler,
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
    asyncHandler(async (req, res) => {
      const trip = await loadTripForUser(
        pool,
        currentUser(res).id,
        req.params.tripId,
      );
      if (!trip) {
        sendError(res, 404, "找不到旅行");
        return;
      }
      if (trip.currentUserRole !== "owner") {
        sendError(res, 403, "只有擁有者可下載完整備份");
        return;
      }
      res.json(tripBackupV1(trip));
    }),
  );

  app.post(
    "/api/trips/restore",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      let backup: TripBackupV1;
      try {
        const body = requestBody(req);
        backup = validateTripBackupV1("version" in body ? body : body.backup);
      } catch (error) {
        sendError(
          res,
          400,
          error instanceof Error ? error.message : "備份格式錯誤",
        );
        return;
      }

      const tripId = await withTransaction(pool, async (client) => {
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

        for (const [currency, rate] of Object.entries(
          backup.trip.exchangeRates ?? {},
        )) {
          if (currency === backup.trip.baseCurrency || rate === undefined) {
            continue;
          }
          await client.query(
            `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
             VALUES ($1, $2, $3)`,
            [newTripId, currency, rate],
          );
        }

        const restoredParticipantId = (id: string): string => {
          const restored = participantIds.get(id);
          if (!restored)
            throw new Error("Validated backup participant is missing");
          return restored;
        };
        for (const expense of backup.trip.expenses) {
          await insertExpense(client, newTripId, {
            ...expense,
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

        return newTripId;
      });

      const restored = await loadTripForUser(pool, user.id, tripId);
      if (!restored) {
        throw new Error("Trip disappeared after restore");
      }
      res.status(201).json(await buildTripPayload(restored));
    }),
  );
}

function tripBackupV1(
  trip: NonNullable<Awaited<ReturnType<typeof loadTripForUser>>>,
): TripBackupV1 {
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
    version: 1,
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
