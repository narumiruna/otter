# 版本與發佈

Otter 使用 [Changesets](https://github.com/changesets/changesets) 管理 npm package 版本與 changelog。目前只有 `@narumitw/otter-cli` 對外發佈；root、apps、core 與 contracts 都是 private packages。

## 新增 changeset

會改變 CLI 使用者體驗的 pull request 應執行：

```bash
npm run changeset
```

選擇 `@narumitw/otter-cli` 的 SemVer 變更層級，並提交產生的 `.changeset/*.md`。

## 自動發佈

變更合併到 `main` 後，`.github/workflows/publish.yml` 會建立或更新 release pull request。合併 release pull request 後，workflow 會：

1. 執行 `npm run release`，其中包含完整的 `npm run check`。
2. 更新並發佈 npm package。
3. 建立 Git tag。

Repository 必須設定具有 npm publish 權限的 `NPM_TOKEN` secret。

## 本機檢查

```bash
npm pack --dry-run --workspace @narumitw/otter-cli
npm run version-packages
npm run release
```

`version-packages` 和 `release` 會修改版本或發佈 package；只在準備正式 release 時執行。
