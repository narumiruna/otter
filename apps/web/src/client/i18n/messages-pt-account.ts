import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const ptAccount = {
  browserExpenseDefaults: "Padrões de despesas neste navegador",
  browserExpenseDefaultsHelp:
    "Limpe apenas os padrões de moeda e divisão desta conta para este grupo. Contas, login e permissões não mudam.",
  clearPersonalPreferences: "Limpar padrões de despesas deste grupo",
  expenseDefaultsCleared: "Padrões de despesas deste grupo removidos.",
  personalPreferencesChanged:
    "Suas configurações de divisão não estão mais disponíveis. Padrões válidos estão em uso; selecione novamente.",
  personalStorageFailed:
    "Não foi possível salvar os padrões de despesas. As configurações atuais continuam disponíveis, mas podem ser perdidas ao reabrir a página.",
  rememberExpenseDefaults: "Lembrar moeda e configurações de divisão",
  expenseDefaultsRemembered:
    "Moeda e configurações de divisão salvas para este grupo.",
  deleteExpense: "Excluir despesa",
  copyExpense: "Copiar como nova despesa",
  copyExpenseNamed: (values: MessageValues) =>
    interpolate("Copiar {name} como nova despesa", values),
  memberAccounts: "Contas dos membros",
  accountPaid: "Pago",
  accountShared: "Parte da despesa",
  accountBalance: "A receber / pagar",
  accountReceivable: "A receber",
  accountPayable: "A pagar",
  accountSettled: "Quitado",
  accountPaidHelp:
    "Pago é o valor pago a lojas e outros fornecedores das despesas. Não inclui pagamentos de acerto entre membros.",
  accountTotalsHelp:
    "A parte da despesa é o valor que cabe a cada membro. Os saldos também incluem pagamentos registrados e ajustes de representação. Rascunhos não sincronizados são excluídos.",
  accountDetails: "Ver detalhes",
  accountPaidExpenses: "Despesas pagas em nome do grupo",
  accountSharedExpenses: "Despesas compartilhadas",
  accountExpenseTotal: "Valor total da despesa",
  accountPayments: "Pagamentos enviados / recebidos",
  accountPaymentSent: "Enviado",
  accountPaymentReceived: "Recebido",
  accountAdjustments: "Ajustes de representação",
  accountDetailsUnavailable:
    "Esta visualização compartilhada não inclui os detalhes dos pagamentos. Os saldos usam os resultados dos cálculos do grupo.",
  accountRepresentedBy: (values: MessageValues) =>
    interpolate(
      "{name} faz o acerto por este membro. Um saldo zero não significa que este membro tenha feito um pagamento.",
      values,
    ),
  visaSettlementTitle: "Acertos com taxas Visa",
  visaSettlementCurrency: "Moeda de acerto",
  visaSettlementEnable:
    "Converter todas as despesas com as taxas Visa de cada data e acertar na moeda selecionada",
  visaSettlementHelp:
    "Desativado por padrão. Os valores originais não mudam. Ao ativar, uma taxa Visa é salva para a data de cada despesa, e a moeda selecionada é usada nos saldos e acertos. Aplica-se a todas as despesas, inclusive em dinheiro, sem tarifas bancárias. As taxas Visa são estimativas; as faturas do cartão podem ser diferentes. Os pagamentos existentes devem usar a moeda selecionada antes de ativar ou mudar de moeda.",
  visaSettlementSaved: "Configuração de acerto Visa salva",
  visaSettlementOn: (values: MessageValues) =>
    interpolate("Ativado · {currency}", values),
  visaSettlementOff: "Desativado",
  visaRateLabel: "Visa",
  visaSettingInvalid: "Configuração de acerto Visa inválida",
  visaIncompatiblePayments:
    "Os registros de pagamento existentes devem usar a moeda de acerto selecionada",
  visaSettingUnavailable:
    "As taxas Visa não estão disponíveis. A configuração não foi alterada. Tente novamente mais tarde.",
  visaPaymentCurrency:
    "Os pagamentos de acerto Visa devem usar a moeda selecionada",
  visaRateUnavailable: (values: MessageValues) =>
    interpolate(
      "A taxa Visa {currency}/{target} de {date} não está disponível. Tente novamente mais tarde.",
      values,
    ),
  offlineQueueBanner:
    "Sem conexão: os dados carregados continuam disponíveis. Novas despesas podem ser salvas neste dispositivo; outras alterações exigem conexão.",
  queueSave: "Salvar neste dispositivo",
  queueSaved:
    "Salvo neste dispositivo. Ainda não incluído nos saldos; as taxas de câmbio são definidas na sincronização.",
  queueStorageError:
    "Não foi possível salvar neste dispositivo. Mantenha esta página aberta e tente novamente.",
  queueTitle: "Despesas não sincronizadas",
  queueNotice:
    "Apenas neste dispositivo. Não incluídas nos saldos. As taxas de câmbio são definidas na sincronização. Limpar os dados do navegador apaga estes rascunhos.",
  queuePending: "Aguardando sincronização",
  queueAttempted:
    "Sincronização aguardando confirmação; mantenha a solicitação original sem alterações",
  queueConflict:
    "Sincronização interrompida. Verifique o acesso e os participantes antes de tentar novamente; a solicitação original foi mantida.",
  queueInvalid: "Não registrado. Edite o rascunho e tente novamente.",
  queueEdit: "Editar rascunho",
  queueRetry: "Repetir solicitação original",
  queueDelete: "Excluir rascunho local",
  queueDeleteConfirm:
    "Excluir este rascunho local? Uma solicitação já enviada pode ter sido registrada no servidor. Verifique o grupo primeiro.",
  queueCount: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} despesa não sincronizada neste dispositivo",
        other: "{count} despesas não sincronizadas neste dispositivo",
      }),
      values,
    ),
  queueSyncPricing:
    "A prévia mostra apenas a moeda original. O servidor define a taxa de câmbio na sincronização.",
  queueOrphanTitle: "Rascunhos de grupos indisponíveis",
  queueOrphanNotice:
    "Não é mais possível acessar estes grupos. Uma solicitação enviada pode ter sido registrada; verifique antes de excluir a cópia local.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("ID do grupo: {id}", values),
  accountSettings: "Configurações da conta",
  manageYourUsernameAndPasskeys:
    "Gerencie aparência, idioma, nome de usuário, Passkeys e tokens de API.",
  appearance: "Aparência",
  chooseHowOtterLooksOnThisBrowser:
    "Escolha a aparência do Otter. As alterações são aplicadas imediatamente e salvas neste navegador.",
  colorTheme: "Tema de cores",
  forestTheme: "Floresta",
  oceanTheme: "Oceano",
  lavenderTheme: "Lavanda",
  sunsetTheme: "Pôr do sol",
  roseTheme: "Rosa",
  displayMode: "Modo de exibição",
  systemMode: "Sistema",
  lightMode: "Claro",
  darkMode: "Escuro",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Use o novo nome de usuário no próximo login. Sua sessão atual continuará ativa.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Use o desbloqueio do dispositivo para entrar sem digitar sua senha.",
  unableToLoadPasskeys: "Não foi possível carregar as Passkeys",
  unableToAddPasskey:
    "Não foi possível adicionar uma Passkey. Se você cancelou, tente novamente.",
  unableToRemovePasskey: "Não foi possível remover a Passkey",
  passkeyAdded: "Passkey adicionada",
  passkeyRemoved: "Passkey removida",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) =>
    interpolate("Adicionada em {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Remover Passkey {number}", values),
  noPasskeysAdded: "Nenhuma Passkey adicionada ainda.",
  addingPasskey: "Adicionando Passkey…",
  addPasskey: "Adicionar Passkey",
  thisBrowserDoesNotSupportPasskeys:
    "Este navegador não oferece suporte a Passkeys.",
  apiTokens: "Tokens de API",
  useApiTokensWithTheOtterCli:
    "Crie tokens Bearer para a CLI do Otter ou ferramentas de automação.",
  loadingApiTokens: "Carregando tokens de API…",
  unableToLoadApiTokens: "Não foi possível carregar os tokens de API",
  unableToCreateApiToken: "Não foi possível criar o token de API",
  apiTokenCreationUncertain:
    "O resultado da solicitação do token é desconhecido. Repita esta solicitação antes de criar outra.",
  retryApiTokenCreation: "Tentar criar o token novamente",
  unableToRevokeApiToken: "Não foi possível revogar o token de API",
  unableToCopyApiToken: "Não foi possível copiar o token de API",
  apiTokenRevoked: "Token de API revogado",
  apiTokenCopied: "Token de API copiado",
  enterATokenName: "Digite um nome para o token",
  newApiToken: "Novo token de API",
  copyYourApiTokenNow: "Copie seu token de API agora",
  apiTokenShownOnce:
    "Este token é exibido apenas uma vez. Você não poderá vê-lo novamente depois de sair.",
  copyToken: "Copiar token",
  done: "Concluído",
  tokenName: "Nome do token",
  tokenNameExample: "Por exemplo: Automação de viagens",
  creatingApiToken: "Criando token…",
  createApiToken: "Criar token de API",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Criado em {created} · Expira em {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Revogar token de API "{name}"', values),
  noActiveApiTokens: "Nenhum token de API ativo.",
  apiTokensExpireAfter90Days:
    "Os tokens expiram após 90 dias. Para usar um na CLI, defina-o como",
  welcomeBackEyebrow: "BOAS-VINDAS DE VOLTA",
  startNewJourneyEyebrow: "COMECE UMA NOVA VIAGEM",
  parchmentTheme: "Pergaminho",
};
