import { interpolate, type MessageValues } from "./message-types.js";

export const thExpenses = {
  allCurrencies: "ทุกสกุลเงิน",
  category: "หมวดหมู่",
  allCategories: "ทุกหมวดหมู่",
  tag: "แท็ก",
  exactTag: "แท็กตรงกันทั้งหมด",
  applied: "ใช้อยู่:",
  clearAll: "ล้างทั้งหมด",
  allPeople: "ทุกคน",
  categoryValue: (values: MessageValues) =>
    interpolate("หมวดหมู่: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("สกุลเงิน: {value}", values),
  fromValue: (values: MessageValues) => interpolate("จาก: {value}", values),
  toValue: (values: MessageValues) => interpolate("ถึง: {value}", values),
  tagValue: (values: MessageValues) => interpolate("แท็ก: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "ประวัติทั้งหมดจะปรากฏที่นี่หลังบันทึกค่าใช้จ่ายร่วมกันรายการแรก",
  recordFirstExpense: "บันทึกค่าใช้จ่ายแรก",
  noMatchingExpenses: "ไม่มีค่าใช้จ่ายที่ตรงกัน",
  adjustOrClearTheFiltersToSeeAllExpenses: "ปรับหรือล้างตัวกรองเพื่อดูค่าใช้จ่ายทั้งหมด",
  clearFilters: "ล้างตัวกรอง",
  filteredExpenses: "ค่าใช้จ่ายที่กรองแล้ว",
  allExpenses: "ค่าใช้จ่ายทั้งหมด",
  columns: "คอลัมน์",
  chooseExpenseColumns: "เลือกคอลัมน์ค่าใช้จ่าย",
  expenseName: "ค่าใช้จ่าย",
  splitParticipants: "ผู้แบ่งจ่าย",
  receipt: "ใบเสร็จ",
  tags: "แท็ก",
  restoreDefaults: "คืนค่าเริ่มต้น",
  actions: "การดำเนินการ",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate("ค่าใช้จ่าย {count} รายการ · {total}", values),
  countPeople: (values: MessageValues) => interpolate("{count} คน", values),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("ดูใบเสร็จสำหรับ {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("ใบเสร็จสำหรับ “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("รูปใบเสร็จสำหรับ {name}", values),
  closeReceiptPreviewHint: "คลิกรูปภาพหรือกด Esc เพื่อปิด",
  closeReceiptPreview: "ปิดตัวอย่างใบเสร็จ",
  openOriginalReceipt: "เปิดรูปภาพต้นฉบับ",
  moreActionsForName: (values: MessageValues) =>
    interpolate("การดำเนินการเพิ่มเติมสำหรับ {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · จ่ายโดย {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("แบ่งกับ {split}", values),
  edit: "แก้ไข",
  receiptUploadFailed: "อัปโหลดใบเสร็จไม่สำเร็จ",
  receiptUploaded: "อัปโหลดใบเสร็จแล้ว",
  uploading: "กำลังอัปโหลด…",
  uploadReceipt: "อัปโหลดใบเสร็จ",
  receiptFileRequirements: "JPEG, PNG หรือ WebP · ไม่เกิน 5 MB",
  selectReceiptPhoto: "อัปโหลดรูปภาพ",
  takeReceiptPhoto: "ถ่ายรูป",
  removeReceiptPhoto: "นำรูปภาพออก",
  receiptOnlineOnly:
    "ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อใช้รูปภาพ ฉบับร่างออฟไลน์ไม่เก็บรูปภาพ โปรดนำรูปภาพออกหรือเชื่อมต่อใหม่ก่อน",
  receiptFileTooLarge: "รูปภาพต้องมีขนาดไม่เกิน 5 MB",
  expenseSavedReceiptFailed:
    "สร้างค่าใช้จ่ายแล้ว แต่อัปโหลดใบเสร็จไม่สำเร็จ ลองอีกครั้งตอนนี้ หรือเพิ่มภายหลังจากรายการค่าใช้จ่าย",
  retryReceiptUpload: "ลองอัปโหลดใบเสร็จอีกครั้ง",
  receiptAlreadyAttached:
    "ค่าใช้จ่ายนี้มีใบเสร็จอยู่แล้ว โปรดตรวจสอบจากรายการค่าใช้จ่าย ระบบจะไม่เขียนทับโดยอัตโนมัติ",
  uploadReceiptLater: "อัปโหลดภายหลัง",
  expenseCreationUncertain:
    "ยืนยันไม่ได้ว่าสร้างค่าใช้จ่ายแล้วหรือไม่ โปรดตรวจสอบรายการค่าใช้จ่ายก่อนเพิ่มอีกครั้ง อย่าลองใหม่ทันที",
  viewReceipt: "ดูใบเสร็จ",
  noReceipt: "ไม่มีใบเสร็จ",
  deleteReceipt: "ลบใบเสร็จ",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "คุณอัปโหลดใบเสร็จอื่นภายหลังได้ ค่าใช้จ่ายจะไม่ถูกลบ",
  receiptDeleted: "ลบใบเสร็จแล้ว",
  deleteThisReceipt: "ลบใบเสร็จนี้หรือไม่",
  deleteName: (values: MessageValues) => interpolate("ลบ “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "การดำเนินการนี้ย้อนกลับไม่ได้ จะคำนวณยอดคงเหลือและคำแนะนำการชำระหนี้ทั้งหมดใหม่",
  expenseDeleted: "ลบค่าใช้จ่ายแล้ว",
  deleteThisExpense: "ลบค่าใช้จ่ายนี้หรือไม่",
  invalidSplitFormat: "รูปแบบการแบ่งไม่ถูกต้อง",
  selectAtLeastOnePersonToSplitWith: "เลือกผู้ที่จะแบ่งค่าใช้จ่ายด้วยอย่างน้อยหนึ่งคน",
  expenseChangesSaved: "บันทึกการเปลี่ยนแปลงค่าใช้จ่ายแล้ว",
  expenseRecorded: "บันทึกค่าใช้จ่ายแล้ว",
  unableToSaveExpense: "บันทึกค่าใช้จ่ายไม่ได้",
  reviewTheSplitPreviewBeforeSavingChanges:
    "ตรวจสอบตัวอย่างการแบ่งก่อนบันทึกการเปลี่ยนแปลง",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "กรอกรายละเอียดที่จำเป็นก่อน การแบ่งแบบกำหนดเองและแท็กอยู่ด้านล่าง",
  editExpense: "แก้ไขค่าใช้จ่าย",
  addExpense2: "เพิ่มค่าใช้จ่าย",
  discardDraft: "ทิ้งฉบับร่าง",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "การเปลี่ยนแปลงที่ยังไม่บันทึกจะหายไป ข้อมูลที่มีอยู่จะไม่เปลี่ยนแปลง",
  discardThisDraft: "ทิ้งฉบับร่างนี้หรือไม่",
  description: "คำอธิบาย",
  dinnerHotelTrainTickets: "มื้อค่ำ โรงแรม ตั๋วรถไฟ",
  enterAnExpenseDescription: "กรอกคำอธิบายค่าใช้จ่าย",
  amount: "ยอดเงิน",
  enterAnExpenseAmount: "กรอกยอดค่าใช้จ่าย",
  date: "วันที่",
  currency2: "สกุลเงิน",
  splitPreview: "ตัวอย่างการแบ่ง",
  enterAnAmountToPreviewEachPersonsShare:
    "กรอกยอดเงินเพื่อดูตัวอย่างส่วนที่แต่ละคนรับผิดชอบ",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} จ่าย {amount}", values),
  changePeopleAndSplitMethod: "เปลี่ยนบุคคลและวิธีแบ่ง",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("เลือกแล้ว {selected} จาก {total}", values),
  selectAll: "เลือกทั้งหมด",
  clear: "ล้าง",
  splitMethod: "วิธีแบ่ง",
  splitEqually: "แบ่งเท่ากัน",
  exactAmounts: "ยอดเงินที่ระบุ",
  percentages: "เปอร์เซ็นต์",
  shares: "สัดส่วน",
  nameSKind: (values: MessageValues) =>
    interpolate("{kind} ของ {name}", values),
  moreDetails: "รายละเอียดเพิ่มเติม",
  categoryAndTags: "หมวดหมู่และแท็ก",
  separateWithCommasForExampleBreakfastTransport:
    "คั่นด้วยเครื่องหมายจุลภาค เช่น อาหารเช้า, การเดินทาง",
  unsavedChangesWillBeLost: "การเปลี่ยนแปลงที่ยังไม่บันทึกจะหายไป",
  cancelEditing: "ยกเลิกการแก้ไขหรือไม่",
  saveChanges: "บันทึกการเปลี่ยนแปลง",
  recordExpense: "บันทึกค่าใช้จ่าย",
  settlementRepresentative: "มอบหมายการชำระหนี้ให้",
  settledByName: (values: MessageValues) =>
    interpolate("มอบหมายการชำระหนี้ให้ {name}", values),
  settleSeparately: "ตนเอง (ชำระแยก)",
  settlementRepresentativeHelp:
    "ค่าใช้จ่ายแบ่งเป็นรายบุคคล ยอดคงเหลือและคำแนะนำการชำระหนี้จะรวมยอดสุทธิของแต่ละคนไว้กับตัวแทนของตน ตัวแทนจะถูกมอบหมายให้บุคคลอื่นชำระแทนไม่ได้",
  representativeHasDependents:
    "มีสมาชิกอื่นมอบหมายให้บุคคลนี้ชำระแทนอยู่ โปรดยกเลิกการมอบหมายเหล่านั้นก่อน",
  settlementRepresentativeUpdated: "อัปเดตตัวแทนชำระหนี้แล้ว",
  unableToUpdateSettlementRepresentative: "อัปเดตตัวแทนชำระหนี้ไม่ได้",
  provideParticipantChanges: "ระบุรายละเอียดผู้ร่วมค่าใช้จ่ายที่จะอัปเดต",
  invalidSettlementRepresentative: "ตัวแทนชำระหนี้ไม่ถูกต้อง",
  settlementRepresentativeMustBeAnotherGroupMember:
    "ตัวแทนชำระหนี้ต้องเป็นสมาชิกคนอื่นในกลุ่มนี้",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "ตัวแทนชำระหนี้ต้องไม่ชำระผ่านบุคคลอื่น และบุคคลนี้ต้องไม่มีสมาชิกที่ชำระผ่านตน",
  invalidBackupSettlementRepresentative: "ตัวแทนชำระหนี้ในข้อมูลสำรองไม่ถูกต้อง",
  expenseParticipantAdded: "เพิ่มผู้ร่วมค่าใช้จ่ายแล้ว",
  unableToAddPerson: "เพิ่มบุคคลไม่ได้",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "ผู้ร่วมค่าใช้จ่ายไม่จำเป็นต้องลงชื่อเข้าใช้ จัดการบัญชีที่มีสิทธิ์เข้าถึงได้ที่ การตั้งค่ากลุ่ม → การแชร์และการเข้าถึง",
  personsName: "ชื่อบุคคล",
  friendsName: "ชื่อเพื่อน",
  enterAName: "กรอกชื่อ",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "กลุ่มที่เก็บถาวรอ่านได้อย่างเดียว กู้คืนกลุ่มนี้เพื่อเปลี่ยนผู้ร่วมค่าใช้จ่าย",
  usedByAPayment: "ใช้อยู่ในการชำระเงิน",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "ลบไม่ได้: {reason} โปรดอัปเดตค่าใช้จ่ายที่เกี่ยวข้องก่อน หรือใช้เครื่องมือรวมด้านล่าง",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("ลบ {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "บุคคลนี้ไม่มีค่าใช้จ่ายหรือการชำระเงิน การลบย้อนกลับไม่ได้",
  expenseParticipantDeleted: "ลบผู้ร่วมค่าใช้จ่ายแล้ว",
  deleteThisExpenseParticipant: "ลบผู้ร่วมค่าใช้จ่ายคนนี้หรือไม่",
  nameUpdated: "อัปเดตชื่อแล้ว",
  unableToUpdateName: "อัปเดตชื่อไม่ได้",
  rename: "เปลี่ยนชื่อ",
  renameName: (values: MessageValues) => interpolate("เปลี่ยนชื่อ {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "ค่าใช้จ่ายและการชำระเงินที่มีอยู่จะยังเชื่อมโยงกับบุคคลนี้",
  newName: "ชื่อใหม่",
  saveName: "บันทึกชื่อ",
  advancedPeopleTools: "เครื่องมือขั้นสูงสำหรับบุคคล",
  mergeDuplicatePeople: "รวมบุคคลที่ซ้ำกัน",
  sourcePerson: "บุคคลต้นทาง",
  targetPerson: "บุคคลปลายทาง",
  mergeInto: "รวมเข้าเป็น",
  changePreview: "ตัวอย่างการเปลี่ยนแปลง",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "ค่าใช้จ่ายที่เกี่ยวข้อง {expenses} รายการ และการชำระเงิน {payments} รายการของ {source} จะย้ายไปที่ {target} จากนั้นจะลบบุคคลต้นทาง",
        values,
      ),
  mergePeople: "รวมบุคคล",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "จะลบ {source} และย้ายข้อมูลที่เกี่ยวข้องไปยัง {target} ในธุรกรรมเดียวกัน โดยต้องสำเร็จทั้งหมดพร้อมกัน",
      values,
    ),
  expenseParticipantsMerged: "รวมผู้ร่วมค่าใช้จ่ายแล้ว",
  mergeFailed: "รวมไม่สำเร็จ",
  applyMerge: "ดำเนินการรวมหรือไม่",
  previewAndMerge: "ดูตัวอย่างและรวม",
};
