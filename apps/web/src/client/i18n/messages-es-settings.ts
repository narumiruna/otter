import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const esSettings = {
  groupSettings: "Ajustes del grupo",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Gestiona el acceso compartido, las preferencias del grupo y las herramientas de datos. Las acciones de gran impacto requieren confirmación.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Eres colaborador y puedes usar las herramientas de datos. Solo el propietario puede gestionar el acceso y los ajustes del grupo.",
  sharingAndAccess: "Compartir y acceso",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Enlaces activos: {links} · Colaboradores: {collaborators}",
      values,
    ),
  shareLinkCreated: "Enlace para compartir creado",
  shareLinkCreatedAndCopied: "Enlace para compartir creado y copiado",
  shareLinks: "Enlaces para compartir",
  chooseWhoCanEditThroughTheShareLink:
    "Elige quién puede ver o editar mediante este enlace.",
  linkPermission: "Permiso del enlace",
  readOnlyLink: "Solo lectura (sin iniciar sesión)",
  signedInEditLink: "Editar después de iniciar sesión",
  anyoneEditLink: "Cualquier persona con el enlace puede editar",
  signedInEditLinkDescription:
    "Después de iniciar sesión o registrarse, los visitantes se convierten en colaboradores. Revocar el enlace no elimina a quienes ya se unieron.",
  anyoneEditLinkDescription:
    "Cualquier persona con el enlace puede editar gastos y participantes sin iniciar sesión. Compártelo solo con personas de confianza; la revocación tiene efecto inmediato.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "La revocación impide que se unan nuevas personas. Los colaboradores existentes pueden seguir editando; elimina su acceso por separado.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Inicia sesión o crea una cuenta para editar {name}.", values),
  readOnlyShareLinkCreated: "Enlace compartido de solo lectura creado",
  readOnlyShareLinkCreatedAndCopied:
    "Enlace compartido de solo lectura creado y copiado",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Enlace para compartir creado. Tu navegador bloqueó la copia automática; cópialo manualmente.",
  unableToCreateLink: "No se pudo crear el enlace",
  shareLinkCopied: "Enlace para compartir copiado",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Tu navegador bloqueó la copia. Abre el enlace y cópialo de la barra de direcciones.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Cualquier persona con el enlace puede ver los gastos, los saldos y la liquidación sin iniciar sesión, pero no puede editar.",
  readOnlyShareLinks: "Enlaces compartidos de solo lectura",
  createReadOnlyLink: "Crear enlace de solo lectura",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Cualquier persona con el enlace puede ver los gastos, los saldos y las sugerencias para saldar deudas de este grupo, pero no puede añadir ni cambiar datos.",
  createAShareLink: "¿Crear un enlace para compartir?",
  createShareLink: "Crear enlace para compartir",
  revoked: "Revocado",
  active: "Activo",
  openLink: "Abrir enlace",
  copy: "Copiar",
  revokeLink: "Revocar enlace",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Tras la revocación, el enlace anterior dejará de funcionar de inmediato.",
  shareLinkRevoked: "Enlace para compartir revocado",
  revokeThisShareLink: "¿Revocar este enlace para compartir?",
  revoke: "Revocar",
  noShareLinksYet: "Todavía no hay enlaces para compartir.",
  collaboratorAdded: "Colaborador añadido",
  unableToAddCollaborator: "No se pudo añadir el colaborador",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Los colaboradores deben ser usuarios existentes. Pueden gestionar gastos y participantes, pero no los ajustes del propietario.",
  existingUsersUsername: "Nombre de usuario de un usuario existente",
  addCollaborator: "Añadir colaborador",
  removeName: (values: MessageValues) => interpolate("Quitar a {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Esta cuenta ya no podrá gestionar el grupo. Los datos de gastos existentes se conservarán.",
  collaboratorRemoved: "Colaborador eliminado",
  removeCollaborator: "¿Quitar colaborador?",
  remove: "Quitar",
  dataAndExport: "Datos y exportación",
  csvPrintBackupAndRestore: "CSV, impresión, copia de seguridad y restauración",
  exportingDoesNotChangeGroupData:
    "La exportación no cambia los datos del grupo.",
  exportAndPrint: "Exportar e imprimir",
  expenseCsvExported: "CSV de gastos exportado",
  exportExpenseCsv: "Exportar CSV de gastos",
  settlementCsvExported: "CSV de liquidación exportado",
  exportSettlementCsv: "Exportar CSV de liquidación",
  print: "Imprimir",
  completeBackupDownloaded: "Copia de seguridad completa descargada",
  downloadFailed: "Error al descargar",
  downloadCompleteBackup: "Descargar copia de seguridad completa",
  expenseCsvImported: "CSV de gastos importado",
  importFailed: "Error al importar",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Primero se comprueban todas las filas. No se guarda ningún dato si alguna fila tiene un error.",
  importExpenseCsv: "Importar CSV de gastos",
  chooseCsv: "Elegir CSV",
  importPreview: "Vista previa de la importación",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate(
      "Filas que se pueden importar: {rows}; errores: {errors}.",
      values,
    ),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Fila {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "Importar {count} gasto",
        other: "Importar {count} gastos",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "Se añadirá {count} gasto de una vez y se recalcularán los saldos.",
        other:
          "Se añadirán {count} gastos de una vez y se recalcularán los saldos.",
      }),
      values,
    ),
  applyCsvImport: "¿Aplicar la importación CSV?",
  applyImport: "Aplicar importación",
  invalidBackupFormat: "Formato de copia de seguridad no válido",
  backupRestoredAsANewGroup:
    "Copia de seguridad restaurada como un nuevo grupo",
  restoreFailed: "Error al restaurar",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "La restauración crea un nuevo grupo y no sobrescribe los datos actuales.",
  restoreJsonBackup: "Restaurar copia de seguridad JSON",
  chooseJsonBackup: "Elegir copia de seguridad JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Vista previa de la restauración: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Personas: {people} · Gastos: {expenses} · Pagos: {payments} · Moneda base: {currency}",
      values,
    ),
  createNewGroup: "Crear nuevo grupo",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Se creará un nuevo grupo llamado «{name}» sin cambiar los grupos existentes.",
      values,
    ),
  restoreThisBackup: "¿Restaurar esta copia de seguridad?",
  createNewGroup2: "Crear nuevo grupo",
  copyGroup: "Duplicar grupo",
  copyThisGroup: "¿Duplicar este grupo?",
  copyGroupDescription:
    "Copia las personas, la moneda base y los tipos de cambio personalizados a un nuevo grupo. No se copian los gastos, los pagos para saldar deudas, los colaboradores ni los enlaces para compartir. El grupo original no cambia.",
  groupCopied: "Grupo duplicado",
  groupPreferences: "Preferencias del grupo",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Cambiar la moneda base recalcula los importes mostrados y borra los tipos de cambio personalizados.",
  nameAndBaseCurrency: "Nombre y moneda base",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "El gasto total se mostrará como {amount}; los saldos y la liquidación que aparecen abajo se convertirán.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "Se prevé {count} sugerencia para saldar deudas; los tipos de cambio personalizados se restablecerán a los predeterminados de Bank of Taiwan.",
        other:
          "Se prevén {count} sugerencias para saldar deudas; los tipos de cambio personalizados se restablecerán a los predeterminados de Bank of Taiwan.",
      }),
      values,
    ),
  cancelChanges: "Cancelar cambios",
  applyGroupPreferences: "Aplicar preferencias del grupo",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Cambiar la moneda base a {currency}, recalcular todos los resultados y borrar los tipos de cambio personalizados.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Cambiar el nombre del grupo a «{name}».", values),
  applyTheseChanges: "¿Aplicar estos cambios?",
  applyChanges: "Aplicar cambios",
  groupPreferencesApplied: "Preferencias del grupo aplicadas",
  saveFailed: "Error al guardar",
  customExchangeRatesApplied: "Tipos de cambio personalizados aplicados",
  unableToSaveExchangeRates: "No se pudieron guardar los tipos de cambio",
  currencyConversion: "Conversión de monedas",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} tipo de cambio personalizado",
        other: "{count} tipos de cambio personalizados",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Indica a cuánto equivale 1 unidad de cada moneda en {currency}. Los tipos de cambio no definidos usan automáticamente los tipos medios al contado de Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Tipos de cambio personalizados",
  bankOfTaiwanSpotMidRateDescription:
    "Los nuevos gastos sin tipos de cambio personalizados usan el punto medio al contado de Bank of Taiwan y conservan esa cotización. Borrar los tipos personalizados afecta a los gastos futuros; los pagos siguen usando los tipos actuales.",
  loadBankOfTaiwanSpotMidRates:
    "Cargar tipos de cambio predeterminados de Bank of Taiwan",
  loadingBankExchangeRates: "Cargando tipos de cambio del banco…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Se cargaron los tipos de cambio medios al contado de Bank of Taiwan ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied:
    "Tipos de cambio predeterminados de Bank of Taiwan restaurados",
  unableToLoadBankExchangeRates:
    "Los tipos de cambio del banco no están disponibles en este momento. Inténtalo más tarde.",
  conversionPreview: "Vista previa de la conversión",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "Gasto total: {amount} · {count} sugerencia para saldar deudas.",
        other:
          "Gasto total: {amount} · {count} sugerencias para saldar deudas.",
      }),
      values,
    ),
  applyRates: "Aplicar tipos de cambio",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "Los gastos existentes conservan sus tipos de cambio. Los gastos nuevos o con conversión recalculada y los pagos existentes usan los tipos actualizados.",
  applyCustomExchangeRates: "¿Aplicar tipos de cambio personalizados?",
  restoreBankOfTaiwanDefaultRates:
    "¿Restaurar los tipos de cambio predeterminados de Bank of Taiwan?",
  apiWriteSettings: "Acceso de escritura de la API",
  apiWritesAllowed: "Permitido",
  apiWritesBlocked: "No permitido",
  apiWriteSettingsDescription:
    "De forma predeterminada, los tokens de API y la CLI no pueden cambiar este grupo. Al activar esta opción, los miembros con tokens de API pueden editar según sus permisos. Las acciones del navegador no se ven afectadas.",
  allowApiWrites: "Permitir cambios mediante token de API",
  apiWriteSettingSaved: "Acceso de escritura de la API actualizado",
  groupLifecycle: "Ciclo de vida del grupo",
  archivedReadOnly: "Archivado · solo lectura",
  active2: "Activo",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Después de restaurar, se podrán volver a añadir y cambiar datos.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "Al archivar se conservan todos los datos, pero el grupo pasa a ser de solo lectura.",
  restoreGroup: "Restaurar grupo",
  archiveGroup: "Archivar grupo",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Después de restaurar, el propietario y los colaboradores podrán volver a editar los datos.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Se conservan los gastos, las personas y los registros de pagos, y no se pueden cambiar mientras el grupo esté archivado.",
  groupRestored: "Grupo restaurado",
  groupArchived: "Grupo archivado",
  restoreThisGroup: "¿Restaurar este grupo?",
  archiveThisGroup: "¿Archivar este grupo?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Esto elimina permanentemente todas las personas, los gastos, los comprobantes y los registros de liquidación, y no se puede deshacer.",
  deleteGroup: "Eliminar grupo",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Introduce «{name}» para confirmar", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Eliminar permanentemente «{name}»", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Esta acción no se puede deshacer. Cancelar no realiza ningún cambio.",
  permanentlyDeleteThisGroup: "¿Eliminar permanentemente este grupo?",
  permanentlyDeleteGroup: "Eliminar grupo permanentemente",
  groupDeleted: "Grupo eliminado",
  readOnlyShare: "Vista compartida de solo lectura",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Puedes ver los gastos, los saldos y las sugerencias para saldar deudas, pero no puedes editar los datos.",
  completeExpenseHistory: "Historial completo de gastos",
  manageGroupSettings: "Gestionar ajustes del grupo",
  csvImportFailed: "Error al importar CSV",
  theCsvHasNoData: "El CSV no contiene datos",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Faltan columnas: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Participante no encontrado: {name}", values),
  invalidJsonFormat: "Formato JSON no válido",
  incorrectUsernameOrPassword: "Nombre de usuario o contraseña incorrectos",
  everyPersonNeedsAnAmountForACustomSplit:
    "Se necesita un importe para cada persona en un reparto personalizado",
  unsupportedBackupVersion: "Versión de copia de seguridad no compatible",
  unsupportedSplitMethod: "Método de reparto no compatible",
  unsupportedExchangeRateCurrency: "Moneda del tipo de cambio no compatible",
  unsupportedBaseCurrency: "Moneda base no compatible",
  unsupportedCurrency: "Moneda no compatible",
  aParticipantCannotBeMergedIntoThemselves:
    "Un participante no se puede combinar consigo mismo",
  theOwnerCannotBeRemoved: "No se puede quitar al propietario",
  thePayerAndRecipientMustBeDifferent:
    "El pagador y el destinatario deben ser diferentes",
  payerIsRequired: "Se necesita un pagador",
  thePayerMustBeAParticipant: "El pagador debe ser un participante",
  serverError: "Error del servidor",
  invalidPaymentRecordsInBackup:
    "Registros de pagos no válidos en la copia de seguridad",
  splitTotalsInBackupAreInvalid:
    "Los totales del reparto de la copia de seguridad no son válidos",
  invalidSplitDataInBackup:
    "Datos de reparto no válidos en la copia de seguridad",
  invalidExchangeRatesInBackup:
    "Tipos de cambio no válidos en la copia de seguridad",
  invalidParticipantDataInBackup:
    "Datos de participantes no válidos en la copia de seguridad",
  backupContainsDuplicateParticipants:
    "La copia de seguridad contiene participantes duplicados",
  invalidBaseCurrencyInBackup: "Moneda base no válida en la copia de seguridad",
  invalidExpenseCategoryInBackup:
    "Categoría de gasto no válida en la copia de seguridad",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Un participante de un gasto de la copia de seguridad no existe",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Un gasto de la copia de seguridad tiene participantes duplicados",
  invalidExpenseDataInBackup:
    "Datos de gastos no válidos en la copia de seguridad",
  invalidExpenseTagsInBackup:
    "Etiquetas de gastos no válidas en la copia de seguridad",
  invalidTripNameInBackup:
    "Nombre del viaje no válido en la copia de seguridad",
  backupIsMissingItsTrip: "Falta el viaje en la copia de seguridad",
  backupIsMissingParticipants:
    "Faltan los participantes en la copia de seguridad",
  backupIsMissingExpenses: "Faltan los gastos en la copia de seguridad",
  notesCanBeUpTo160Characters: "Las notas pueden tener hasta 160 caracteres",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "El enlace para compartir no es válido o se ha revocado",
  atLeastOneSplitParticipantIsRequired:
    "Se necesita al menos un participante para el reparto",
  splitParticipantsMustBelongToTheTrip:
    "Los participantes del reparto deben pertenecer al viaje",
  splitAmountsMustAddUpToTheExpenseAmount:
    "Los importes del reparto deben sumar el importe del gasto",
  splitAmountsMustBeGreaterThan0:
    "Los importes del reparto deben ser mayores que 0",
  invalidSplitAmount: "Importe de reparto no válido",
  invalidCategoryOrTagFormat: "Formato de categoría o etiqueta no válido",
  exchangeRatesMustBeGreaterThan0:
    "Los tipos de cambio deben ser mayores que 0",
  invalidExchangeRateFormat: "Formato de tipo de cambio no válido",
  aParticipantWithThisNameAlreadyExists:
    "Ya existe un participante con este nombre",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Este participante tiene registros de pagos y no se puede eliminar",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Este participante tiene gastos y no se puede eliminar",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Solo el propietario puede descargar una copia de seguridad completa",
  onlyTheOwnerCanManageShareLinks:
    "Solo el propietario puede gestionar los enlaces para compartir",
  onlyTheOwnerCanManageCollaborators:
    "Solo el propietario puede gestionar los colaboradores",
  onlyTheOwnerCanManageTripSettings:
    "Solo el propietario puede gestionar los ajustes del viaje",
  namesCanBeUpTo80Characters: "Los nombres pueden tener hasta 80 caracteres",
  passwordMustBeAtLeast8Characters3:
    "La contraseña debe tener al menos 8 caracteres",
  invalidArchiveStatus: "Estado de archivo no válido",
  invalidApiWriteSetting: "Ajuste de acceso de escritura de la API no válido",
  onlyBrowserSessionsCanManageApiWrites:
    "Solo las sesiones del navegador pueden gestionar el acceso de escritura de la API",
  apiWritesDisabledForThisGroup:
    "Este grupo no permite cambios mediante token de API",
  apiEndpointNotFound: "Punto de acceso de la API no encontrado",
  paymentRecordNotFound: "Registro de pago no encontrado",
  collaboratorNotFound: "Colaborador no encontrado",
  participantNotFound: "Participante no encontrado",
  noActiveShareLinkWasFound:
    "No se encontró ningún enlace para compartir activo",
  expenseNotFound: "Gasto no encontrado",
  receiptNotFound: "Comprobante no encontrado",
  tripNotFound: "Viaje no encontrado",
  userNotFound: "Usuario no encontrado",
  descriptionMustBe1120Characters:
    "La descripción debe tener entre 1 y 120 caracteres",
  theOwnerIsAlreadyInTheCollaboratorList:
    "El propietario ya está en la lista de colaboradores",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Este grupo está archivado. Restáuralo antes de editar.",
  receiptsMustBeJpegPngOrWebpImages:
    "Los comprobantes deben ser imágenes JPEG, PNG o WebP",
  theRecipientMustBeAParticipant: "El destinatario debe ser un participante",
  aTripWithThisNameAlreadyExists: "Ya existe un viaje con este nombre",
  dateMustUseTheYyyyMmDdFormat: "La fecha debe usar el formato YYYY-MM-DD",
  upTo10TagsAreAllowed: "Se permiten hasta 10 etiquetas",
  tagsCanBeUpTo24Characters: "Las etiquetas pueden tener hasta 24 caracteres",
  invalidTagFormat: "Formato de etiqueta no válido",
  theTargetParticipantMustBelongToTheTrip:
    "El participante de destino debe pertenecer al viaje",
  signInFirst: "Inicia sesión primero",
  provideExpenseChanges: "Indica los cambios del gasto",
  provideTripChanges: "Indica los cambios del viaje",
  requestBodyIsTooLarge: "El cuerpo de la solicitud es demasiado grande",
  selectAtLeastOneSplitParticipant:
    "Selecciona al menos un participante para el reparto",
  enterATripNameOf1100Characters:
    "Introduce un nombre de viaje de entre 1 y 100 caracteres",
  enterAnExpenseDescriptionOf1120Characters:
    "Introduce una descripción del gasto de entre 1 y 120 caracteres",
  enterAParticipantNameOf180Characters:
    "Introduce un nombre de participante de entre 1 y 80 caracteres",
  enterAUsernameAndPassword: "Introduce un nombre de usuario y una contraseña",
  enterSplitValues: "Introduce los valores del reparto",
  enterAValidPaymentDate: "Introduce una fecha de pago válida",
  enterValidSplitShares:
    "Introduce partes proporcionales válidas para el reparto",
  enterValidSplitPercentages: "Introduce porcentajes válidos para el reparto",
  enterValidSplitAmounts: "Introduce importes válidos para el reparto",
  enterAValidExpenseDate: "Introduce una fecha de gasto válida",
  chooseACsvFile: "Elige un archivo CSV",
  selectSplitParticipants: "Selecciona los participantes del reparto",
  chooseAReceiptImage: "Elige una imagen de comprobante",
  thisUserIsAlreadyACollaborator: "Este usuario ya es colaborador",
  thisUsernameIsAlreadyRegistered: "Este nombre de usuario ya está registrado",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Este nombre de usuario se está registrando o ya está ocupado",
  usernameIsBeingRegistered: "Este nombre de usuario se está registrando",
  usernameOrPasskeyAlreadyRegistered:
    "Este nombre de usuario o Passkey ya está registrado",
  invalidAmount: "Importe no válido",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "No se puede cambiar el nombre de usuario de la cuenta de desarrollo predeterminada",
  language: "Idioma",
  english: "Inglés",
  traditionalChinese: "Chino tradicional",
};
