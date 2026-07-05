import { currencies } from "../shared/money.js";
import type { Trip } from "../shared/settlement.js";
import {
  type AppState,
  htmlEscape,
  type TripPayload,
} from "./client-support.js";

export function settingsPanel(state: AppState, payload: TripPayload): string {
  const { trip } = payload;
  const isOwner = payload.currentUserRole !== "editor";
  return `
    <article id="workspace-panel-settings" class="card stack settings-card" data-workspace-panel="settings" role="tabpanel" aria-labelledby="workspace-tab-settings">
      <h3>設定 / 匯出</h3>
      <div class="action-groups" aria-label="支出群組操作">
        <div class="row action-group">
          <button id="export-expenses" class="secondary" type="button">匯出支出 CSV</button>
          <button id="export-results" class="secondary" type="button">匯出結算 CSV</button>
          ${isOwner ? '<button id="download-backup" class="secondary" data-busy-action="download-backup" data-busy-label="下載中…" type="button">下載完整備份</button>' : ""}
          <button id="print-trip" class="secondary" type="button">列印</button>
        </div>
        ${
          isOwner
            ? `<div class="row danger-actions">
                <button id="archive-trip" class="secondary" data-archived="${trip.archivedAt ? "true" : "false"}" data-busy-action="trip-archive" data-busy-label="更新中…" type="button">${trip.archivedAt ? "還原支出群組" : "封存支出群組"}</button>
              </div>`
            : ""
        }
      </div>
      <p class="muted">目前角色：${isOwner ? "擁有者" : "協作者"}；基準貨幣：${trip.baseCurrency}${trip.archivedAt ? "；此群組已封存，還原後可繼續修改。" : ""}</p>
      ${isOwner ? ownerTripForms(trip) : ""}
      ${restoreBackupForm()}
      ${trip.archivedAt ? "" : csvImportForm(state)}
      ${isOwner ? shareLinksPanel(payload) : ""}
      ${isOwner ? collaboratorsPanel(payload) : ""}
      ${trip.archivedAt || !isOwner ? "" : exchangeRatesForm(trip)}
    </article>
  `;
}

function ownerTripForms(trip: Trip): string {
  return `
    <section class="inline-tool">
      <h4>支出群組設定</h4>
      <form id="trip-rename-form" class="row">
        <label>名稱<input name="name" required maxlength="100" value="${htmlEscape(trip.name)}" /></label>
        <button class="secondary" data-busy-action="trip-rename" data-busy-label="儲存中…" type="submit">儲存名稱</button>
      </form>
      <form id="trip-base-currency-form" class="row">
        <label>基準貨幣
          <select name="baseCurrency">
            ${currencies.map((currency) => `<option value="${currency}" ${currency === trip.baseCurrency ? "selected" : ""}>${currency}</option>`).join("")}
          </select>
        </label>
        <button class="secondary" data-busy-action="trip-base-currency" data-busy-label="儲存中…" type="submit">儲存基準貨幣</button>
      </form>
      <details class="inline-confirm danger-zone">
        <summary>刪除支出群組</summary>
        <form id="delete-trip-form">
          <p class="muted">這會刪除所有參與者、支出與結清紀錄，無法復原。</p>
          <button id="delete-trip" class="danger" data-busy-action="trip-delete" data-busy-label="刪除中…" type="submit">確認刪除支出群組</button>
        </form>
      </details>
    </section>
  `;
}

export function restoreBackupForm(): string {
  return `
    <form id="restore-backup-form" class="inline-tool">
      <h4>還原備份</h4>
      <p class="muted">上傳 otter JSON 備份會建立一個新的支出群組，不會覆蓋目前資料。</p>
      <label>JSON 備份檔<input id="restore-backup-file" name="backup" type="file" accept="application/json,.json" required /></label>
      <button class="secondary" data-busy-action="restore-backup" data-busy-label="還原中…" type="submit">還原備份</button>
    </form>
  `;
}

