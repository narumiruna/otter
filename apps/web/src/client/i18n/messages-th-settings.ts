import { interpolate, type MessageValues } from "./message-types.js";

export const thSettings = {
  groupSettings: "การตั้งค่ากลุ่ม",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "จัดการการแชร์ การกำหนดค่ากลุ่ม และเครื่องมือข้อมูล การดำเนินการที่มีผลกระทบสูงต้องยืนยันก่อน",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "คุณเป็นผู้ร่วมจัดการและใช้เครื่องมือข้อมูลได้ เฉพาะเจ้าของเท่านั้นที่จัดการสิทธิ์เข้าถึงและการตั้งค่ากลุ่มได้",
  sharingAndAccess: "การแชร์และการเข้าถึง",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate("ลิงก์ที่ใช้งาน {links} ลิงก์ · ผู้ร่วมจัดการ {collaborators} คน", values),
  shareLinkCreated: "สร้างลิงก์แชร์แล้ว",
  shareLinkCreatedAndCopied: "สร้างและคัดลอกลิงก์แชร์แล้ว",
  shareLinks: "ลิงก์แชร์",
  chooseWhoCanEditThroughTheShareLink: "เลือกว่าใครสามารถดูหรือแก้ไขผ่านลิงก์นี้ได้",
  linkPermission: "สิทธิ์ของลิงก์",
  readOnlyLink: "อ่านอย่างเดียว (ไม่ต้องลงชื่อเข้าใช้)",
  signedInEditLink: "แก้ไขหลังลงชื่อเข้าใช้",
  anyoneEditLink: "ทุกคนที่มีลิงก์แก้ไขได้",
  signedInEditLinkDescription:
    "หลังลงชื่อเข้าใช้หรือลงทะเบียน ผู้เยี่ยมชมจะกลายเป็นผู้ร่วมจัดการ การเพิกถอนลิงก์ไม่นำคนที่เข้าร่วมแล้วออก",
  anyoneEditLinkDescription:
    "ทุกคนที่มีลิงก์แก้ไขค่าใช้จ่ายและผู้ร่วมค่าใช้จ่ายได้โดยไม่ต้องลงชื่อเข้าใช้ แชร์ให้เฉพาะคนที่คุณไว้วางใจ การเพิกถอนมีผลทันที",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "การเพิกถอนป้องกันการเข้าร่วมใหม่ ผู้ร่วมจัดการที่มีอยู่ยังแก้ไขได้ โปรดนำสิทธิ์ของพวกเขาออกแยกต่างหาก",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("ลงชื่อเข้าใช้หรือสร้างบัญชีเพื่อแก้ไข {name}", values),
  readOnlyShareLinkCreated: "สร้างลิงก์แชร์แบบอ่านอย่างเดียวแล้ว",
  readOnlyShareLinkCreatedAndCopied: "สร้างและคัดลอกลิงก์แชร์แบบอ่านอย่างเดียวแล้ว",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "สร้างลิงก์แชร์แล้ว เบราว์เซอร์บล็อกการคัดลอกอัตโนมัติ โปรดคัดลอกด้วยตนเอง",
  unableToCreateLink: "สร้างลิงก์ไม่ได้",
  shareLinkCopied: "คัดลอกลิงก์แชร์แล้ว",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "เบราว์เซอร์บล็อกการคัดลอก โปรดเปิดลิงก์แล้วคัดลอกจากแถบที่อยู่",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "ทุกคนที่มีลิงก์ดูค่าใช้จ่าย ยอดคงเหลือ และการชำระหนี้ได้โดยไม่ต้องลงชื่อเข้าใช้ แต่แก้ไขไม่ได้",
  readOnlyShareLinks: "ลิงก์แชร์แบบอ่านอย่างเดียว",
  createReadOnlyLink: "สร้างลิงก์แบบอ่านอย่างเดียว",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "ทุกคนที่มีลิงก์ดูค่าใช้จ่าย ยอดคงเหลือ และคำแนะนำการชำระหนี้ของกลุ่มนี้ได้ แต่เพิ่มหรือเปลี่ยนข้อมูลไม่ได้",
  createAShareLink: "สร้างลิงก์แชร์หรือไม่",
  createShareLink: "สร้างลิงก์แชร์",
  revoked: "เพิกถอนแล้ว",
  active: "ใช้งานอยู่",
  openLink: "เปิดลิงก์",
  copy: "คัดลอก",
  revokeLink: "เพิกถอนลิงก์",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "หลังเพิกถอน ลิงก์เดิมจะหยุดใช้งานทันที",
  shareLinkRevoked: "เพิกถอนลิงก์แชร์แล้ว",
  revokeThisShareLink: "เพิกถอนลิงก์แชร์นี้หรือไม่",
  revoke: "เพิกถอน",
  noShareLinksYet: "ยังไม่มีลิงก์แชร์",
  collaboratorAdded: "เพิ่มผู้ร่วมจัดการแล้ว",
  unableToAddCollaborator: "เพิ่มผู้ร่วมจัดการไม่ได้",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "ผู้ร่วมจัดการต้องเป็นผู้ใช้ที่มีอยู่แล้ว พวกเขาจัดการค่าใช้จ่ายและผู้ร่วมค่าใช้จ่ายได้ แต่จัดการการตั้งค่าของเจ้าของไม่ได้",
  existingUsersUsername: "ชื่อผู้ใช้ของผู้ใช้ที่มีอยู่",
  addCollaborator: "เพิ่มผู้ร่วมจัดการ",
  removeName: (values: MessageValues) => interpolate("นำ {name} ออก", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "บัญชีนี้จะจัดการกลุ่มไม่ได้อีก ข้อมูลค่าใช้จ่ายที่มีอยู่จะยังอยู่",
  collaboratorRemoved: "นำผู้ร่วมจัดการออกแล้ว",
  removeCollaborator: "นำผู้ร่วมจัดการออกหรือไม่",
  remove: "นำออก",
  dataAndExport: "ข้อมูลและการส่งออก",
  csvPrintBackupAndRestore: "CSV การพิมพ์ การสำรอง และการกู้คืน",
  exportingDoesNotChangeGroupData: "การส่งออกไม่เปลี่ยนข้อมูลกลุ่ม",
  exportAndPrint: "ส่งออกและพิมพ์",
  expenseCsvExported: "ส่งออก CSV ค่าใช้จ่ายแล้ว",
  exportExpenseCsv: "ส่งออก CSV ค่าใช้จ่าย",
  settlementCsvExported: "ส่งออก CSV การชำระหนี้แล้ว",
  exportSettlementCsv: "ส่งออก CSV การชำระหนี้",
  print: "พิมพ์",
  completeBackupDownloaded: "ดาวน์โหลดข้อมูลสำรองทั้งหมดแล้ว",
  downloadFailed: "ดาวน์โหลดไม่สำเร็จ",
  downloadCompleteBackup: "ดาวน์โหลดข้อมูลสำรองทั้งหมด",
  expenseCsvImported: "นำเข้า CSV ค่าใช้จ่ายแล้ว",
  importFailed: "นำเข้าไม่สำเร็จ",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "จะตรวจสอบทุกแถวก่อน หากแถวใดมีข้อผิดพลาด จะไม่มีการเขียนข้อมูลใดๆ",
  importExpenseCsv: "นำเข้า CSV ค่าใช้จ่าย",
  chooseCsv: "เลือก CSV",
  importPreview: "ตัวอย่างการนำเข้า",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate("นำเข้าได้ {rows} แถว มีข้อผิดพลาด {errors} รายการ", values),
  rowRowMessage: (values: MessageValues) =>
    interpolate("แถว {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate("นำเข้าค่าใช้จ่าย {count} รายการ", values),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      "จะเพิ่มค่าใช้จ่าย {count} รายการพร้อมกัน และคำนวณยอดคงเหลือใหม่",
      values,
    ),
  applyCsvImport: "ดำเนินการนำเข้า CSV หรือไม่",
  applyImport: "ดำเนินการนำเข้า",
  invalidBackupFormat: "รูปแบบข้อมูลสำรองไม่ถูกต้อง",
  backupRestoredAsANewGroup: "กู้คืนข้อมูลสำรองเป็นกลุ่มใหม่แล้ว",
  restoreFailed: "กู้คืนไม่สำเร็จ",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "การกู้คืนจะสร้างกลุ่มใหม่และไม่เขียนทับข้อมูลปัจจุบัน",
  restoreJsonBackup: "กู้คืนข้อมูลสำรอง JSON",
  chooseJsonBackup: "เลือกข้อมูลสำรอง JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("ตัวอย่างการกู้คืน: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "{people} คน · ค่าใช้จ่าย {expenses} รายการ · การชำระเงิน {payments} รายการ · สกุลเงินหลัก {currency}",
      values,
    ),
  createNewGroup: "สร้างกลุ่มใหม่",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) => interpolate("จะสร้างกลุ่มใหม่ชื่อ “{name}” โดยไม่เปลี่ยนกลุ่มที่มีอยู่", values),
  restoreThisBackup: "กู้คืนข้อมูลสำรองนี้หรือไม่",
  createNewGroup2: "สร้างกลุ่มใหม่",
  copyGroup: "ทำสำเนากลุ่ม",
  copyThisGroup: "ทำสำเนากลุ่มนี้หรือไม่",
  copyGroupDescription:
    "คัดลอกบุคคล สกุลเงินหลัก และอัตราที่กำหนดเองไปยังกลุ่มใหม่ ไม่คัดลอกค่าใช้จ่าย การชำระหนี้ ผู้ร่วมจัดการ และลิงก์แชร์ กลุ่มเดิมจะไม่เปลี่ยนแปลง",
  groupCopied: "ทำสำเนากลุ่มแล้ว",
  groupPreferences: "การกำหนดค่ากลุ่ม",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "การเปลี่ยนสกุลเงินหลักจะคำนวณยอดที่แสดงใหม่และล้างอัตราแลกเปลี่ยนที่กำหนดเอง",
  nameAndBaseCurrency: "ชื่อและสกุลเงินหลัก",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "ยอดใช้จ่ายทั้งหมดจะแสดงเป็น {amount} ยอดคงเหลือและการชำระหนี้ด้านล่างจะถูกแปลง",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      "คาดว่าจะมีคำแนะนำการชำระหนี้ {count} รายการ อัตราที่กำหนดเองจะกลับเป็นค่าเริ่มต้นของ Bank of Taiwan",
      values,
    ),
  cancelChanges: "ยกเลิกการเปลี่ยนแปลง",
  applyGroupPreferences: "ใช้การกำหนดค่ากลุ่ม",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "เปลี่ยนสกุลเงินหลักเป็น {currency} คำนวณผลทั้งหมดใหม่ และล้างอัตราที่กำหนดเอง",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("เปลี่ยนชื่อกลุ่มเป็น “{name}”", values),
  applyTheseChanges: "ใช้การเปลี่ยนแปลงเหล่านี้หรือไม่",
  applyChanges: "ใช้การเปลี่ยนแปลง",
  groupPreferencesApplied: "ใช้การกำหนดค่ากลุ่มแล้ว",
  saveFailed: "บันทึกไม่สำเร็จ",
  customExchangeRatesApplied: "ใช้อัตราแลกเปลี่ยนที่กำหนดเองแล้ว",
  unableToSaveExchangeRates: "บันทึกอัตราแลกเปลี่ยนไม่ได้",
  currencyConversion: "การแปลงสกุลเงิน",
  countCustomRates: (values: MessageValues) =>
    interpolate("อัตราที่กำหนดเอง {count} รายการ", values),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "กำหนดว่า 1 หน่วยของแต่ละสกุลเงินเท่ากับเท่าไรใน {currency} อัตราที่ไม่ได้กำหนดจะใช้อัตรากลางสปอตของ Bank of Taiwan โดยอัตโนมัติ",
        values,
      ),
  customExchangeRates: "อัตราแลกเปลี่ยนที่กำหนดเอง",
  bankOfTaiwanSpotMidRateDescription:
    "ค่าใช้จ่ายใหม่ที่ไม่มีอัตรากำหนดเองจะใช้อัตรากลางสปอตของ Bank of Taiwan และเก็บอัตรานั้นไว้ การล้างอัตรากำหนดเองมีผลกับค่าใช้จ่ายในอนาคต การชำระเงินยังใช้อัตราปัจจุบัน",
  loadBankOfTaiwanSpotMidRates: "โหลดอัตราเริ่มต้นของ Bank of Taiwan",
  loadingBankExchangeRates: "กำลังโหลดอัตราแลกเปลี่ยนธนาคาร…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate("โหลดอัตรากลางสปอตของ Bank of Taiwan แล้ว ({time})", values),
  bankOfTaiwanDefaultRatesApplied: "คืนค่าอัตราเริ่มต้นของ Bank of Taiwan แล้ว",
  unableToLoadBankExchangeRates:
    "อัตราแลกเปลี่ยนธนาคารไม่พร้อมใช้งานในขณะนี้ โปรดลองอีกครั้งภายหลัง",
  conversionPreview: "ตัวอย่างการแปลง",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      "ยอดใช้จ่ายทั้งหมด: {amount} · คำแนะนำการชำระหนี้ {count} รายการ",
      values,
    ),
  applyRates: "ใช้อัตรา",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "ค่าใช้จ่ายที่มีอยู่จะเก็บอัตราเดิมไว้ ค่าใช้จ่ายใหม่หรือที่ปรับราคาใหม่ และการชำระเงินที่มีอยู่จะใช้อัตราที่อัปเดต",
  applyCustomExchangeRates: "ใช้อัตราแลกเปลี่ยนที่กำหนดเองหรือไม่",
  restoreBankOfTaiwanDefaultRates: "คืนค่าอัตราเริ่มต้นของ Bank of Taiwan หรือไม่",
  apiWriteSettings: "สิทธิ์เขียนข้อมูลผ่าน API",
  apiWritesAllowed: "อนุญาต",
  apiWritesBlocked: "ไม่อนุญาต",
  apiWriteSettingsDescription:
    "ตามค่าเริ่มต้น โทเค็น API และ CLI เปลี่ยนกลุ่มนี้ไม่ได้ เมื่อเปิด สมาชิกที่มีโทเค็น API จะแก้ไขได้ตามสิทธิ์ของตน การดำเนินการผ่านเบราว์เซอร์ไม่ได้รับผลกระทบ",
  allowApiWrites: "อนุญาตการเปลี่ยนแปลงผ่านโทเค็น API",
  apiWriteSettingSaved: "อัปเดตสิทธิ์เขียนข้อมูลผ่าน API แล้ว",
  groupLifecycle: "วงจรการใช้งานกลุ่ม",
  archivedReadOnly: "เก็บถาวร · อ่านอย่างเดียว",
  active2: "ใช้งานอยู่",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "หลังกู้คืน จะเพิ่มและเปลี่ยนข้อมูลได้อีกครั้ง",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "การเก็บถาวรจะรักษาข้อมูลทั้งหมดไว้ แต่ทำให้กลุ่มอ่านได้อย่างเดียว",
  restoreGroup: "กู้คืนกลุ่ม",
  archiveGroup: "เก็บกลุ่มถาวร",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "หลังกู้คืน เจ้าของและผู้ร่วมจัดการจะแก้ไขข้อมูลได้อีกครั้ง",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "ค่าใช้จ่าย บุคคล และรายการชำระเงินจะยังอยู่ และเปลี่ยนไม่ได้ขณะเก็บถาวร",
  groupRestored: "กู้คืนกลุ่มแล้ว",
  groupArchived: "เก็บกลุ่มถาวรแล้ว",
  restoreThisGroup: "กู้คืนกลุ่มนี้หรือไม่",
  archiveThisGroup: "เก็บกลุ่มนี้ถาวรหรือไม่",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "การดำเนินการนี้จะลบบุคคล ค่าใช้จ่าย ใบเสร็จ และรายการชำระหนี้ทั้งหมดอย่างถาวร และย้อนกลับไม่ได้",
  deleteGroup: "ลบกลุ่ม",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("กรอก “{name}” เพื่อยืนยัน", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("ลบ “{name}” อย่างถาวร", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "การดำเนินการนี้ย้อนกลับไม่ได้ การยกเลิกจะไม่เปลี่ยนแปลงข้อมูลใดๆ",
  permanentlyDeleteThisGroup: "ลบกลุ่มนี้อย่างถาวรหรือไม่",
  permanentlyDeleteGroup: "ลบกลุ่มอย่างถาวร",
  groupDeleted: "ลบกลุ่มแล้ว",
  readOnlyShare: "การแชร์แบบอ่านอย่างเดียว",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "คุณดูค่าใช้จ่าย ยอดคงเหลือ และคำแนะนำการชำระหนี้ได้ แต่แก้ไขข้อมูลไม่ได้",
  completeExpenseHistory: "ประวัติค่าใช้จ่ายทั้งหมด",
  manageGroupSettings: "จัดการการตั้งค่ากลุ่ม",
  csvImportFailed: "นำเข้า CSV ไม่สำเร็จ",
  theCsvHasNoData: "CSV ไม่มีข้อมูล",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("คอลัมน์ที่ขาด: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("ไม่พบผู้ร่วมค่าใช้จ่าย: {name}", values),
  invalidJsonFormat: "รูปแบบ JSON ไม่ถูกต้อง",
  incorrectUsernameOrPassword: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  everyPersonNeedsAnAmountForACustomSplit:
    "ต้องระบุยอดเงินของทุกคนสำหรับการแบ่งแบบกำหนดเอง",
  unsupportedBackupVersion: "ไม่รองรับเวอร์ชันข้อมูลสำรองนี้",
  unsupportedSplitMethod: "ไม่รองรับวิธีแบ่งนี้",
  unsupportedExchangeRateCurrency: "ไม่รองรับสกุลเงินของอัตราแลกเปลี่ยนนี้",
  unsupportedBaseCurrency: "ไม่รองรับสกุลเงินหลักนี้",
  unsupportedCurrency: "ไม่รองรับสกุลเงินนี้",
  aParticipantCannotBeMergedIntoThemselves: "รวมผู้ร่วมค่าใช้จ่ายเข้ากับตนเองไม่ได้",
  theOwnerCannotBeRemoved: "นำเจ้าของออกไม่ได้",
  thePayerAndRecipientMustBeDifferent: "ผู้จ่ายและผู้รับต้องเป็นคนละคน",
  payerIsRequired: "ต้องระบุผู้จ่าย",
  thePayerMustBeAParticipant: "ผู้จ่ายต้องเป็นผู้ร่วมค่าใช้จ่าย",
  serverError: "ข้อผิดพลาดของเซิร์ฟเวอร์",
  invalidPaymentRecordsInBackup: "รายการชำระเงินในข้อมูลสำรองไม่ถูกต้อง",
  splitTotalsInBackupAreInvalid: "ยอดรวมการแบ่งในข้อมูลสำรองไม่ถูกต้อง",
  invalidSplitDataInBackup: "ข้อมูลการแบ่งในข้อมูลสำรองไม่ถูกต้อง",
  invalidExchangeRatesInBackup: "อัตราแลกเปลี่ยนในข้อมูลสำรองไม่ถูกต้อง",
  invalidParticipantDataInBackup: "ข้อมูลผู้ร่วมค่าใช้จ่ายในข้อมูลสำรองไม่ถูกต้อง",
  backupContainsDuplicateParticipants: "ข้อมูลสำรองมีผู้ร่วมค่าใช้จ่ายซ้ำกัน",
  invalidBaseCurrencyInBackup: "สกุลเงินหลักในข้อมูลสำรองไม่ถูกต้อง",
  invalidExpenseCategoryInBackup: "หมวดหมู่ค่าใช้จ่ายในข้อมูลสำรองไม่ถูกต้อง",
  anExpenseParticipantInTheBackupDoesNotExist:
    "ไม่มีผู้ร่วมค่าใช้จ่ายที่ระบุในค่าใช้จ่ายของข้อมูลสำรอง",
  anExpenseInTheBackupHasDuplicateParticipants:
    "ค่าใช้จ่ายในข้อมูลสำรองมีผู้ร่วมค่าใช้จ่ายซ้ำกัน",
  invalidExpenseDataInBackup: "ข้อมูลค่าใช้จ่ายในข้อมูลสำรองไม่ถูกต้อง",
  invalidExpenseTagsInBackup: "แท็กค่าใช้จ่ายในข้อมูลสำรองไม่ถูกต้อง",
  invalidTripNameInBackup: "ชื่อทริปในข้อมูลสำรองไม่ถูกต้อง",
  backupIsMissingItsTrip: "ข้อมูลสำรองไม่มีทริป",
  backupIsMissingParticipants: "ข้อมูลสำรองไม่มีผู้ร่วมค่าใช้จ่าย",
  backupIsMissingExpenses: "ข้อมูลสำรองไม่มีค่าใช้จ่าย",
  notesCanBeUpTo160Characters: "หมายเหตุมีได้ไม่เกิน 160 ตัวอักษร",
  theShareLinkIsInvalidOrHasBeenRevoked: "ลิงก์แชร์ไม่ถูกต้องหรือถูกเพิกถอนแล้ว",
  atLeastOneSplitParticipantIsRequired: "ต้องมีผู้แบ่งค่าใช้จ่ายอย่างน้อยหนึ่งคน",
  splitParticipantsMustBelongToTheTrip: "ผู้แบ่งค่าใช้จ่ายต้องอยู่ในทริปนี้",
  splitAmountsMustAddUpToTheExpenseAmount: "ยอดที่แบ่งรวมกันต้องเท่ากับยอดค่าใช้จ่าย",
  splitAmountsMustBeGreaterThan0: "ยอดที่แบ่งต้องมากกว่า 0",
  invalidSplitAmount: "ยอดที่แบ่งไม่ถูกต้อง",
  invalidCategoryOrTagFormat: "รูปแบบหมวดหมู่หรือแท็กไม่ถูกต้อง",
  exchangeRatesMustBeGreaterThan0: "อัตราแลกเปลี่ยนต้องมากกว่า 0",
  invalidExchangeRateFormat: "รูปแบบอัตราแลกเปลี่ยนไม่ถูกต้อง",
  aParticipantWithThisNameAlreadyExists: "มีผู้ร่วมค่าใช้จ่ายชื่อนี้อยู่แล้ว",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "ผู้ร่วมค่าใช้จ่ายคนนี้มีรายการชำระเงิน จึงลบไม่ได้",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "ผู้ร่วมค่าใช้จ่ายคนนี้มีค่าใช้จ่าย จึงลบไม่ได้",
  onlyTheOwnerCanDownloadACompleteBackup:
    "เฉพาะเจ้าของเท่านั้นที่ดาวน์โหลดข้อมูลสำรองทั้งหมดได้",
  onlyTheOwnerCanManageShareLinks: "เฉพาะเจ้าของเท่านั้นที่จัดการลิงก์แชร์ได้",
  onlyTheOwnerCanManageCollaborators: "เฉพาะเจ้าของเท่านั้นที่จัดการผู้ร่วมจัดการได้",
  onlyTheOwnerCanManageTripSettings: "เฉพาะเจ้าของเท่านั้นที่จัดการการตั้งค่าทริปได้",
  namesCanBeUpTo80Characters: "ชื่อมีได้ไม่เกิน 80 ตัวอักษร",
  passwordMustBeAtLeast8Characters3: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  invalidArchiveStatus: "สถานะการเก็บถาวรไม่ถูกต้อง",
  invalidApiWriteSetting: "การตั้งค่าสิทธิ์เขียนข้อมูลผ่าน API ไม่ถูกต้อง",
  onlyBrowserSessionsCanManageApiWrites:
    "เฉพาะเซสชันเบราว์เซอร์เท่านั้นที่จัดการสิทธิ์เขียนข้อมูลผ่าน API ได้",
  apiWritesDisabledForThisGroup: "กลุ่มนี้ไม่อนุญาตการเปลี่ยนแปลงผ่านโทเค็น API",
  apiEndpointNotFound: "ไม่พบปลายทาง API",
  paymentRecordNotFound: "ไม่พบรายการชำระเงิน",
  collaboratorNotFound: "ไม่พบผู้ร่วมจัดการ",
  participantNotFound: "ไม่พบผู้ร่วมค่าใช้จ่าย",
  noActiveShareLinkWasFound: "ไม่พบลิงก์แชร์ที่ใช้งานอยู่",
  expenseNotFound: "ไม่พบค่าใช้จ่าย",
  receiptNotFound: "ไม่พบใบเสร็จ",
  tripNotFound: "ไม่พบทริป",
  userNotFound: "ไม่พบผู้ใช้",
  descriptionMustBe1120Characters: "คำอธิบายต้องมี 1–120 ตัวอักษร",
  theOwnerIsAlreadyInTheCollaboratorList: "เจ้าของอยู่ในรายชื่อผู้ร่วมจัดการแล้ว",
  thisGroupIsArchivedRestoreItBeforeEditing: "กลุ่มนี้เก็บถาวรแล้ว โปรดกู้คืนก่อนแก้ไข",
  receiptsMustBeJpegPngOrWebpImages: "ใบเสร็จต้องเป็นรูปภาพ JPEG, PNG หรือ WebP",
  theRecipientMustBeAParticipant: "ผู้รับต้องเป็นผู้ร่วมค่าใช้จ่าย",
  aTripWithThisNameAlreadyExists: "มีทริปชื่อนี้อยู่แล้ว",
  dateMustUseTheYyyyMmDdFormat: "วันที่ต้องใช้รูปแบบ YYYY-MM-DD",
  upTo10TagsAreAllowed: "อนุญาตให้มีแท็กได้ไม่เกิน 10 แท็ก",
  tagsCanBeUpTo24Characters: "แท็กมีได้ไม่เกิน 24 ตัวอักษร",
  invalidTagFormat: "รูปแบบแท็กไม่ถูกต้อง",
  theTargetParticipantMustBelongToTheTrip: "ผู้ร่วมค่าใช้จ่ายปลายทางต้องอยู่ในทริปนี้",
  signInFirst: "ลงชื่อเข้าใช้ก่อน",
  provideExpenseChanges: "ระบุการเปลี่ยนแปลงค่าใช้จ่าย",
  provideTripChanges: "ระบุการเปลี่ยนแปลงทริป",
  requestBodyIsTooLarge: "เนื้อหาคำขอมีขนาดใหญ่เกินไป",
  selectAtLeastOneSplitParticipant: "เลือกผู้แบ่งค่าใช้จ่ายอย่างน้อยหนึ่งคน",
  enterATripNameOf1100Characters: "กรอกชื่อทริป 1–100 ตัวอักษร",
  enterAnExpenseDescriptionOf1120Characters: "กรอกคำอธิบายค่าใช้จ่าย 1–120 ตัวอักษร",
  enterAParticipantNameOf180Characters: "กรอกชื่อผู้ร่วมค่าใช้จ่าย 1–80 ตัวอักษร",
  enterAUsernameAndPassword: "กรอกชื่อผู้ใช้และรหัสผ่าน",
  enterSplitValues: "กรอกค่าการแบ่ง",
  enterAValidPaymentDate: "กรอกวันที่ชำระเงินที่ถูกต้อง",
  enterValidSplitShares: "กรอกสัดส่วนการแบ่งที่ถูกต้อง",
  enterValidSplitPercentages: "กรอกเปอร์เซ็นต์การแบ่งที่ถูกต้อง",
  enterValidSplitAmounts: "กรอกยอดที่แบ่งที่ถูกต้อง",
  enterAValidExpenseDate: "กรอกวันที่ค่าใช้จ่ายที่ถูกต้อง",
  chooseACsvFile: "เลือกไฟล์ CSV",
  selectSplitParticipants: "เลือกผู้แบ่งค่าใช้จ่าย",
  chooseAReceiptImage: "เลือกรูปใบเสร็จ",
  thisUserIsAlreadyACollaborator: "ผู้ใช้นี้เป็นผู้ร่วมจัดการอยู่แล้ว",
  thisUsernameIsAlreadyRegistered: "ชื่อผู้ใช้นี้ลงทะเบียนแล้ว",
  usernameIsBeingRegisteredOrAlreadyRegistered: "ชื่อผู้ใช้นี้กำลังลงทะเบียนหรือมีผู้ใช้แล้ว",
  usernameIsBeingRegistered: "ชื่อผู้ใช้นี้กำลังลงทะเบียน",
  usernameOrPasskeyAlreadyRegistered: "ชื่อผู้ใช้หรือ Passkey นี้ลงทะเบียนแล้ว",
  invalidAmount: "ยอดเงินไม่ถูกต้อง",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "เปลี่ยนชื่อผู้ใช้ของบัญชีเริ่มต้นสำหรับการพัฒนาไม่ได้",
  language: "ภาษา",
  english: "อังกฤษ",
  traditionalChinese: "จีนตัวเต็ม",
};
