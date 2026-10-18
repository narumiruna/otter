import {
  type CatalogShape,
  interpolate,
  type MessageValues,
} from "./message-types.js";
import { thAuth } from "./messages-th-auth.js";
import { thExpenses } from "./messages-th-expenses.js";
import { thGroups } from "./messages-th-groups.js";
import { thSettings } from "./messages-th-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const th = {
  ...thAuth,
  ...thGroups,
  ...thExpenses,
  ...thSettings,
  browserExpenseDefaults: "ค่าเริ่มต้นของค่าใช้จ่ายในเบราว์เซอร์นี้",
  browserExpenseDefaultsHelp:
    "ล้างเฉพาะค่าเริ่มต้นของสกุลเงินและการแบ่งค่าใช้จ่ายของบัญชีนี้สำหรับกลุ่มนี้ บัญชี การลงชื่อเข้าใช้ และสิทธิ์จะไม่เปลี่ยนแปลง",
  clearPersonalPreferences: "ล้างค่าเริ่มต้นของค่าใช้จ่ายสำหรับกลุ่มนี้",
  expenseDefaultsCleared: "ล้างค่าเริ่มต้นของค่าใช้จ่ายสำหรับกลุ่มนี้แล้ว",
  personalPreferencesChanged:
    "การตั้งค่าการแบ่งค่าใช้จ่ายของคุณไม่พร้อมใช้งานแล้ว ขณะนี้ใช้ค่าเริ่มต้นที่ถูกต้อง โปรดเลือกอีกครั้ง",
  personalStorageFailed:
    "บันทึกค่าเริ่มต้นของค่าใช้จ่ายไม่ได้ การตั้งค่าปัจจุบันยังใช้ได้ แต่อาจหายไปเมื่อเปิดหน้านี้อีกครั้ง",
  rememberExpenseDefaults: "จดจำการตั้งค่าสกุลเงินและการแบ่งค่าใช้จ่าย",
  expenseDefaultsRemembered: "บันทึกการตั้งค่าสกุลเงินและการแบ่งค่าใช้จ่ายสำหรับกลุ่มนี้แล้ว",
  deleteExpense: "ลบค่าใช้จ่าย",
  copyExpense: "คัดลอกเป็นค่าใช้จ่ายใหม่",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("คัดลอก {name} เป็นค่าใช้จ่ายใหม่", values),
  memberAccounts: "บัญชีของสมาชิก",
  accountPaid: "จ่ายแล้ว",
  accountShared: "ส่วนที่รับผิดชอบ",
  accountBalance: "ต้องรับ / ต้องจ่าย",
  accountReceivable: "ต้องรับ",
  accountPayable: "ต้องจ่าย",
  accountSettled: "ชำระครบแล้ว",
  accountPaidHelp:
    "ยอดจ่ายแล้วคือเงินที่จ่ายให้ร้านค้าและผู้ให้บริการรายอื่น ไม่รวมการชำระหนี้ระหว่างสมาชิก",
  accountTotalsHelp:
    "ส่วนที่รับผิดชอบคือยอดค่าใช้จ่ายที่สมาชิกแต่ละคนต้องรับผิดชอบ ยอดคงเหลือรวมการชำระเงินที่บันทึกไว้และการปรับยอดของตัวแทนด้วย ไม่รวมฉบับร่างที่ยังไม่ซิงค์",
  accountDetails: "ดูรายละเอียด",
  accountPaidExpenses: "ค่าใช้จ่ายที่จ่ายแทนกลุ่ม",
  accountSharedExpenses: "ค่าใช้จ่ายร่วมกัน",
  accountExpenseTotal: "ยอดรวมค่าใช้จ่ายเต็มจำนวน",
  accountPayments: "การชำระเงินที่ส่ง / ได้รับ",
  accountPaymentSent: "ส่งแล้ว",
  accountPaymentReceived: "ได้รับแล้ว",
  accountAdjustments: "การปรับยอดของตัวแทน",
  accountDetailsUnavailable:
    "ข้อมูลที่แชร์นี้ไม่มีรายละเอียดการชำระเงิน ยอดคงเหลือใช้ผลการคำนวณของกลุ่ม",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} ชำระหนี้แทนสมาชิกคนนี้ ยอดคงเหลือเป็นศูนย์ไม่ได้หมายความว่าสมาชิกคนนี้ได้ชำระเงินแล้ว",
      values,
    ),
  visaSettlementTitle: "การชำระหนี้ตามอัตรา Visa",
  visaSettlementCurrency: "สกุลเงินสำหรับชำระหนี้",
  visaSettlementEnable:
    "แปลงค่าใช้จ่ายทั้งหมดด้วยอัตรา Visa ตามวันที่ และชำระหนี้ด้วยสกุลเงินที่เลือก",
  visaSettlementHelp:
    "ปิดไว้ตามค่าเริ่มต้น ยอดเดิมจะไม่เปลี่ยนแปลง เมื่อเปิด จะบันทึกอัตรา Visa ตามวันที่ของแต่ละค่าใช้จ่าย และใช้สกุลเงินที่เลือกสำหรับยอดคงเหลือและการชำระหนี้ ใช้กับค่าใช้จ่ายทั้งหมดรวมถึงเงินสด โดยไม่รวมค่าธรรมเนียมธนาคาร อัตรา Visa เป็นค่าประมาณ ยอดเรียกเก็บบัตรอาจต่างกัน การชำระเงินที่มีอยู่ต้องใช้สกุลเงินที่เลือกก่อนเปิดหรือเปลี่ยนสกุลเงิน",
  visaSettlementSaved: "บันทึกการตั้งค่าการชำระหนี้ตามอัตรา Visa แล้ว",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("เปิด · {currency}", values),
  visaSettlementOff: "ปิด",
  visaRateLabel: "Visa",
  visaSettingInvalid: "การตั้งค่าการชำระหนี้ตามอัตรา Visa ไม่ถูกต้อง",
  visaIncompatiblePayments: "รายการชำระเงินที่มีอยู่ต้องใช้สกุลเงินสำหรับชำระหนี้ที่เลือก",
  visaSettingUnavailable:
    "อัตรา Visa ไม่พร้อมใช้งาน การตั้งค่ายังไม่เปลี่ยนแปลง โปรดลองอีกครั้งภายหลัง",
  visaPaymentCurrency: "การชำระหนี้ตามอัตรา Visa ต้องใช้สกุลเงินที่เลือก",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "อัตรา Visa {currency}/{target} สำหรับวันที่ {date} ไม่พร้อมใช้งาน โปรดลองอีกครั้งภายหลัง",
      values,
    ),
  offlineQueueBanner:
    "ออฟไลน์: ข้อมูลที่โหลดแล้วยังใช้งานได้ บันทึกค่าใช้จ่ายใหม่บนอุปกรณ์นี้ได้ การแก้ไขอื่นต้องเชื่อมต่ออินเทอร์เน็ต",
  queueSave: "บันทึกบนอุปกรณ์นี้",
  queueSaved: "บันทึกบนอุปกรณ์นี้แล้ว ยังไม่รวมในยอดคงเหลือ อัตราแลกเปลี่ยนจะกำหนดเมื่อซิงค์",
  queueStorageError: "บันทึกบนอุปกรณ์นี้ไม่ได้ โปรดเปิดหน้านี้ไว้และลองอีกครั้ง",
  queueTitle: "ค่าใช้จ่ายที่ยังไม่ซิงค์",
  queueNotice:
    "อยู่บนอุปกรณ์นี้เท่านั้น ไม่รวมในยอดคงเหลือ อัตราแลกเปลี่ยนจะกำหนดขณะซิงค์ การล้างข้อมูลเบราว์เซอร์จะทำให้ฉบับร่างเหล่านี้หายไป",
  queuePending: "รอซิงค์",
  queueAttempted: "การซิงค์กำลังรอการยืนยัน โปรดคงคำขอเดิมไว้โดยไม่เปลี่ยนแปลง",
  queueConflict:
    "หยุดซิงค์แล้ว ตรวจสอบสิทธิ์เข้าถึงและผู้ร่วมค่าใช้จ่ายก่อนลองอีกครั้ง คำขอเดิมยังคงอยู่",
  queueInvalid: "ยังไม่ได้บันทึกรายการ แก้ไขฉบับร่างแล้วลองอีกครั้ง",
  queueEdit: "แก้ไขฉบับร่าง",
  queueRetry: "ลองส่งคำขอเดิมอีกครั้ง",
  queueDelete: "ลบฉบับร่างบนอุปกรณ์",
  queueDeleteConfirm:
    "ลบฉบับร่างบนอุปกรณ์นี้หรือไม่ คำขอที่ส่งไปแล้วอาจถูกบันทึกบนเซิร์ฟเวอร์ โปรดตรวจสอบกลุ่มก่อน",
  queueCount: (values: MessageValues) =>
    interpolate("ค่าใช้จ่ายที่ยังไม่ซิงค์บนอุปกรณ์นี้ {count} รายการ", values),
  queueSyncPricing:
    "ตัวอย่างแสดงเฉพาะสกุลเงินเดิม เซิร์ฟเวอร์จะกำหนดอัตราแลกเปลี่ยนขณะซิงค์",
  queueOrphanTitle: "ฉบับร่างจากกลุ่มที่เข้าถึงไม่ได้",
  queueOrphanNotice:
    "เข้าถึงกลุ่มเหล่านี้ไม่ได้แล้ว คำขอที่ส่งไปอาจถูกบันทึกไว้ โปรดตรวจสอบก่อนลบสำเนาบนอุปกรณ์",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID กลุ่ม: {id}", values),
  accountSettings: "การตั้งค่าบัญชี",
  manageYourUsernameAndPasskeys: "จัดการรูปลักษณ์ ภาษา ชื่อผู้ใช้ Passkey และโทเค็น API",
  appearance: "รูปลักษณ์",
  chooseHowOtterLooksOnThisBrowser:
    "เลือกรูปลักษณ์ของ Otter การเปลี่ยนแปลงมีผลทันทีและบันทึกในเบราว์เซอร์นี้",
  colorTheme: "ธีมสี",
  forestTheme: "ป่าไม้",
  oceanTheme: "มหาสมุทร",
  lavenderTheme: "ลาเวนเดอร์",
  sunsetTheme: "พระอาทิตย์ตก",
  roseTheme: "กุหลาบ",
  displayMode: "โหมดการแสดงผล",
  systemMode: "ตามระบบ",
  lightMode: "สว่าง",
  darkMode: "มืด",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "ใช้ชื่อผู้ใช้ใหม่ในการลงชื่อเข้าใช้ครั้งถัดไป เซสชันปัจจุบันจะดำเนินต่อไป",
  passkeys: "Passkey",
  useAPasskeyToSignInWithoutYourPassword:
    "ใช้การปลดล็อกอุปกรณ์เพื่อลงชื่อเข้าใช้โดยไม่ต้องกรอกรหัสผ่าน",
  unableToLoadPasskeys: "โหลด Passkey ไม่ได้",
  unableToAddPasskey: "เพิ่ม Passkey ไม่ได้ หากคุณยกเลิก โปรดลองอีกครั้ง",
  unableToRemovePasskey: "นำ Passkey ออกไม่ได้",
  passkeyAdded: "เพิ่ม Passkey แล้ว",
  passkeyRemoved: "นำ Passkey ออกแล้ว",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("เพิ่มเมื่อ {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("นำ Passkey {number} ออก", values),
  noPasskeysAdded: "ยังไม่ได้เพิ่ม Passkey",
  addingPasskey: "กำลังเพิ่ม Passkey…",
  addPasskey: "เพิ่ม Passkey",
  thisBrowserDoesNotSupportPasskeys: "เบราว์เซอร์นี้ไม่รองรับ Passkey",
  apiTokens: "โทเค็น API",
  useApiTokensWithTheOtterCli:
    "สร้างโทเค็น Bearer สำหรับ Otter CLI หรือเครื่องมืออัตโนมัติ",
  loadingApiTokens: "กำลังโหลดโทเค็น API…",
  unableToLoadApiTokens: "โหลดโทเค็น API ไม่ได้",
  unableToCreateApiToken: "สร้างโทเค็น API ไม่ได้",
  apiTokenCreationUncertain:
    "ไม่ทราบผลของคำขอโทเค็น โปรดลองคำขอนี้อีกครั้งก่อนสร้างคำขอใหม่",
  retryApiTokenCreation: "ลองสร้างโทเค็นอีกครั้ง",
  unableToRevokeApiToken: "เพิกถอนโทเค็น API ไม่ได้",
  unableToCopyApiToken: "คัดลอกโทเค็น API ไม่ได้",
  apiTokenRevoked: "เพิกถอนโทเค็น API แล้ว",
  apiTokenCopied: "คัดลอกโทเค็น API แล้ว",
  enterATokenName: "กรอกชื่อโทเค็น",
  newApiToken: "โทเค็น API ใหม่",
  copyYourApiTokenNow: "คัดลอกโทเค็น API ของคุณตอนนี้",
  apiTokenShownOnce: "โทเค็นนี้จะแสดงเพียงครั้งเดียว คุณจะดูอีกไม่ได้หลังออกจากหน้านี้",
  copyToken: "คัดลอกโทเค็น",
  done: "เสร็จสิ้น",
  tokenName: "ชื่อโทเค็น",
  tokenNameExample: "ตัวอย่าง: ระบบอัตโนมัติสำหรับการเดินทาง",
  creatingApiToken: "กำลังสร้างโทเค็น…",
  createApiToken: "สร้างโทเค็น API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("สร้างเมื่อ {created} · หมดอายุ {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('เพิกถอนโทเค็น API "{name}"', values),
  noActiveApiTokens: "ไม่มีโทเค็น API ที่ใช้งานอยู่",
  apiTokensExpireAfter90Days:
    "โทเค็นหมดอายุหลัง 90 วัน หากต้องการใช้กับ CLI ให้ตั้งค่าเป็น",
  welcomeBackEyebrow: "ยินดีต้อนรับกลับ",
  startNewJourneyEyebrow: "เริ่มการเดินทางครั้งใหม่",
  parchmentTheme: "กระดาษเก่า",
  expenseTotalLabel: "รวม",
  expenseSplitSection: "แบ่งค่าใช้จ่ายระหว่างบุคคล",
  expenseSplitHelp: "เลือกผู้ที่จะแบ่งค่าใช้จ่ายนี้ เลือกวิธี แล้วดูผลลัพธ์",
  expenseTagPlaceholder: "เพิ่มแท็ก…",
  addShort: "เพิ่ม",
  settingsShort: "การตั้งค่า",
  close: "ปิด",
  groupDetails: "รายละเอียดกลุ่ม",
  filters: "ตัวกรอง",
  viewAll: "ดูทั้งหมด",
  personLabel: "บุคคล",
  preferencesLabel: "การกำหนดค่า",
  profileLabel: "โปรไฟล์",
  securityLabel: "ความปลอดภัย",
  backToGroups: "กลับไปยังกลุ่ม",
  createdLabel: "สร้างเมื่อ",
  statusLabel: "สถานะ",
  peopleDeletionHelp:
    "ลบบุคคลที่ใช้อยู่ในบัญชีรายการไม่ได้ ตรวจสอบข้อจำกัดของแต่ละคนด้วยปุ่มข้อมูล หรือรวมบุคคลที่ซ้ำกัน",
  personRestriction: (values: MessageValues) =>
    interpolate("ข้อจำกัดในการลบ {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("เป็นตัวแทนของ {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("ดูยอดเงินและอัตราแลกเปลี่ยนสำหรับ {name}", values),
  rateUnavailable: "ไม่มีอัตราแลกเปลี่ยน (ข้อมูลรุ่นเก่า)",
  expenseHistory: "ประวัติการเปลี่ยนแปลง",
  expenseHistoryDescription:
    "การแก้ไข ลบ และกู้คืนค่าใช้จ่าย ไม่ใช่ประวัติการชำระเงินหรือยอดคงเหลือในอดีต",
  expenseHistoryEmpty: "ยังไม่มีการเปลี่ยนแปลงที่บันทึกไว้",
  expenseHistoryMore: "โหลดการเปลี่ยนแปลงเพิ่มเติม",
  expenseHistoryCreated: "สร้างแล้ว",
  expenseHistoryUpdated: "แก้ไขแล้ว",
  expenseHistoryDeleted: "ลบแล้ว",
  expenseHistoryRestored: "กู้คืนแล้ว",
  expenseHistoryBaseline: "ภาพรวมเริ่มต้น",
  expenseHistorySystem: "ระบบ",
  expenseHistoryBaselineNotice:
    "สถานะเมื่อเปิดใช้ประวัติ ไม่ทราบการเปลี่ยนแปลงก่อนหน้านั้นและผู้สร้างเดิม",
  expenseHistoryReceiptNotice:
    "เก็บไว้เฉพาะข้อมูลเมตาของใบเสร็จ รูปภาพเดิมไม่พร้อมใช้งาน",
  expenseHistoryShares: "ยอดที่แบ่ง",
  expenseHistoryRate: "ข้อมูลอัตราแลกเปลี่ยน ณ เวลานั้น",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "กำหนดเองสำหรับกลุ่ม",
  expenseHistoryRateFixed: "อัตราคงที่ในระบบ",
  expenseHistoryRateLegacy: "ค่าประมาณรุ่นเก่า",
  expenseHistoryRateTimeUnavailable: "ไม่มีเวลาของอัตราแลกเปลี่ยน",
  expenseHistoryRateUnavailable: "รุ่นเก่า: ไม่ได้บันทึกอัตราไว้",
  expenseHistoryBefore: "ก่อนเปลี่ยนแปลง",
  expenseHistoryAfter: "หลังเปลี่ยนแปลง",
  expenseHistorySourceExpense: "การดำเนินการกับค่าใช้จ่าย",
  expenseHistorySourceCsv: "การนำเข้า CSV",
  expenseHistorySourceRestore: "การกู้คืนข้อมูลสำรอง",
  expenseHistorySourceMerge: "การรวมผู้ร่วมค่าใช้จ่าย",
  expenseHistorySourceReceipt: "การดำเนินการกับใบเสร็จ",
  expenseHistorySourceSeed: "ข้อมูลทดสอบสำหรับการพัฒนา",
  expenseHistorySourceMigration: "การย้ายข้อมูล",
  expenseHistorySourceVersionRestore: "การกู้คืนเวอร์ชัน",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("กู้คืน v{version}", values),
  expenseRestoreTitle: "กู้คืนเวอร์ชันค่าใช้จ่าย",
  expenseRestoreDescription:
    "ตรวจสอบค่าใช้จ่ายปัจจุบันและเวอร์ชันที่จะกู้คืน การกู้คืนจะเพิ่มเวอร์ชันใหม่ ประวัติหลังจากเวอร์ชันนั้นยังคงดูได้",
  expenseRestoreKeepsReceipt: "ใบเสร็จปัจจุบันจะยังแนบอยู่ รูปภาพใบเสร็จเก่าจะไม่ถูกกู้คืน",
  expenseRestoreNoReceipt:
    "ค่าใช้จ่ายที่ถูกลบจะกลับมาโดยไม่มีใบเสร็จ รูปภาพใบเสร็จเก่าจะไม่ถูกกู้คืน",
  expenseRestoreMissingPerson:
    "เวอร์ชันนี้อ้างถึงบุคคลที่ไม่อยู่ในกลุ่มแล้ว โปรดแก้ไขค่าใช้จ่ายด้วยตนเองแทน",
  expenseRestoreUnavailable: "กู้คืนค่าใช้จ่ายนี้ไม่ได้ โปรดโหลดใหม่แล้วลองอีกครั้ง",
  expenseRestoreConflict:
    "ค่าใช้จ่ายเปลี่ยนแปลงแล้ว โปรดตรวจสอบสถานะล่าสุดก่อนยืนยันอีกครั้ง",
  expenseRestoreConfirm: "กู้คืนเวอร์ชันนี้",
  expenseRestored: "กู้คืนเวอร์ชันค่าใช้จ่ายแล้ว",
  expenseConflictParticipantsChanged:
    "รายชื่อบุคคลเปลี่ยนแปลงแล้ว การยืนยันจะแทนที่ผู้จ่ายหรือผู้แบ่งค่าใช้จ่ายที่ไม่พร้อมใช้งานด้วยการตั้งค่าจากค่าใช้จ่ายล่าสุด ช่องอื่นในฉบับร่างจะยังอยู่ โปรดตรวจสอบยอดที่แบ่งก่อนบันทึก",
  expenseVersionConflict:
    "ค่าใช้จ่ายนี้เปลี่ยนแปลงแล้ว โปรดตรวจสอบเวอร์ชันล่าสุดก่อนยืนยันอีกครั้ง",
  expenseVersionMissing: "โปรดระบุเวอร์ชันค่าใช้จ่าย โหลดใหม่แล้วลองอีกครั้ง",
  expenseVersionInvalid: "เวอร์ชันค่าใช้จ่ายไม่ถูกต้อง",
  reviewLatestExpense: "ตรวจสอบค่าใช้จ่ายล่าสุด",
  confirmLatestExpenseVersion: "ตรวจสอบเวอร์ชันล่าสุดแล้ว เก็บฉบับร่างของฉันและแก้ไขต่อ",
  latestExpenseMissing: "ค่าใช้จ่ายนี้ถูกลบหรือเข้าถึงไม่ได้แล้ว ฉบับร่างของคุณยังอยู่แต่บันทึกไม่ได้",
  deleteExpenseHistoryRetained:
    "ค่าใช้จ่ายจะถูกนำออกจากบัญชีรายการปัจจุบัน และจะคำนวณยอดคงเหลือใหม่ ประวัติการเปลี่ยนแปลงยังคงอยู่ คุณกู้คืนเวอร์ชันเก่าได้โดยไม่มีรูปภาพใบเสร็จเก่า",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("ประวัติการเปลี่ยนแปลง: {name}", values),
} satisfies CatalogShape<typeof zhTW>;
