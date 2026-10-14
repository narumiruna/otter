import { calculatePersonalSummary } from "@narumitw/otter-core/settlement";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n.js";
import { useOptionalWorkspace } from "./workspace-context.js";
import { FormField } from "./workspace-ui.js";

export function PersonalSummary() {
  const workspace = useOptionalWorkspace();
  const { messages, formatMoney } = useI18n();
  if (!workspace?.userId) return null;
  const {
    payload: { trip },
    preferences,
    savePreferences,
    clearPreferences,
    preferencesFailed,
    preferencesChanged,
  } = workspace;
  const person = trip.participants.find(
    (p) => p.id === preferences.participantId,
  );
  const summary = person
    ? calculatePersonalSummary(trip, person.id)
    : undefined;
  const representative = trip.participants.find(
    (p) => p.id === person?.settledById,
  );
  const represents = trip.participants.some(
    (p) => p.settledById === person?.id,
  );
  return (
    <section
      className="surface grid gap-3"
      aria-label={messages.personalSummary}
    >
      <h3 className="text-lg font-semibold">{messages.personalSummary}</h3>
      <FormField label={messages.whoAmI}>
        <select
          className="form-control"
          value={person?.id ?? ""}
          onChange={(event) =>
            savePreferences({
              ...preferences,
              participantId: event.target.value || undefined,
            })
          }
        >
          <option value="">{messages.choosePersonalIdentity}</option>
          {trip.participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>
      <p className="text-sm text-muted-foreground">
        {messages.personalIdentityHelp}
      </p>
      {preferencesChanged ? (
        <p role="status">{messages.personalPreferencesChanged}</p>
      ) : null}
      {preferencesFailed ? (
        <p role="alert">{messages.personalStorageFailed}</p>
      ) : null}
      <Button type="button" variant="outline" onClick={clearPreferences}>
        {messages.clearPersonalPreferences}
      </Button>
      {summary ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt>{messages.personalPaid}</dt>
              <dd className="font-semibold">
                {formatMoney(summary.paidMinor, summary.currency)}
              </dd>
            </div>
            <div>
              <dt>{messages.personalShared}</dt>
              <dd className="font-semibold">
                {formatMoney(summary.sharedMinor, summary.currency)}
              </dd>
            </div>
            <div>
              <dt>
                {summary.balanceMinor < 0
                  ? messages.personalOwe
                  : messages.personalOwed}
              </dt>
              <dd className="font-semibold">
                {formatMoney(Math.abs(summary.balanceMinor), summary.currency)}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {summary.currency} · {messages.personalTotalsHelp}
          </p>
          {representative ? (
            <p>{messages.personalSettledBy({ name: representative.name })}</p>
          ) : null}
          {represents ? <p>{messages.personalRepresentsHelp}</p> : null}
        </>
      ) : null}
    </section>
  );
}
