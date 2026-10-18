import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { esAccount } from "./messages-es-account.js";
import { esSettings } from "./messages-es-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const es = {
  ...esAccount,
  ...esSettings,
  expenseTotalLabel: "Total",
  expenseSplitSection: "Repartir entre personas",
  expenseSplitHelp:
    "Selecciona quién compartirá este gasto, elige un método y consulta el resultado.",
  expenseTagPlaceholder: "Añadir una etiqueta…",
  addShort: "Añadir",
  settingsShort: "Ajustes",
  close: "Cerrar",
  groupDetails: "Detalles del grupo",
  filters: "Filtros",
  viewAll: "Ver todo",
  personLabel: "Persona",
  preferencesLabel: "Preferencias",
  profileLabel: "Perfil",
  securityLabel: "Seguridad",
  backToGroups: "Volver a los grupos",
  backToExpenseList: "Volver a la lista de gastos",
  expenseEditorUnavailable:
    "No se puede editar este gasto. Puede que no exista o que el grupo sea de solo lectura o esté archivado.",
  createdLabel: "Creado",
  statusLabel: "Estado",
  peopleDeletionHelp:
    "No se pueden eliminar las personas que figuran en el registro de gastos. Consulta las restricciones individuales con el botón de información o combina las personas duplicadas.",
  personRestriction: (values: MessageValues) =>
    interpolate("Restricciones de eliminación de {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Representa a {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Ver importe y tipo de cambio de {name}", values),
  rateUnavailable: "Tipo de cambio no disponible (datos antiguos)",
  expenseHistory: "Historial de cambios",
  expenseHistoryDescription:
    "Ediciones, eliminaciones y restauraciones de gastos; no es el historial de pagos ni de saldos.",
  expenseHistoryEmpty: "No hay cambios registrados",
  expenseHistoryMore: "Cargar más cambios",
  expenseHistoryCreated: "Creado",
  expenseHistoryUpdated: "Actualizado",
  expenseHistoryDeleted: "Eliminado",
  expenseHistoryRestored: "Restaurado",
  expenseHistoryBaseline: "Estado inicial",
  expenseHistorySystem: "Sistema",
  expenseHistoryBaselineNotice:
    "Estado al activar el historial; se desconocen los cambios anteriores y el autor original.",
  expenseHistoryReceiptNotice:
    "Solo se conservan los metadatos de los comprobantes. Las imágenes anteriores no están disponibles.",
  expenseHistoryShares: "Importes del reparto",
  expenseHistoryRate: "Tipo de cambio registrado",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Personalizado del grupo",
  expenseHistoryRateFixed: "Fijo integrado",
  expenseHistoryRateLegacy: "Estimación antigua",
  expenseHistoryRateTimeUnavailable: "Hora de cotización no disponible",
  expenseHistoryRateUnavailable:
    "Versión antigua: no se registró el tipo de cambio",
  expenseHistoryBefore: "Antes",
  expenseHistoryAfter: "Después",
  expenseHistorySourceExpense: "Acción sobre el gasto",
  expenseHistorySourceCsv: "Importación CSV",
  expenseHistorySourceRestore: "Restauración de copia de seguridad",
  expenseHistorySourceMerge: "Combinación de participantes",
  expenseHistorySourceReceipt: "Acción sobre el comprobante",
  expenseHistorySourceSeed: "Datos de prueba de desarrollo",
  expenseHistorySourceMigration: "Migración",
  expenseHistorySourceVersionRestore: "Restauración de versión",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Restaurar v{version}", values),
  expenseRestoreTitle: "Restaurar versión del gasto",
  expenseRestoreDescription:
    "Revisa el gasto actual y la versión que vas a restaurar. La restauración añade una nueva versión; el historial posterior sigue disponible.",
  expenseRestoreKeepsReceipt:
    "El comprobante actual sigue adjunto. No se restauran las imágenes de comprobantes anteriores.",
  expenseRestoreNoReceipt:
    "Un gasto eliminado se recupera sin comprobante. No se restauran las imágenes de comprobantes anteriores.",
  expenseRestoreMissingPerson:
    "Esta versión hace referencia a alguien que ya no está en el grupo. Edita el gasto manualmente.",
  expenseRestoreUnavailable:
    "No se puede restaurar este gasto. Vuelve a cargar la página e inténtalo de nuevo.",
  expenseRestoreConflict:
    "El gasto cambió. Revisa el estado más reciente antes de volver a confirmar.",
  expenseRestoreConfirm: "Restaurar esta versión",
  expenseRestored: "Versión del gasto restaurada",
  expenseConflictParticipantsChanged:
    "Las personas han cambiado. Al confirmar, las selecciones de pagador o reparto que ya no estén disponibles se sustituyen por los ajustes de la versión más reciente del gasto. Se conservan los demás campos del borrador; revisa los importes del reparto antes de guardar.",
  expenseVersionConflict:
    "Este gasto ha cambiado. Revisa la versión más reciente antes de volver a confirmar.",
  expenseVersionMissing:
    "Indica la versión del gasto. Vuelve a cargar la página e inténtalo de nuevo.",
  expenseVersionInvalid: "Versión del gasto no válida",
  reviewLatestExpense: "Revisar el gasto más reciente",
  confirmLatestExpenseVersion:
    "He revisado la versión más reciente; conservar mi borrador y seguir editando",
  latestExpenseMissing:
    "Este gasto se eliminó o ya no está accesible. Se conserva tu borrador, pero no se puede guardar.",
  deleteExpenseHistoryRetained:
    "El gasto se quitará del registro actual y se recalcularán los saldos. Se conserva el historial de cambios; puedes restaurar una versión anterior sin la imagen de su comprobante antiguo.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Historial de cambios: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "El nombre de usuario debe tener entre 3 y 32 letras, números, guiones bajos o guiones",
  travelTogetherSplitExpensesEasily:
    "Viajen juntos y repartan los gastos fácilmente",
  goodFriendsSplitExpensesWell: "Los buenos amigos reparten bien los gastos.",
  skipToMainContent: "Ir al contenido principal",
  otterHome: "Inicio de otter",
  loading: "Cargando",
  unableToLoadOtter: "No se pudo cargar otter",
  loadingFailed: "Error al cargar",
  reload: "Volver a cargar",
  signedIn: "Sesión iniciada",
  accountCreated: "Cuenta creada",
  unableToAuthenticate: "No se pudo autenticar",
  authenticationRequestsTooFrequentTryAgainLater:
    "Demasiadas solicitudes de autenticación. Inténtalo más tarde.",
  usernameUpdated: "Nombre de usuario actualizado",
  signedOut: "Sesión cerrada",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("No se pudo cerrar la sesión: {message}", values),
  pleaseTryAgainLater: "Inténtalo más tarde",
  signingOut: "Cerrando sesión…",
  signOut: "Cerrar sesión",
  authorizeCli: "Conectar CLI",
  authorizeCliDescription:
    "Introduce el código de dispositivo que aparece en tu terminal para autorizar el acceso de esta CLI a tus datos de Otter.",
  deviceCode: "Código de dispositivo",
  checkDeviceCode: "Continuar",
  checkingDeviceCode: "Comprobando…",
  cliAccessRequest: "Solicitud de acceso de la CLI",
  cliAccessRequestedBy: "Solicitado por",
  approveCliAccess: "Autorizar acceso",
  approvingCliAccess: "Autorizando…",
  cliAccessApproved: "CLI conectada",
  cliAccessApprovedDescription:
    "Puedes cerrar esta página y volver a tu terminal.",
  deviceCodeNotFoundOrExpired: "Código de dispositivo no encontrado o caducado",
  enterAValidDeviceCode: "Introduce un código de dispositivo válido",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "No tienes conexión. Los datos cargados están disponibles, pero se necesita conexión para editar.",
  travelTogetherSplitWithEase: "Viajen juntos y repartan sin complicaciones",
  spendYourTimeOnTheJourney: "Dedica tu tiempo al viaje,",
  andLeaveTheSplittingToOtter: "y deja el reparto a otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "Desde una cena hasta un viaje completo, registra cada gasto compartido y mantén las finanzas del grupo sencillas y claras.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Ejemplo de reparto: una cena en un viaje de fin de semana cuesta 1.800 TWD para tres personas, es decir, 600 TWD por persona.",
  weekendTrip: "Viaje de fin de semana",
  splitExample: "Ejemplo de reparto",
  dinnerTogether: "Cena juntos",
  you: "Tú",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Repartido por igual entre 3",
  each: "por persona",
  quicklyRecordSharedExpenses: "Registra rápidamente los gastos compartidos",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Ve de un vistazo quién debe pagar y quién debe recibir",
  settleUpWithClearSuggestions: "Salda las deudas con sugerencias claras",
  signIn: "Iniciar sesión",
  createAccount: "Crear cuenta",
  welcomeBackContinueYourJourney:
    "Te damos la bienvenida de nuevo. Continúa tu viaje.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Crea tu primer grupo y empieza a repartir sin complicaciones.",
  username: "Nombre de usuario",
  enterAUsername: "Introduce un nombre de usuario",
  password: "Contraseña",
  enterAPassword: "Introduce una contraseña",
  developmentCredentialsHaveBeenFilledIn:
    "Se han completado las credenciales de desarrollo.",
  signingIn: "Iniciando sesión…",
  or: "o",
  signInWithAPasskey: "Iniciar sesión con una Passkey",
  signingInWithAPasskey: "Iniciando sesión con una Passkey…",
  unableToSignInWithAPasskey:
    "No se pudo iniciar sesión con una Passkey. Inténtalo de nuevo o usa tu contraseña.",
  needAnAccount: "¿Necesitas una cuenta?",
  usernameIsNotCaseSensitive:
    "El nombre de usuario no distingue entre mayúsculas y minúsculas.",
  passwordMustBeAtLeast8Characters:
    "La contraseña debe tener al menos 8 caracteres",
  passwordMustBeAtLeast8Characters2:
    "La contraseña debe tener al menos 8 caracteres.",
  creating: "Creando…",
  createAccountWithAPasskey: "Crear cuenta con una Passkey",
  creatingAccountWithAPasskey: "Creando cuenta con una Passkey…",
  unableToCreateAccountWithAPasskey:
    "No se pudo crear la cuenta con una Passkey. Inténtalo de nuevo.",
  alreadyHaveAnAccount: "¿Ya tienes una cuenta?",
  backToSignIn: "Volver al inicio de sesión",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Los participantes de los gastos no necesitan una cuenta para formar parte de un grupo.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Cambiar el nombre de usuario de {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menú de la cuenta de {name}", values),
  unableToUpdateUsername: "No se pudo actualizar el nombre de usuario",
  changeUsername: "Cambiar nombre de usuario",
  passkeyRegistrationRequestsTooFrequent:
    "Demasiadas solicitudes de registro de Passkeys. Inténtalo más tarde.",
  passkeyRegistrationResponseIsInvalid:
    "La respuesta de registro de la Passkey no es válida",
  passkeyRegistrationRequestExpired:
    "La solicitud de registro de la Passkey caducó. Inténtalo de nuevo.",
  unableToVerifyPasskey: "No se pudo verificar la Passkey. Inténtalo de nuevo.",
  passkeyAlreadyRegistered: "Esta Passkey ya está registrada",
  passkeyNotFound: "Passkey no encontrada",
  cannotRemoveOnlyPasskey:
    "No puedes eliminar tu única Passkey sin perder el acceso a la cuenta",
  passkeyLoginResponseIsInvalid:
    "La respuesta de inicio de sesión con Passkey no es válida",
  passkeyLoginRequestExpired:
    "La solicitud de inicio de sesión con Passkey caducó. Inténtalo de nuevo.",
  unableToUsePasskeyToSignIn: "No se pudo iniciar sesión con esta Passkey",
  cancel: "Cancelar",
  saving: "Guardando…",
  save: "Guardar",
  connectionFailedPleaseTryAgainLater:
    "Error de conexión. Inténtalo más tarde.",
  theServerReturnedAnInvalidResponse:
    "El servidor devolvió una respuesta no válida.",
  everyone: "Todos",
  unknown: "Desconocido",
  atLeastOneParticipantIsRequired: "Se necesita al menos un participante",
  usedByAnExpense: "Usado en un gasto",
  youAreOfflineReconnectAndTryAgain:
    "No tienes conexión. Vuelve a conectarte e inténtalo de nuevo.",
  working: "Procesando…",
  unableToApplyChanges: "No se pudieron aplicar los cambios",
  applying: "Aplicando…",
  noBalancesYet: "Todavía no hay saldos.",
  settled: "Saldado",
  getsBack: "Debe recibir",
  owes: "Debe pagar",
  newTaiwanDollar: "Nuevo dólar taiwanés",
  japaneseYen: "Yen japonés",
  usDollar: "Dólar estadounidense",
  euro: "Euro",
  singaporeDollar: "Dólar de Singapur",
  poundSterling: "Libra esterlina",
  australianDollar: "Dólar australiano",
  canadianDollar: "Dólar canadiense",
  southKoreanWon: "Won surcoreano",
  food: "Comida",
  transport: "Transporte",
  lodging: "Alojamiento",
  tickets: "Entradas",
  shopping: "Compras",
  other: "Otros",
  unsavedChangesWillBeLostDiscardTheDraft:
    "Se perderán los cambios sin guardar. ¿Descartar el borrador?",
  unableToSwitchGroups: "No se pudo cambiar de grupo",
  loadingGroup: "Cargando grupo",
  yourSelectionWillAppearAfterItsDataLoads:
    "Tu selección aparecerá cuando se carguen sus datos.",
  unableToLoadGroup: "No se pudo cargar el grupo",
  groupSwitcher: "Selector de grupos",
  groups: "Grupos",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} grupo activo",
        other: "{count} grupos activos",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful: "Cada viaje suma algo maravilloso.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Registra los gastos compartidos y céntrate en las personas que te acompañan.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Archivado y de solo lectura. Los datos se conservan; el propietario puede restaurarlo en Ajustes del grupo.",
  addTravelCompanionsFirst: "Añade primero a tus compañeros de viaje",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Solo hay un participante. Añade a alguien con quien compartir antes de registrar el primer gasto.",
  addExpenseParticipant: "Añadir participante de gastos",
  switchGroups: "Cambiar de grupo",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Solo saldrás del grupo actual cuando se haya cargado el nuevo.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Personas: {participants} · Gastos: {expenses} · {currency}",
      values,
    ),
  archived: "Archivado",
  everydayMomentsTogether: "Momentos cotidianos juntos",
  collaborator: "Colaborador",
  owner: "Propietario",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Moneda base: {currency}", values),
  usingCustomExchangeRates: "Se usan tipos de cambio personalizados",
  usingBankOfTaiwanExchangeRates:
    "Se usan los tipos de cambio predeterminados de Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan no está disponible; se usan tipos de cambio fijos de respaldo",
  loadingGroup2: "Cargando grupo…",
  people: "Personas",
  expenses: "Gastos",
  base: "Base",
  overview: "Resumen",
  more: "Más",
  groupWorkspace: "Espacio de trabajo del grupo",
  addExpense: "Añadir gasto",
  archivedGroups: "Grupos archivados",
  unableToCreateGroup: "No se pudo crear el grupo",
  createGroup: "Crear grupo",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Añade compañeros después de crear el grupo y luego registra los gastos compartidos.",
  groupName: "Nombre del grupo",
  fiveDaysInTokyo: "Cinco días en Tokyo",
  baseCurrency: "Moneda base",
  createYourFirstGroup: "Crea tu primer grupo",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Añade un grupo para un viaje o evento, o crea uno a partir de una copia de seguridad JSON existente.",
  groupExpenseSummary: "Resumen de gastos del grupo",
  totalSharedExpenses: "Total de gastos compartidos",
  convertedToBaseCurrency: "Convertido a la moneda base",
  outstanding: "Pendiente",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} pago sugerido para saldar las deudas",
        other: "{count} pagos sugeridos para saldar las deudas",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "No hay nada pendiente en este momento",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "Las sugerencias para saldar deudas aparecen después de añadir gastos",
  expenseRecords: "Registros de gastos",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "Repartido entre {count} persona",
        other: "Repartido entre {count} personas",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Calculado a partir de los gastos actuales y los pagos registrados.",
  settleUp: "Saldar deudas",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} registro",
        other: "{count} registros",
      }),
      values,
    ),
  entries: "registros",
  seePaymentsAndSharesAtAGlance:
    "Consulta de un vistazo los pagos y las partes de cada persona.",
  balances: "Saldos",
  recentExpenses: "Gastos recientes",
  noExpensesYet: "Todavía no hay gastos",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Este grupo todavía no ha registrado gastos compartidos.",
  recordTheFirstSharedExpense: "Registrar el primer gasto compartido",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Primero añade a las personas que compartirán los gastos y luego registra el primer gasto. Los saldos y las sugerencias para saldar deudas aparecerán automáticamente.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Los saldos y las sugerencias para saldar deudas aparecerán aquí después de añadir gastos.",
  addPerson: "Añadir persona",
  managePeople: "Gestionar personas",
  everythingIsSettled: "Todo está saldado",
  thereAreNoOutstandingPayments: "No hay pagos pendientes.",
  paymentRecorded: "Pago registrado",
  unableToRecordPayment: "No se pudo registrar el pago",
  recordPayment: "Registrar pago",
  recordSettlementPayment: "Registrar pago para saldar deudas",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} paga a {to}; se ha rellenado el importe total sugerido.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Importe del pago ({currency})", values),
  enterAPaymentAmount: "Introduce el importe del pago",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "El pago debe ser mayor que 0 y no superar el importe sugerido",
  expectedRemainder: "Resto previsto: ",
  paymentDate: "Fecha del pago",
  noteOptional: "Nota (opcional)",
  recordPayment2: "Registrar pago",
  paymentHistory: "Historial de pagos",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} pagó a {to}", values),
  deletePayment: "Eliminar pago",
  remainingSettlementSuggestionsWillBeRecalculated:
    "Se recalcularán las sugerencias restantes para saldar deudas.",
  paymentDeleted: "Pago eliminado",
  deleteFailed: "Error al eliminar",
  deleteThisPayment: "¿Eliminar este pago?",
  delete: "Eliminar",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · pagado por {name} · repartido con {split}", values),
  dailySpending: "Gasto diario",
  paidByPerson: "Pagado por persona",
  byCategory: "Por categoría",
  spendingAnalysis: "Análisis de gastos",
  totalAmount: (values: MessageValues) =>
    interpolate("Total: {amount}", values),
  noDataYet: "Todavía no hay datos.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Gastos mostrados: {shown} de {total}", values),
  searchDescriptions: "Buscar descripciones",
  searchExpenseDescriptions: "Buscar descripciones de gastos",
  sort: "Ordenar",
  groupBy: "Agrupar por",
  noGrouping: "Sin agrupar",
  groupByDate: "Agrupar por fecha",
  groupByPayer: "Agrupar por pagador",
  dateNewestFirst: "Fecha: más recientes primero",
  dateOldestFirst: "Fecha: más antiguos primero",
  amountHighToLow: "Importe: de mayor a menor",
  amountLowToHigh: "Importe: de menor a mayor",
  moreFilters: "Más filtros",
  countApplied: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} aplicado",
        other: "{count} aplicados",
      }),
      values,
    ),
  datePersonCurrencyCategoryAndTag:
    "Fecha, persona, moneda, categoría y etiqueta",
  from: "Desde",
  to: "Hasta",
  paidBy: "Pagado por",
  splitWith: "Repartir con",
  expenseParticipants: "Participantes de gastos",
  currency: "Moneda",
  allCurrencies: "Todas las monedas",
  category: "Categoría",
  allCategories: "Todas las categorías",
  tag: "Etiqueta",
  exactTag: "Etiqueta exacta",
  applied: "Aplicados:",
  clearAll: "Borrar todo",
  allPeople: "Todas las personas",
  categoryValue: (values: MessageValues) =>
    interpolate("Categoría: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Moneda: {value}", values),
  fromValue: (values: MessageValues) => interpolate("Desde: {value}", values),
  toValue: (values: MessageValues) => interpolate("Hasta: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Etiqueta: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "El historial completo aparecerá aquí después del primer gasto compartido.",
  recordFirstExpense: "Registrar primer gasto",
  noMatchingExpenses: "No hay gastos que coincidan",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Ajusta o borra los filtros para ver todos los gastos.",
  clearFilters: "Borrar filtros",
  filteredExpenses: "Gastos filtrados",
  allExpenses: "Todos los gastos",
  columns: "Columnas",
  chooseExpenseColumns: "Elegir columnas de gastos",
  expenseName: "Gasto",
  splitParticipants: "Reparto",
  receipt: "Comprobante",
  tags: "Etiquetas",
  restoreDefaults: "Restaurar valores predeterminados",
  actions: "Acciones",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} gasto · {total}",
        other: "{count} gastos · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} persona",
        other: "{count} personas",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Ver comprobante de {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Comprobante de «{name}»", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Imagen del comprobante de {name}", values),
  closeReceiptPreviewHint: "Haz clic en la imagen o pulsa Esc para cerrar.",
  closeReceiptPreview: "Cerrar vista previa del comprobante",
  openOriginalReceipt: "Abrir imagen original",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Más acciones para {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · pagado por {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Repartido con {split}", values),
  edit: "Editar",
  receiptUploadFailed: "Error al subir el comprobante",
  receiptUploaded: "Comprobante subido",
  uploading: "Subiendo…",
  uploadReceipt: "Subir comprobante",
  receiptFileRequirements: "JPEG, PNG o WebP · Hasta 5 MB",
  selectReceiptPhoto: "Subir foto",
  takeReceiptPhoto: "Tomar foto",
  removeReceiptPhoto: "Quitar foto",
  receiptOnlineOnly:
    "Las fotos requieren conexión; los borradores sin conexión no guardan fotos. Quita la foto o vuelve a conectarte primero.",
  receiptFileTooLarge: "Las fotos deben tener un tamaño máximo de 5 MB",
  expenseSavedReceiptFailed:
    "Se creó el gasto, pero no se pudo subir el comprobante. Reinténtalo ahora o añádelo más tarde desde la lista de gastos.",
  retryReceiptUpload: "Reintentar la subida del comprobante",
  receiptAlreadyAttached:
    "Este gasto ya tiene un comprobante. Revísalo en la lista de gastos; no se sobrescribirá automáticamente",
  uploadReceiptLater: "Subir más tarde",
  expenseCreationUncertain:
    "No podemos confirmar si se creó el gasto. Consulta la lista de gastos antes de volver a añadirlo; no lo reintentes de inmediato.",
  viewReceipt: "Ver comprobante",
  noReceipt: "Sin comprobante",
  deleteReceipt: "Eliminar comprobante",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Puedes subir otro comprobante más tarde; el gasto no se eliminará.",
  receiptDeleted: "Comprobante eliminado",
  deleteThisReceipt: "¿Eliminar este comprobante?",
  deleteName: (values: MessageValues) =>
    interpolate("Eliminar «{name}»", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Esta acción no se puede deshacer. Se recalcularán todos los saldos y las sugerencias para saldar deudas.",
  expenseDeleted: "Gasto eliminado",
  deleteThisExpense: "¿Eliminar este gasto?",
  invalidSplitFormat: "Formato de reparto no válido",
  selectAtLeastOnePersonToSplitWith:
    "Selecciona al menos una persona con quien repartir",
  expenseChangesSaved: "Cambios del gasto guardados",
  expenseRecorded: "Gasto registrado",
  unableToSaveExpense: "No se pudo guardar el gasto",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Revisa la vista previa del reparto antes de guardar los cambios.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Introduce primero los datos obligatorios. Más abajo puedes personalizar el reparto y añadir etiquetas.",
  editExpense: "Editar gasto",
  addExpense2: "Añadir gasto",
  discardDraft: "Descartar borrador",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "Se perderán los cambios sin guardar. Los datos existentes no cambiarán.",
  discardThisDraft: "¿Descartar este borrador?",
  description: "Descripción",
  dinnerHotelTrainTickets: "Cena, hotel, boletos de tren",
  enterAnExpenseDescription: "Introduce una descripción del gasto",
  amount: "Importe",
  enterAnExpenseAmount: "Introduce el importe del gasto",
  date: "Fecha",
  currency2: "Moneda",
  splitPreview: "Vista previa del reparto",
  enterAnAmountToPreviewEachPersonsShare:
    "Introduce un importe para ver la parte que corresponde a cada persona.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} pagó {amount}", values),
  changePeopleAndSplitMethod: "Cambiar personas y método de reparto",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Selección: {selected} de {total}", values),
  selectAll: "Seleccionar todo",
  clear: "Borrar",
  splitMethod: "Método de reparto",
  splitEqually: "Repartir por igual",
  exactAmounts: "Importes exactos",
  percentages: "Porcentajes",
  shares: "Partes proporcionales",
  nameSKind: (values: MessageValues) => interpolate("{kind} de {name}", values),
  moreDetails: "Más detalles",
  categoryAndTags: "Categoría y etiquetas",
  separateWithCommasForExampleBreakfastTransport:
    "Separa con comas, por ejemplo: desayuno, transporte",
  unsavedChangesWillBeLost: "Se perderán los cambios sin guardar.",
  cancelEditing: "¿Cancelar la edición?",
  saveChanges: "Guardar cambios",
  recordExpense: "Registrar gasto",
  settlementRepresentative: "Liquidación asignada a",
  settledByName: (values: MessageValues) =>
    interpolate("Liquidación asignada a {name}", values),
  settleSeparately: "Por cuenta propia (saldar por separado)",
  settlementRepresentativeHelp:
    "Los gastos se reparten por persona; los saldos y las sugerencias para saldar deudas incluyen el saldo neto de cada persona bajo su representante. Los representantes no pueden estar asignados a otra persona.",
  representativeHasDependents:
    "Hay otros miembros asignados a esta persona. Elimina primero esas asignaciones.",
  settlementRepresentativeUpdated: "Representante de liquidación actualizado",
  unableToUpdateSettlementRepresentative:
    "No se pudo actualizar el representante de liquidación",
  provideParticipantChanges:
    "Indica los datos del participante que quieres actualizar",
  invalidSettlementRepresentative: "Representante de liquidación no válido",
  settlementRepresentativeMustBeAnotherGroupMember:
    "El representante de liquidación debe ser otro miembro de este grupo",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "El representante de liquidación no puede saldar a través de otra persona, y esta persona no puede tener miembros que salden a través de ella",
  invalidBackupSettlementRepresentative:
    "Representante de liquidación no válido en la copia de seguridad",
  expenseParticipantAdded: "Participante de gastos añadido",
  unableToAddPerson: "No se pudo añadir la persona",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Los participantes de los gastos no necesitan iniciar sesión. Gestiona las cuentas con acceso en Ajustes del grupo → Compartir y acceso.",
  personsName: "Nombre de la persona",
  friendsName: "Nombre de tu amigo",
  enterAName: "Introduce un nombre",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Los grupos archivados son de solo lectura. Restaura este grupo para cambiar los participantes.",
  usedByAPayment: "Usado en un pago",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "No se puede eliminar: {reason}. Actualiza primero los gastos relacionados o usa la herramienta de combinación que aparece más abajo.",
      values,
    ),
  deleteName2: (values: MessageValues) =>
    interpolate("Eliminar {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Esta persona no tiene gastos ni pagos. La eliminación no se puede deshacer.",
  expenseParticipantDeleted: "Participante de gastos eliminado",
  deleteThisExpenseParticipant: "¿Eliminar este participante de gastos?",
  nameUpdated: "Nombre actualizado",
  unableToUpdateName: "No se pudo actualizar el nombre",
  rename: "Cambiar nombre",
  renameName: (values: MessageValues) =>
    interpolate("Cambiar el nombre de {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "Los gastos y pagos existentes seguirán vinculados a esta persona.",
  newName: "Nuevo nombre",
  saveName: "Guardar nombre",
  advancedPeopleTools: "Herramientas avanzadas de personas",
  mergeDuplicatePeople: "Combinar personas duplicadas",
  sourcePerson: "Persona de origen",
  targetPerson: "Persona de destino",
  mergeInto: "Combinar con",
  changePreview: "Vista previa del cambio",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "Los gastos relacionados ({expenses}) y los pagos ({payments}) de {source} se transferirán a {target}; después se eliminará la persona de origen.",
        values,
      ),
  mergePeople: "Combinar personas",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "Se eliminará a {source} y sus datos relacionados se transferirán a {target} en una única operación atómica.",
      values,
    ),
  expenseParticipantsMerged: "Participantes de gastos combinados",
  mergeFailed: "Error al combinar",
  applyMerge: "¿Aplicar la combinación?",
  previewAndMerge: "Vista previa y combinación",
} satisfies CatalogShape<typeof zhTW>;