function csvImportForm(state: AppState): string {
  return `
    <form id="csv-import-form" class="inline-tool">
      <h4>匯入支出 CSV</h4>
      <p class="muted">欄位：date, description, amount, currency, paid_by, split_participants；參與者名稱需先存在。</p>
      <label>CSV 檔<input id="csv-import-file" name="csv" type="file" accept=".csv,text/csv" required /></label>
      <button class="secondary" data-busy-action="csv-import" data-busy-label="匯入中…" type="submit">匯入支出</button>
      ${
        state.csvImportErrors.length
          ? `<ul class="form-error" role="alert">${state.csvImportErrors.map((error) => `<li>${htmlEscape(error)}</li>`).join("")}</ul>`
          : ""
      }
    </form>
  `;
}

function shareLinksPanel(payload: TripPayload): string {
  const links = payload.shareLinks ?? [];
  return `
    <section class="inline-tool share-links-panel">
      <h4>唯讀分享連結</h4>
      <p class="muted">知道連結的人不需登入即可查看支出、餘額與結清建議；不能新增或修改資料。</p>
      <button id="create-share-link" class="secondary" data-busy-action="share-create" data-busy-label="建立中…" type="button">建立分享連結</button>
      <ul class="list">
        ${
          links.length
            ? links
                .map(
                  (link) => `
                    <li>
                      <span>${htmlEscape(link.createdAt.slice(0, 10))}${link.revokedAt ? " · 已撤銷" : " · 可使用"}</span>
                      ${link.url ? `<button class="secondary" data-copy-share-url="${htmlEscape(link.url)}" type="button">複製連結</button>` : ""}
                      ${link.revokedAt ? "" : `<details class="inline-confirm"><summary>撤銷</summary><form data-revoke-share-link-form="${htmlEscape(link.id)}"><p class="muted">撤銷後知道舊連結的人將無法查看。</p><button class="danger" data-busy-action="share-revoke:${htmlEscape(link.id)}" data-busy-label="撤銷中…" type="submit">確認撤銷</button></form></details>`}
                    </li>
                  `,
                )
                .join("")
            : '<li class="muted">尚未建立分享連結。</li>'
        }
      </ul>
    </section>
  `;
}

function collaboratorsPanel(payload: TripPayload): string {
  const members = payload.collaborators ?? [];
  return `
    <section class="inline-tool collaborators-panel">
      <h4>協作者</h4>
      <form id="collaborator-form" class="row">
        <label>Email<input name="email" type="email" placeholder="friend@example.com" required /></label>
        <button class="secondary" data-busy-action="collaborator-add" data-busy-label="加入中…" type="submit">加入既有使用者</button>
      </form>
      <ul class="list">
        ${members
          .map(
            (member) => `
              <li>
                <span>${htmlEscape(member.name)} · ${htmlEscape(member.email)} · ${member.role === "owner" ? "擁有者" : "協作者"}</span>
                ${member.role === "editor" ? `<details class="inline-confirm"><summary>移除</summary><form data-remove-collaborator-form="${htmlEscape(member.userId)}"><p class="muted">移除後這位協作者將無法維護此支出群組。</p><button class="danger" data-busy-action="collaborator-remove:${htmlEscape(member.userId)}" data-busy-label="移除中…" type="submit">確認移除</button></form></details>` : ""}
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function exchangeRatesForm(trip: Trip): string {
  return `
    <form id="exchange-rates-form" class="inline-tool">
      <h4>自訂匯率</h4>
      <p class="muted">設定 1 單位外幣等於多少 ${trip.baseCurrency}；會套用於整趟旅行目前計算。</p>
      <div class="grid">
        ${currencies
          .map((currency) => {
            const rate =
              currency === trip.baseCurrency
                ? 1
                : trip.exchangeRates?.[currency];
            return `
              <label>${currency} → ${trip.baseCurrency}
                <input name="rate:${currency}" inputmode="decimal" value="${htmlEscape(String(rate ?? ""))}" ${currency === trip.baseCurrency ? "readonly" : ""} placeholder="留空使用內建匯率" />
              </label>
            `;
          })
          .join("")}
      </div>
      <button class="secondary" data-busy-action="exchange-rates" data-busy-label="儲存中…" type="submit">儲存匯率</button>
    </form>
  `;
}
