import type { TripPayload } from "../client-support.js";
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
  const isOwner = payload.currentUserRole !== "editor";
  return (
    <section className="more-page grid gap-4" aria-labelledby="more-heading">
      <header className="page-intro">
        <SectionHeading
          description={
            isOwner
              ? "管理分享、群組偏好與資料工具。高影響操作會在執行前再次確認。"
              : "你是協作者，可使用資料工具；只有擁有者能管理權限與群組設定。"
          }
        >
          <span id="more-heading">群組設定</span>
        </SectionHeading>
      </header>
      {isOwner ? <AccessSettings payload={payload} /> : null}
      {isOwner && !payload.trip.archivedAt ? (
        <TripPreferences payload={payload} />
      ) : null}
      <DataSettings onRestored={onRestored} payload={payload} />
      {isOwner && !payload.trip.archivedAt ? (
        <ExchangeRateSettings payload={payload} />
      ) : null}
      {isOwner ? (
        <LifecycleSettings onDeleted={onDeleted} payload={payload} />
      ) : null}
    </section>
  );
}
