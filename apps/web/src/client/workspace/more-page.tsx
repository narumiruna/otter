import {
  CodeIcon,
  DownloadIcon,
  GearIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";
import type { TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { SettingsNavigation } from "../settings-navigation.js";
import { useMediaQuery } from "../use-media-query.js";
import { AccessSettings } from "./access-settings.js";
import { CopyGroup } from "./copy-group.js";
import { DataSettings } from "./data-settings.js";
import {
  ApiWriteSettings,
  ExchangeRateSettings,
  LifecycleSettings,
  TripPreferences,
} from "./trip-settings.js";
import { SectionHeading } from "./workspace-ui.js";

export function MorePage({
  copyDisabled = false,
  onCopied,
  onDeleted,
  onRestored,
  payload,
  guestShare = false,
}: {
  copyDisabled?: boolean;
  onCopied: (payload: TripPayload) => void | Promise<void>;
  onDeleted: () => void;
  onRestored: (payload: TripPayload) => void;
  payload: TripPayload;
  guestShare?: boolean;
}) {
  const { messages } = useI18n();
  const isOwner = payload.currentUserRole !== "editor";
  const desktop = useMediaQuery("(min-width: 681px)");
  const [selected, setSelected] = useState("sharing-settings");
  const sections = [
    ...(isOwner
      ? [
          {
            id: "sharing-settings",
            label: messages.sharingAndAccess,
            icon: <LockClosedIcon aria-hidden="true" />,
          },
          {
            id: "api-write-settings",
            label: messages.apiWriteSettings,
            icon: <CodeIcon aria-hidden="true" />,
          },
          ...(!payload.trip.archivedAt
            ? [
                {
                  id: "group-preferences",
                  label: messages.groupPreferences,
                  icon: <GearIcon aria-hidden="true" />,
                },
              ]
            : []),
        ]
      : []),
    {
      id: "data-tools",
      label: messages.dataAndExport,
      icon: <DownloadIcon aria-hidden="true" />,
    },
  ];
  const active = sections.some((section) => section.id === selected)
    ? selected
    : sections[0]?.id;
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
      <div className="settings-sections">
        <SettingsNavigation
          label={messages.groupSettings}
          sections={sections}
          selected={active}
          onSelect={setSelected}
        />
        <div className="settings-section-content">
          {isOwner ? (
            <section
              id="sharing-settings"
              hidden={desktop && active !== "sharing-settings"}
            >
              <AccessSettings payload={payload} expanded={desktop} />
            </section>
          ) : null}
          {isOwner ? (
            <section
              id="api-write-settings"
              hidden={desktop && active !== "api-write-settings"}
            >
              <ApiWriteSettings payload={payload} expanded={desktop} />
            </section>
          ) : null}
          {isOwner && !payload.trip.archivedAt ? (
            <section
              id="group-preferences"
              hidden={desktop && active !== "group-preferences"}
              className="grid gap-4"
            >
              <TripPreferences payload={payload} expanded={desktop} />
              <ExchangeRateSettings
                key={`${payload.trip.id}:${payload.trip.baseCurrency}`}
                payload={payload}
                expanded={desktop}
              />
            </section>
          ) : null}
          <section
            id="data-tools"
            hidden={desktop && active !== "data-tools"}
            className="grid gap-4"
          >
            {isOwner && !guestShare ? (
              <CopyGroup
                disabled={copyDisabled}
                onCopied={onCopied}
                payload={payload}
              />
            ) : null}
            <DataSettings
              guestShare={guestShare}
              onRestored={onRestored}
              payload={payload}
              expanded={desktop}
            />
            {isOwner ? (
              <LifecycleSettings
                onDeleted={onDeleted}
                payload={payload}
                expanded={desktop}
              />
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
