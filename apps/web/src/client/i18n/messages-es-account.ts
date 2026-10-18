import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const esAccount = {
  browserExpenseDefaults: "Valores predeterminados de gastos en este navegador",
  browserExpenseDefaultsHelp:
    "Borra solo los valores predeterminados de moneda y reparto de esta cuenta para este grupo. Las cuentas, el inicio de sesión y los permisos no cambian.",
  clearPersonalPreferences:
    "Borrar valores predeterminados de gastos de este grupo",
  expenseDefaultsCleared:
    "Se borraron los valores predeterminados de gastos de este grupo.",
  personalPreferencesChanged:
    "Tus ajustes de reparto ya no están disponibles. Se usan valores predeterminados válidos; vuelve a seleccionarlos.",
  personalStorageFailed:
    "No se pudieron guardar los valores predeterminados de gastos. Los ajustes actuales siguen disponibles, pero pueden perderse al volver a abrir la página.",
  rememberExpenseDefaults: "Recordar la moneda y los ajustes de reparto",
  expenseDefaultsRemembered:
    "Se guardaron la moneda y los ajustes de reparto de este grupo.",
  deleteExpense: "Eliminar gasto",
  copyExpense: "Copiar como nuevo gasto",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copiar {name} como nuevo gasto", values),
  memberAccounts: "Cuentas de los miembros",
  accountPaid: "Pagado",
  accountShared: "Parte del gasto",
  accountBalance: "Por recibir / pagar",
  accountReceivable: "Por recibir",
  accountPayable: "Por pagar",
  accountSettled: "Saldado",
  accountPaidHelp:
    "Pagado es el importe abonado a comercios y otros proveedores de los gastos. No incluye los pagos para saldar deudas entre miembros.",
  accountTotalsHelp:
    "La parte del gasto es el importe que corresponde a cada miembro. Los saldos también incluyen los pagos registrados y los ajustes por representación. Se excluyen los borradores sin sincronizar.",
  accountDetails: "Ver detalles",
  accountPaidExpenses: "Gastos pagados en nombre del grupo",
  accountSharedExpenses: "Gastos compartidos",
  accountExpenseTotal: "Importe total del gasto",
  accountPayments: "Pagos enviados / recibidos",
  accountPaymentSent: "Enviado",
  accountPaymentReceived: "Recibido",
  accountAdjustments: "Ajustes por representación",
  accountDetailsUnavailable:
    "Esta vista compartida no incluye los detalles de los pagos. Los saldos usan los resultados del cálculo del grupo.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} salda las deudas en nombre de este miembro. Un saldo cero no significa que este miembro haya realizado un pago.",
      values,
    ),
  visaSettlementTitle: "Liquidación con tipos de cambio Visa",
  visaSettlementCurrency: "Moneda de liquidación",
  visaSettlementEnable:
    "Convertir todos los gastos con los tipos de cambio Visa de cada fecha y saldar en la moneda seleccionada",
  visaSettlementHelp:
    "Desactivado de forma predeterminada. Los importes originales no cambian. Al activarlo, se guarda un tipo de cambio Visa para la fecha de cada gasto y se usa la moneda seleccionada para los saldos y la liquidación. Se aplica a todos los gastos, incluido el efectivo, sin comisiones bancarias. Los tipos de cambio Visa son estimaciones; los estados de cuenta de la tarjeta pueden diferir. Los pagos existentes deben usar la moneda seleccionada antes de activar esta opción o cambiar de moneda.",
  visaSettlementSaved: "Se guardó el ajuste de liquidación Visa",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Activado · {currency}", values),
  visaSettlementOff: "Desactivado",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Ajuste de liquidación Visa no válido",
  visaIncompatiblePayments:
    "Los pagos existentes deben usar la moneda de liquidación seleccionada",
  visaSettingUnavailable:
    "Los tipos de cambio Visa no están disponibles. No se cambió el ajuste. Inténtalo más tarde.",
  visaPaymentCurrency:
    "Los pagos de liquidación Visa deben usar la moneda seleccionada",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "El tipo de cambio Visa {currency}/{target} del {date} no está disponible. Inténtalo más tarde.",
      values,
    ),
  offlineQueueBanner:
    "Sin conexión: los datos cargados siguen disponibles. Puedes guardar nuevos gastos en este dispositivo; los demás cambios requieren conexión.",
  queueSave: "Guardar en este dispositivo",
  queueSaved:
    "Guardado en este dispositivo. Aún no se incluye en los saldos; los tipos de cambio se fijan al sincronizar.",
  queueStorageError:
    "No se pudo guardar en este dispositivo. Mantén esta página abierta e inténtalo de nuevo.",
  queueTitle: "Gastos sin sincronizar",
  queueNotice:
    "Solo en este dispositivo. No se incluyen en los saldos. Los tipos de cambio se fijan al sincronizar. Si borras los datos del navegador, perderás estos borradores.",
  queuePending: "Esperando sincronización",
  queueAttempted:
    "Sincronización pendiente de confirmación; conserva la solicitud original sin cambios",
  queueConflict:
    "Sincronización detenida. Comprueba el acceso y los participantes antes de reintentar; se conserva la solicitud original.",
  queueInvalid: "No registrado. Edita el borrador y vuelve a intentarlo.",
  queueEdit: "Editar borrador",
  queueRetry: "Reintentar la solicitud original",
  queueDelete: "Eliminar borrador local",
  queueDeleteConfirm:
    "¿Eliminar este borrador local? Es posible que una solicitud ya enviada se haya registrado en el servidor. Comprueba el grupo primero.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("es", values.count, {
        one: "{count} gasto sin sincronizar en este dispositivo",
        other: "{count} gastos sin sincronizar en este dispositivo",
      }),
      values,
    ),
  queueSyncPricing:
    "La vista previa solo muestra la moneda original. El servidor fija el tipo de cambio al sincronizar.",
  queueOrphanTitle: "Borradores de grupos no disponibles",
  queueOrphanNotice:
    "Ya no se puede acceder a estos grupos. Una solicitud enviada puede haberse registrado; compruébalo antes de eliminar su copia local.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID del grupo: {id}", values),
  accountSettings: "Ajustes de la cuenta",
  manageYourUsernameAndPasskeys:
    "Gestiona la apariencia, el idioma, el nombre de usuario, las Passkeys y los tokens de API.",
  appearance: "Apariencia",
  chooseHowOtterLooksOnThisBrowser:
    "Elige la apariencia de Otter. Los cambios se aplican de inmediato y se guardan en este navegador.",
  colorTheme: "Tema de color",
  forestTheme: "Bosque",
  oceanTheme: "Océano",
  lavenderTheme: "Lavanda",
  sunsetTheme: "Atardecer",
  roseTheme: "Rosa",
  displayMode: "Modo de visualización",
  systemMode: "Sistema",
  lightMode: "Claro",
  darkMode: "Oscuro",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Usa el nuevo nombre de usuario la próxima vez que inicies sesión. Tu sesión actual continuará.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Usa el desbloqueo de tu dispositivo para iniciar sesión sin introducir tu contraseña.",
  unableToLoadPasskeys: "No se pudieron cargar las Passkeys",
  unableToAddPasskey:
    "No se pudo añadir una Passkey. Si cancelaste, inténtalo de nuevo.",
  unableToRemovePasskey: "No se pudo eliminar la Passkey",
  passkeyAdded: "Passkey añadida",
  passkeyRemoved: "Passkey eliminada",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Añadida el {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Eliminar Passkey {number}", values),
  noPasskeysAdded: "Todavía no se han añadido Passkeys.",
  addingPasskey: "Añadiendo Passkey…",
  addPasskey: "Añadir Passkey",
  thisBrowserDoesNotSupportPasskeys: "Este navegador no admite Passkeys.",
  apiTokens: "Tokens de API",
  useApiTokensWithTheOtterCli:
    "Crea tokens Bearer para la CLI de Otter o herramientas de automatización.",
  loadingApiTokens: "Cargando tokens de API…",
  unableToLoadApiTokens: "No se pudieron cargar los tokens de API",
  unableToCreateApiToken: "No se pudo crear el token de API",
  apiTokenCreationUncertain:
    "Se desconoce el resultado de la solicitud del token. Reintenta esta solicitud antes de crear otra.",
  retryApiTokenCreation: "Reintentar la creación del token",
  unableToRevokeApiToken: "No se pudo revocar el token de API",
  unableToCopyApiToken: "No se pudo copiar el token de API",
  apiTokenRevoked: "Token de API revocado",
  apiTokenCopied: "Token de API copiado",
  enterATokenName: "Introduce un nombre para el token",
  newApiToken: "Nuevo token de API",
  copyYourApiTokenNow: "Copia tu token de API ahora",
  apiTokenShownOnce:
    "Este token solo se muestra una vez. No podrás volver a verlo después de salir.",
  copyToken: "Copiar token",
  done: "Listo",
  tokenName: "Nombre del token",
  tokenNameExample: "Por ejemplo: Automatización de viajes",
  creatingApiToken: "Creando token…",
  createApiToken: "Crear token de API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Creado el {created} · Caduca el {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate("Revocar token de API «{name}»", values),
  noActiveApiTokens: "No hay tokens de API activos.",
  apiTokensExpireAfter90Days:
    "Los tokens caducan a los 90 días. Para usar uno con la CLI, asígnalo a",
  welcomeBackEyebrow: "TE DAMOS LA BIENVENIDA DE NUEVO",
  startNewJourneyEyebrow: "EMPIEZA UN NUEVO VIAJE",
  parchmentTheme: "Pergamino",
};
