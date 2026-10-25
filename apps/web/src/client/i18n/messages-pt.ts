import {
  type CatalogShape,
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";
import { ptAi } from "./messages-ai.js";
import { ptAiAuth } from "./messages-ai-auth.js";
import { automaticRateMessages } from "./messages-automatic-rates.js";
import { ptAccount } from "./messages-pt-account.js";
import { ptSettings } from "./messages-pt-settings.js";
import type { zhTW } from "./messages-zh-tw.js";

export const pt = {
  ...automaticRateMessages("pt"),
  ...ptAi,
  ...ptAiAuth,
  ...ptAccount,
  ...ptSettings,
  expenseTotalLabel: "Total",
  expenseSplitSection: "Dividir entre pessoas",
  expenseSplitHelp:
    "Selecione quem vai dividir esta despesa, escolha um método e veja o resultado.",
  expenseTagPlaceholder: "Adicionar uma etiqueta…",
  addShort: "Adicionar",
  settingsShort: "Configurações",
  close: "Fechar",
  groupDetails: "Detalhes do grupo",
  filters: "Filtros",
  viewAll: "Ver tudo",
  personLabel: "Pessoa",
  preferencesLabel: "Preferências",
  profileLabel: "Perfil",
  securityLabel: "Segurança",
  backToGroups: "Voltar aos grupos",
  backToExpenseList: "Voltar à lista de despesas",
  expenseEditorUnavailable:
    "Esta despesa não pode ser editada. Ela pode não existir, ou o grupo pode ser somente leitura ou estar arquivado.",
  createdLabel: "Criado",
  statusLabel: "Status",
  peopleDeletionHelp:
    "Pessoas usadas no registro de despesas não podem ser excluídas. Verifique as restrições individuais com o botão de informações ou mescle pessoas duplicadas.",
  personRestriction: (values: MessageValues) =>
    interpolate("Restrições de exclusão de {name}", values),
  representsPeople: (values: MessageValues) =>
    interpolate("Representa {names}", values),
  expenseRateForName: (values: MessageValues) =>
    interpolate("Ver valor e taxa de câmbio de {name}", values),
  rateUnavailable: "Taxa indisponível (dados antigos)",
  expenseHistory: "Histórico de alterações",
  expenseHistoryDescription:
    "Edições, exclusões e restaurações de despesas; não é o histórico de pagamentos nem de saldos.",
  expenseHistoryEmpty: "Nenhuma alteração registrada",
  expenseHistoryMore: "Carregar mais alterações",
  expenseHistoryCreated: "Criada",
  expenseHistoryUpdated: "Atualizada",
  expenseHistoryDeleted: "Excluída",
  expenseHistoryRestored: "Restaurada",
  expenseHistoryBaseline: "Estado inicial",
  expenseHistorySystem: "Sistema",
  expenseHistoryBaselineNotice:
    "Estado no momento em que o histórico foi ativado; as alterações anteriores e o autor original são desconhecidos.",
  expenseHistoryReceiptNotice:
    "Apenas os metadados dos comprovantes são mantidos. As imagens anteriores não estão disponíveis.",
  expenseHistoryShares: "Valores da divisão",
  expenseHistoryRate: "Taxa de câmbio registrada",
  expenseHistoryRateBank: "Bank of Taiwan",
  expenseHistoryRateCustom: "Personalizada do grupo",
  expenseHistoryRateFixed: "Fixa integrada",
  expenseHistoryRateLegacy: "Estimativa antiga",
  expenseHistoryRateTimeUnavailable: "Horário da cotação indisponível",
  expenseHistoryRateUnavailable: "Versão antiga: nenhuma taxa registrada",
  expenseHistoryBefore: "Antes",
  expenseHistoryAfter: "Depois",
  expenseHistorySourceExpense: "Ação na despesa",
  expenseHistorySourceCsv: "Importação CSV",
  expenseHistorySourceRestore: "Restauração de backup",
  expenseHistorySourceMerge: "Mesclagem de participantes",
  expenseHistorySourceReceipt: "Ação no comprovante",
  expenseHistorySourceSeed: "Dados de teste de desenvolvimento",
  expenseHistorySourceMigration: "Migração",
  expenseHistorySourceVersionRestore: "Restauração de versão",
  expenseRestoreVersion: (values: MessageValues) =>
    interpolate("Restaurar v{version}", values),
  expenseRestoreTitle: "Restaurar versão da despesa",
  expenseRestoreDescription:
    "Revise a despesa atual e a versão a restaurar. A restauração adiciona uma nova versão; o histórico posterior continua disponível.",
  expenseRestoreKeepsReceipt:
    "O comprovante atual continua anexado. Imagens de comprovantes antigos não são restauradas.",
  expenseRestoreNoReceipt:
    "Uma despesa excluída volta sem comprovante. Imagens de comprovantes antigos não são restauradas.",
  expenseRestoreMissingPerson:
    "Esta versão faz referência a alguém que não está mais no grupo. Edite a despesa manualmente.",
  expenseRestoreUnavailable:
    "Esta despesa não pode ser restaurada. Recarregue e tente novamente.",
  expenseRestoreConflict:
    "A despesa mudou. Revise o estado mais recente antes de confirmar novamente.",
  expenseRestoreConfirm: "Restaurar esta versão",
  expenseRestored: "Versão da despesa restaurada",
  expenseConflictParticipantsChanged:
    "As pessoas mudaram. Ao confirmar, as seleções de pagador ou divisão indisponíveis serão substituídas pelas configurações da versão mais recente da despesa. Os outros campos do rascunho serão mantidos; revise os valores da divisão antes de salvar.",
  expenseVersionConflict:
    "Esta despesa foi alterada. Revise a versão mais recente antes de confirmar novamente.",
  expenseVersionMissing:
    "Informe a versão da despesa. Recarregue e tente novamente.",
  expenseVersionInvalid: "Versão da despesa inválida",
  reviewLatestExpense: "Revisar despesa mais recente",
  confirmLatestExpenseVersion:
    "Revisei a versão mais recente; manter meu rascunho e continuar editando",
  latestExpenseMissing:
    "Esta despesa foi excluída ou não está mais acessível. Seu rascunho foi mantido, mas não pode ser salvo.",
  deleteExpenseHistoryRetained:
    "A despesa sairá do registro atual e os saldos serão recalculados. O histórico de alterações será mantido; você pode restaurar uma versão anterior sem a imagem do comprovante antigo.",
  expenseHistoryForName: (values: MessageValues) =>
    interpolate("Histórico de alterações: {name}", values),
  usernameMustBe332LettersNumbersUnderscoresOrHyphens:
    "O nome de usuário deve ter de 3 a 32 letras, números, sublinhados ou hífens",
  travelTogetherSplitExpensesEasily:
    "Viajem juntos e dividam as despesas com facilidade",
  goodFriendsSplitExpensesWell: "Bons amigos dividem bem as despesas.",
  skipToMainContent: "Ir para o conteúdo principal",
  otterHome: "Página inicial do otter",
  loading: "Carregando",
  unableToLoadOtter: "Não foi possível carregar o otter",
  loadingFailed: "Falha ao carregar",
  reload: "Recarregar",
  signedIn: "Login realizado",
  accountCreated: "Conta criada",
  unableToAuthenticate: "Não foi possível autenticar",
  authenticationRequestsTooFrequentTryAgainLater:
    "Muitas solicitações de autenticação. Tente novamente mais tarde.",
  usernameUpdated: "Nome de usuário atualizado",
  signedOut: "Sessão encerrada",
  signOutFailedMessage: (values: MessageValues) =>
    interpolate("Falha ao sair: {message}", values),
  pleaseTryAgainLater: "Tente novamente mais tarde",
  signingOut: "Saindo…",
  signOut: "Sair",
  authorizeCli: "Conectar CLI",
  authorizeCliDescription:
    "Digite o código do dispositivo exibido no terminal para aprovar o acesso desta CLI aos seus dados do Otter.",
  deviceCode: "Código do dispositivo",
  checkDeviceCode: "Continuar",
  checkingDeviceCode: "Verificando…",
  cliAccessRequest: "Solicitação de acesso da CLI",
  cliAccessRequestedBy: "Solicitado por",
  approveCliAccess: "Aprovar acesso",
  approvingCliAccess: "Aprovando…",
  cliAccessApproved: "CLI conectada",
  cliAccessApprovedDescription:
    "Você pode fechar esta página e voltar ao terminal.",
  deviceCodeNotFoundOrExpired:
    "Código do dispositivo não encontrado ou expirado",
  enterAValidDeviceCode: "Digite um código de dispositivo válido",
  youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection:
    "Você está sem conexão. Os dados carregados estão disponíveis, mas é preciso ter conexão para editar.",
  travelTogetherSplitWithEase: "Viajem juntos e dividam sem complicações",
  spendYourTimeOnTheJourney: "Dedique seu tempo à viagem,",
  andLeaveTheSplittingToOtter: "e deixe a divisão com o otter.",
  fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear:
    "De um jantar a uma viagem completa, registre cada despesa compartilhada e mantenha as finanças do grupo simples e claras.",
  splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each:
    "Exemplo de divisão: um jantar em uma viagem de fim de semana custa TWD 1.800 para três pessoas, ou TWD 600 por pessoa.",
  weekendTrip: "Viagem de fim de semana",
  splitExample: "Exemplo de divisão",
  dinnerTogether: "Jantar juntos",
  you: "Você",
  a: "A",
  y: "Y",
  splitEquallyAmong3: "Dividido igualmente entre 3",
  each: "por pessoa",
  quicklyRecordSharedExpenses: "Registre despesas compartilhadas rapidamente",
  seeWhoOwesAndWhoIsOwedAtAGlance:
    "Veja de imediato quem deve pagar e quem deve receber",
  settleUpWithClearSuggestions: "Acerte as contas com sugestões claras",
  signIn: "Entrar",
  createAccount: "Criar conta",
  welcomeBackContinueYourJourney: "Boas-vindas de volta. Continue sua viagem.",
  createYourFirstGroupAndStartSplittingWithEase:
    "Crie seu primeiro grupo e comece a dividir sem complicações.",
  username: "Nome de usuário",
  enterAUsername: "Digite um nome de usuário",
  password: "Senha",
  enterAPassword: "Digite uma senha",
  developmentCredentialsHaveBeenFilledIn:
    "As credenciais de desenvolvimento foram preenchidas.",
  signingIn: "Entrando…",
  or: "ou",
  signInWithAPasskey: "Entrar com uma Passkey",
  signingInWithAPasskey: "Entrando com uma Passkey…",
  unableToSignInWithAPasskey:
    "Não foi possível entrar com uma Passkey. Tente novamente ou use sua senha.",
  needAnAccount: "Precisa de uma conta?",
  usernameIsNotCaseSensitive:
    "O nome de usuário não diferencia maiúsculas de minúsculas.",
  passwordMustBeAtLeast8Characters: "A senha deve ter pelo menos 8 caracteres",
  passwordMustBeAtLeast8Characters2:
    "A senha deve ter pelo menos 8 caracteres.",
  creating: "Criando…",
  createAccountWithAPasskey: "Criar conta com uma Passkey",
  creatingAccountWithAPasskey: "Criando conta com uma Passkey…",
  unableToCreateAccountWithAPasskey:
    "Não foi possível criar a conta com uma Passkey. Tente novamente.",
  alreadyHaveAnAccount: "Já tem uma conta?",
  backToSignIn: "Voltar ao login",
  expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup:
    "Os participantes das despesas não precisam de contas para fazer parte de um grupo.",
  changeNameSUsername: (values: MessageValues) =>
    interpolate("Alterar o nome de usuário de {name}", values),
  nameSAccountMenu: (values: MessageValues) =>
    interpolate("Menu da conta de {name}", values),
  unableToUpdateUsername: "Não foi possível atualizar o nome de usuário",
  changeUsername: "Alterar nome de usuário",
  passkeyRegistrationRequestsTooFrequent:
    "Muitas solicitações de registro de Passkeys. Tente novamente mais tarde.",
  passkeyRegistrationResponseIsInvalid:
    "A resposta de registro da Passkey é inválida",
  passkeyRegistrationRequestExpired:
    "A solicitação de registro da Passkey expirou. Tente novamente.",
  unableToVerifyPasskey:
    "Não foi possível verificar a Passkey. Tente novamente.",
  passkeyAlreadyRegistered: "Esta Passkey já está registrada",
  passkeyNotFound: "Passkey não encontrada",
  cannotRemoveOnlyPasskey:
    "Você não pode remover sua única Passkey sem perder o acesso à conta",
  passkeyLoginResponseIsInvalid: "A resposta de login com Passkey é inválida",
  passkeyLoginRequestExpired:
    "A solicitação de login com Passkey expirou. Tente novamente.",
  unableToUsePasskeyToSignIn: "Não foi possível entrar com esta Passkey",
  cancel: "Cancelar",
  saving: "Salvando…",
  save: "Salvar",
  connectionFailedPleaseTryAgainLater:
    "Falha na conexão. Tente novamente mais tarde.",
  theServerReturnedAnInvalidResponse:
    "O servidor retornou uma resposta inválida.",
  everyone: "Todos",
  unknown: "Desconhecido",
  atLeastOneParticipantIsRequired: "É necessário pelo menos um participante",
  usedByAnExpense: "Usado em uma despesa",
  youAreOfflineReconnectAndTryAgain:
    "Você está sem conexão. Reconecte e tente novamente.",
  working: "Processando…",
  unableToApplyChanges: "Não foi possível aplicar as alterações",
  applying: "Aplicando…",
  noBalancesYet: "Ainda não há saldos.",
  settled: "Quitado",
  getsBack: "A receber",
  owes: "A pagar",
  newTaiwanDollar: "Novo dólar taiwanês",
  japaneseYen: "Iene japonês",
  usDollar: "Dólar americano",
  euro: "Euro",
  singaporeDollar: "Dólar de Singapura",
  poundSterling: "Libra esterlina",
  australianDollar: "Dólar australiano",
  canadianDollar: "Dólar canadense",
  southKoreanWon: "Won sul-coreano",
  food: "Alimentação",
  transport: "Transporte",
  lodging: "Hospedagem",
  tickets: "Ingressos",
  shopping: "Compras",
  other: "Outros",
  unsavedChangesWillBeLostDiscardTheDraft:
    "As alterações não salvas serão perdidas. Descartar o rascunho?",
  unableToSwitchGroups: "Não foi possível trocar de grupo",
  loadingGroup: "Carregando grupo",
  yourSelectionWillAppearAfterItsDataLoads:
    "Sua seleção aparecerá depois que os dados forem carregados.",
  unableToLoadGroup: "Não foi possível carregar o grupo",
  groupSwitcher: "Seletor de grupos",
  groups: "Grupos",
  countActiveGroups: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} grupo ativo",
        other: "{count} grupos ativos",
      }),
      values,
    ),
  everyTripAddsUpToSomethingWonderful:
    "Cada viagem resulta em algo maravilhoso.",
  recordSharedExpensesAndFocusOnThePeopleBesideYou:
    "Registre as despesas compartilhadas e concentre-se nas pessoas ao seu lado.",
  archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore:
    "Arquivado e somente leitura. Os dados são preservados; o proprietário pode restaurá-lo em Configurações do grupo.",
  addTravelCompanionsFirst: "Adicione os companheiros de viagem primeiro",
  thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense:
    "Há apenas um participante. Adicione alguém com quem dividir antes de registrar a primeira despesa.",
  addExpenseParticipant: "Adicionar participante de despesas",
  switchGroups: "Trocar de grupo",
  youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads:
    "Você só sairá do grupo atual depois que o novo for carregado.",
  participantsPeopleExpensesExpensesCurrency: (values: MessageValues) =>
    interpolate(
      "Pessoas: {participants} · Despesas: {expenses} · {currency}",
      values,
    ),
  archived: "Arquivado",
  everydayMomentsTogether: "Momentos do dia a dia juntos",
  collaborator: "Colaborador",
  owner: "Proprietário",
  baseCurrencyCurrency: (values: MessageValues) =>
    interpolate("Moeda base: {currency}", values),
  usingCustomExchangeRates: "Usando taxas de câmbio personalizadas",
  usingBankOfTaiwanExchangeRates: "Usando taxas padrão do Bank of Taiwan",
  usingFixedFallbackRates:
    "Bank of Taiwan indisponível; usando taxas fixas de reserva",
  loadingGroup2: "Carregando grupo…",
  people: "Pessoas",
  expenses: "Despesas",
  base: "Base",
  overview: "Visão geral",
  more: "Mais",
  groupWorkspace: "Área de trabalho do grupo",
  addExpense: "Adicionar despesa",
  archivedGroups: "Grupos arquivados",
  unableToCreateGroup: "Não foi possível criar o grupo",
  createGroup: "Criar grupo",
  addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses:
    "Adicione os companheiros depois de criar o grupo e registre as despesas compartilhadas.",
  groupName: "Nome do grupo",
  fiveDaysInTokyo: "Cinco dias em Tokyo",
  baseCurrency: "Moeda base",
  createYourFirstGroup: "Crie seu primeiro grupo",
  addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup:
    "Adicione um grupo de viagem ou evento, ou crie um a partir de um backup JSON existente.",
  groupExpenseSummary: "Resumo de despesas do grupo",
  totalSharedExpenses: "Total de despesas compartilhadas",
  convertedToBaseCurrency: "Convertido para a moeda base",
  outstanding: "Pendente",
  countSuggestedPaymentsToSettleUp: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} pagamento sugerido para acertar as contas",
        other: "{count} pagamentos sugeridos para acertar as contas",
      }),
      values,
    ),
  nothingIsCurrentlyOutstanding: "Não há nada pendente no momento",
  settlementSuggestionsAppearAfterExpensesAreAdded:
    "As sugestões de acerto aparecem depois de adicionar despesas",
  expenseRecords: "Registros de despesas",
  sharedAmongCountPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "Dividido entre {count} pessoa",
        other: "Dividido entre {count} pessoas",
      }),
      values,
    ),
  calculatedFromCurrentExpensesAndRecordedPayments:
    "Calculado a partir das despesas atuais e dos pagamentos registrados.",
  settleUp: "Acertar contas",
  countEntries: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} registro",
        other: "{count} registros",
      }),
      values,
    ),
  entries: "registros",
  seePaymentsAndSharesAtAGlance:
    "Veja de imediato os pagamentos e as partes de cada pessoa.",
  balances: "Saldos",
  recentExpenses: "Despesas recentes",
  noExpensesYet: "Ainda não há despesas",
  thisGroupHasNotRecordedAnySharedExpenses:
    "Este grupo ainda não registrou despesas compartilhadas.",
  recordTheFirstSharedExpense: "Registrar a primeira despesa compartilhada",
  addThePeopleSplittingExpensesToCalculateEachBalance:
    "Primeiro adicione as pessoas que vão dividir as despesas e registre sua primeira despesa. Os saldos e as sugestões de acerto aparecerão automaticamente.",
  balancesAndSettlementSuggestionsWillAppearHereAfterYouAddExpenses:
    "Os saldos e as sugestões de acerto aparecerão aqui depois de adicionar despesas.",
  addPerson: "Adicionar pessoa",
  managePeople: "Gerenciar pessoas",
  everythingIsSettled: "Tudo quitado",
  thereAreNoOutstandingPayments: "Não há pagamentos pendentes.",
  paymentRecorded: "Pagamento registrado",
  unableToRecordPayment: "Não foi possível registrar o pagamento",
  recordPayment: "Registrar pagamento",
  recordSettlementPayment: "Registrar pagamento de acerto",
  fromPaysToTheFullSuggestedAmountIsPrefilled: (values: MessageValues) =>
    interpolate(
      "{from} paga a {to}; o valor total sugerido já está preenchido.",
      values,
    ),
  paymentAmountCurrency: (values: MessageValues) =>
    interpolate("Valor do pagamento ({currency})", values),
  enterAPaymentAmount: "Digite o valor do pagamento",
  thePaymentMustBeGreaterThan0AndNoMoreThanTheSuggestedAmount:
    "O pagamento deve ser maior que 0 e não pode ultrapassar o valor sugerido",
  expectedRemainder: "Restante previsto: ",
  paymentDate: "Data do pagamento",
  noteOptional: "Observação (opcional)",
  recordPayment2: "Registrar pagamento",
  paymentHistory: "Histórico de pagamentos",
  dateFromPaidTo: (values: MessageValues) =>
    interpolate("{date} · {from} pagou a {to}", values),
  deletePayment: "Excluir pagamento",
  remainingSettlementSuggestionsWillBeRecalculated:
    "As sugestões de acerto restantes serão recalculadas.",
  paymentDeleted: "Pagamento excluído",
  deleteFailed: "Falha ao excluir",
  deleteThisPayment: "Excluir este pagamento?",
  delete: "Excluir",
  datePaidByNameSplitWithSplit: (values: MessageValues) =>
    interpolate("{date} · pago por {name} · dividido com {split}", values),
  dailySpending: "Gastos diários",
  paidByPerson: "Pago por pessoa",
  byCategory: "Por categoria",
  spendingAnalysis: "Análise de gastos",
  totalAmount: (values: MessageValues) =>
    interpolate("Total: {amount}", values),
  noDataYet: "Ainda não há dados.",
  showingShownOfTotalExpenses: (values: MessageValues) =>
    interpolate("Despesas exibidas: {shown} de {total}", values),
  searchDescriptions: "Buscar descrições",
  searchExpenseDescriptions: "Buscar descrições de despesas",
  sort: "Ordenar",
  groupBy: "Agrupar por",
  noGrouping: "Sem agrupamento",
  groupByDate: "Agrupar por data",
  groupByPayer: "Agrupar por pagador",
  dateNewestFirst: "Data: mais recentes primeiro",
  dateOldestFirst: "Data: mais antigas primeiro",
  amountHighToLow: "Valor: do maior para o menor",
  amountLowToHigh: "Valor: do menor para o maior",
  moreFilters: "Mais filtros",
  countApplied: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} aplicado",
        other: "{count} aplicados",
      }),
      values,
    ),
  datePersonCurrencyCategoryAndTag: "Data, pessoa, moeda, categoria e etiqueta",
  from: "De",
  to: "Até",
  paidBy: "Pago por",
  splitWith: "Dividir com",
  expenseParticipants: "Participantes de despesas",
  currency: "Moeda",
  allCurrencies: "Todas as moedas",
  category: "Categoria",
  allCategories: "Todas as categorias",
  tag: "Etiqueta",
  exactTag: "Etiqueta exata",
  applied: "Aplicados:",
  clearAll: "Limpar tudo",
  allPeople: "Todas as pessoas",
  categoryValue: (values: MessageValues) =>
    interpolate("Categoria: {value}", values),
  currencyValue: (values: MessageValues) =>
    interpolate("Moeda: {value}", values),
  fromValue: (values: MessageValues) => interpolate("De: {value}", values),
  toValue: (values: MessageValues) => interpolate("Até: {value}", values),
  tagValue: (values: MessageValues) => interpolate("Etiqueta: {value}", values),
  aCompleteHistoryWillAppearHereAfterTheFirstSharedExpense:
    "O histórico completo aparecerá aqui depois da primeira despesa compartilhada.",
  recordFirstExpense: "Registrar primeira despesa",
  noMatchingExpenses: "Nenhuma despesa correspondente",
  adjustOrClearTheFiltersToSeeAllExpenses:
    "Ajuste ou limpe os filtros para ver todas as despesas.",
  clearFilters: "Limpar filtros",
  filteredExpenses: "Despesas filtradas",
  allExpenses: "Todas as despesas",
  columns: "Colunas",
  chooseExpenseColumns: "Escolher colunas de despesas",
  expenseName: "Despesa",
  splitParticipants: "Divisão",
  receipt: "Comprovante",
  tags: "Etiquetas",
  restoreDefaults: "Restaurar padrões",
  actions: "Ações",
  expenseGroupSummary: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} despesa · {total}",
        other: "{count} despesas · {total}",
      }),
      values,
    ),
  countPeople: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} pessoa",
        other: "{count} pessoas",
      }),
      values,
    ),
  viewReceiptForName: (values: MessageValues) =>
    interpolate("Ver comprovante de {name}", values),
  receiptPreviewForName: (values: MessageValues) =>
    interpolate("Comprovante de “{name}”", values),
  receiptImageForName: (values: MessageValues) =>
    interpolate("Imagem do comprovante de {name}", values),
  closeReceiptPreviewHint: "Clique na imagem ou pressione Esc para fechar.",
  closeReceiptPreview: "Fechar prévia do comprovante",
  openOriginalReceipt: "Abrir imagem original",
  moreActionsForName: (values: MessageValues) =>
    interpolate("Mais ações para {name}", values),
  datePaidByName: (values: MessageValues) =>
    interpolate("{date} · pago por {name}", values),
  splitWithSplit: (values: MessageValues) =>
    interpolate("Dividido com {split}", values),
  edit: "Editar",
  receiptUploadFailed: "Falha ao enviar comprovante",
  receiptUploaded: "Comprovante enviado",
  uploading: "Enviando…",
  uploadReceipt: "Enviar comprovante",
  receiptFileRequirements: "JPEG, PNG ou WebP · Até 5 MB",
  selectReceiptPhoto: "Enviar foto",
  takeReceiptPhoto: "Tirar foto",
  removeReceiptPhoto: "Remover foto",
  receiptOnlineOnly:
    "Fotos exigem conexão; rascunhos offline não armazenam fotos. Remova a foto ou reconecte primeiro.",
  receiptFileTooLarge: "As fotos devem ter no máximo 5 MB",
  expenseSavedReceiptFailed:
    "Despesa criada, mas o envio do comprovante falhou. Tente novamente agora ou adicione-o depois pela lista de despesas.",
  retryReceiptUpload: "Tentar enviar comprovante novamente",
  receiptAlreadyAttached:
    "Esta despesa já tem um comprovante. Confira na lista de despesas; ele não será substituído automaticamente",
  uploadReceiptLater: "Enviar depois",
  expenseCreationUncertain:
    "Não podemos confirmar se a despesa foi criada. Verifique a lista de despesas antes de adicioná-la novamente; não tente de novo imediatamente.",
  viewReceipt: "Ver comprovante",
  noReceipt: "Sem comprovante",
  deleteReceipt: "Excluir comprovante",
  youCanUploadAnotherReceiptLaterTheExpenseWillNotBeDeleted:
    "Você pode enviar outro comprovante depois; a despesa não será excluída.",
  receiptDeleted: "Comprovante excluído",
  deleteThisReceipt: "Excluir este comprovante?",
  deleteName: (values: MessageValues) =>
    interpolate("Excluir “{name}”", values),
  thisCannotBeUndoneAllBalancesAndSettlementSuggestionsWillBeRecalculated:
    "Esta ação não pode ser desfeita. Todos os saldos e sugestões de acerto serão recalculados.",
  expenseDeleted: "Despesa excluída",
  deleteThisExpense: "Excluir esta despesa?",
  invalidSplitFormat: "Formato de divisão inválido",
  selectAtLeastOnePersonToSplitWith:
    "Selecione pelo menos uma pessoa com quem dividir",
  expenseChangesSaved: "Alterações da despesa salvas",
  expenseRecorded: "Despesa registrada",
  unableToSaveExpense: "Não foi possível salvar a despesa",
  reviewTheSplitPreviewBeforeSavingChanges:
    "Revise a prévia da divisão antes de salvar as alterações.",
  enterTheRequiredDetailsFirstCustomSplitsAndTagsAreAvailableBelow:
    "Preencha os dados obrigatórios primeiro. As divisões personalizadas e as etiquetas estão disponíveis abaixo.",
  editExpense: "Editar despesa",
  addExpense2: "Adicionar despesa",
  discardDraft: "Descartar rascunho",
  unsavedChangesWillBeLostExistingDataWillNotChange:
    "As alterações não salvas serão perdidas. Os dados existentes não mudarão.",
  discardThisDraft: "Descartar este rascunho?",
  description: "Descrição",
  dinnerHotelTrainTickets: "Jantar, hotel, passagens de trem",
  enterAnExpenseDescription: "Digite uma descrição da despesa",
  amount: "Valor",
  enterAnExpenseAmount: "Digite o valor da despesa",
  date: "Data",
  currency2: "Moeda",
  splitPreview: "Prévia da divisão",
  enterAnAmountToPreviewEachPersonsShare:
    "Digite um valor para ver a parte de cada pessoa.",
  namePaidAmount: (values: MessageValues) =>
    interpolate("{name} pagou {amount}", values),
  changePeopleAndSplitMethod: "Alterar pessoas e método de divisão",
  selectedSelectedOfTotal: (values: MessageValues) =>
    interpolate("Seleção: {selected} de {total}", values),
  selectAll: "Selecionar tudo",
  clear: "Limpar",
  splitMethod: "Método de divisão",
  splitEqually: "Dividir igualmente",
  exactAmounts: "Valores exatos",
  percentages: "Porcentagens",
  shares: "Cotas",
  nameSKind: (values: MessageValues) => interpolate("{kind} de {name}", values),
  moreDetails: "Mais detalhes",
  categoryAndTags: "Categoria e etiquetas",
  separateWithCommasForExampleBreakfastTransport:
    "Separe com vírgulas, por exemplo: café da manhã, transporte",
  unsavedChangesWillBeLost: "As alterações não salvas serão perdidas.",
  cancelEditing: "Cancelar edição?",
  saveChanges: "Salvar alterações",
  recordExpense: "Registrar despesa",
  settlementRepresentative: "Acerto atribuído a",
  settledByName: (values: MessageValues) =>
    interpolate("Acerto atribuído a {name}", values),
  settleSeparately: "Própria pessoa (acertar separadamente)",
  settlementRepresentativeHelp:
    "As despesas são divididas por pessoa; os saldos e as sugestões de acerto incluem o saldo líquido de cada pessoa em seu representante. Os representantes não podem ser atribuídos a outra pessoa.",
  representativeHasDependents:
    "Outros membros estão atribuídos a esta pessoa. Remova essas atribuições primeiro.",
  settlementRepresentativeUpdated: "Representante de acerto atualizado",
  unableToUpdateSettlementRepresentative:
    "Não foi possível atualizar o representante de acerto",
  provideParticipantChanges:
    "Informe os dados do participante que deseja atualizar",
  invalidSettlementRepresentative: "Representante de acerto inválido",
  settlementRepresentativeMustBeAnotherGroupMember:
    "O representante de acerto deve ser outro membro deste grupo",
  settlementRepresentativeCannotBeAssignedOrHaveDependents:
    "O representante de acerto não pode acertar por meio de outra pessoa, e esta pessoa não pode ter membros acertando por meio dela",
  invalidBackupSettlementRepresentative:
    "Representante de acerto inválido no backup",
  expenseParticipantAdded: "Participante de despesas adicionado",
  unableToAddPerson: "Não foi possível adicionar a pessoa",
  expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess:
    "Os participantes das despesas não precisam fazer login. Gerencie as contas com acesso em Configurações do grupo → Compartilhamento e acesso.",
  personsName: "Nome da pessoa",
  friendsName: "Nome do amigo",
  enterAName: "Digite um nome",
  archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants:
    "Grupos arquivados são somente leitura. Restaure este grupo para alterar os participantes.",
  usedByAPayment: "Usado em um pagamento",
  cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow: (
    values: MessageValues,
  ) =>
    interpolate(
      "Não é possível excluir: {reason}. Atualize as despesas relacionadas primeiro ou use a ferramenta de mesclagem abaixo.",
      values,
    ),
  deleteName2: (values: MessageValues) => interpolate("Excluir {name}", values),
  thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone:
    "Esta pessoa não tem despesas nem pagamentos. A exclusão não pode ser desfeita.",
  expenseParticipantDeleted: "Participante de despesas excluído",
  deleteThisExpenseParticipant: "Excluir este participante de despesas?",
  nameUpdated: "Nome atualizado",
  unableToUpdateName: "Não foi possível atualizar o nome",
  rename: "Renomear",
  renameName: (values: MessageValues) => interpolate("Renomear {name}", values),
  existingExpensesAndPaymentsWillRemainLinkedToThisPerson:
    "As despesas e os pagamentos existentes continuarão vinculados a esta pessoa.",
  newName: "Novo nome",
  saveName: "Salvar nome",
  advancedPeopleTools: "Ferramentas avançadas de pessoas",
  mergeDuplicatePeople: "Mesclar pessoas duplicadas",
  sourcePerson: "Pessoa de origem",
  targetPerson: "Pessoa de destino",
  mergeInto: "Mesclar com",
  changePreview: "Prévia da alteração",
  expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted:
    (values: MessageValues) =>
      interpolate(
        "As despesas relacionadas ({expenses}) e os pagamentos ({payments}) de {source} serão transferidos para {target}; depois, a pessoa de origem será excluída.",
        values,
      ),
  mergePeople: "Mesclar pessoas",
  sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically: (
    values: MessageValues,
  ) =>
    interpolate(
      "{source} será excluído e os dados relacionados serão transferidos para {target} em uma única operação atômica.",
      values,
    ),
  expenseParticipantsMerged: "Participantes de despesas mesclados",
  mergeFailed: "Falha ao mesclar",
  applyMerge: "Aplicar mesclagem?",
  previewAndMerge: "Visualizar e mesclar",
} satisfies CatalogShape<typeof zhTW>;
