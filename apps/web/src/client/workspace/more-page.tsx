import type { TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { AccessSettings } from "./access-settings.js";
import { DataSettings } from "./data-settings.js";
import {
  ExchangeRateSettings,
  LifecycleSettings,
  TripPreferences,
} from "./trip-settings.js";
import { SectionHeading } from "./workspace-ui.js";

export function MorePage({
  onDeleted,
  onRestored,
  payload,
}: {
  onDeleted: () => void;
  onRestored: (payload: TripPayload) => void;
  payload: TripPayload;
}) {
  const { messages } = useI18n();
  const isOwner = payload.currentUserRole !== "editor";
  return (
    <section className="more-page grid gap-4" aria-labelledby="more-heading">
      <header className="page-intro">
        <SectionHeading
          description={
            isOwner
              ? messages.manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation
              : messages.youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings
          }
        >
          <span id="more-heading">{messages.groupSettings}</span>
        </SectionHeading>
      </header>
      {isOwner ? <AccessSettings payload={payload} /> : null}
      {isOwner && !payload.trip.archivedAt ? (
        <TripPreferences payload={payload} />
      ) : null}
      <DataSettings onRestored={onRestored} payload={payload} />
      {isOwner && !payload.trip.archivedAt ? (
        <ExchangeRateSettings
          key={`${payload.trip.id}:${payload.trip.baseCurrency}`}
          payload={payload}
        />
      ) : null}
      {isOwner ? (
        <LifecycleSettings onDeleted={onDeleted} payload={payload} />
      ) : null}
    </section>
  );
}
