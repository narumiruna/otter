import {
  interpolate,
  type MessageValues,
  pluralForm,
} from "./message-types.js";

export const ptSettings = {
  groupSettings: "Configurações do grupo",
  manageSharingGroupPreferencesAndDataToolsHighImpactActionsRequireConfirmation:
    "Gerencie o compartilhamento, as preferências do grupo e as ferramentas de dados. Ações de alto impacto exigem confirmação.",
  youAreACollaboratorAndCanUseDataToolsOnlyTheOwnerCanManageAccessAndGroupSettings:
    "Você é um colaborador e pode usar as ferramentas de dados. Apenas o proprietário pode gerenciar o acesso e as configurações do grupo.",
  sharingAndAccess: "Compartilhamento e acesso",
  linksActiveLinksCollaboratorsCollaborators: (values: MessageValues) =>
    interpolate(
      "Links ativos: {links} · Colaboradores: {collaborators}",
      values,
    ),
  shareLinkCreated: "Link de compartilhamento criado",
  shareLinkCreatedAndCopied: "Link de compartilhamento criado e copiado",
  shareLinks: "Links de compartilhamento",
  chooseWhoCanEditThroughTheShareLink:
    "Escolha quem pode visualizar ou editar usando este link.",
  linkPermission: "Permissão do link",
  readOnlyLink: "Somente leitura (sem login)",
  signedInEditLink: "Editar após fazer login",
  anyoneEditLink: "Qualquer pessoa com o link pode editar",
  signedInEditLinkDescription:
    "Após fazer login ou se cadastrar, os visitantes se tornam colaboradores. Revogar o link não remove as pessoas que já entraram.",
  anyoneEditLinkDescription:
    "Qualquer pessoa com o link pode editar despesas e participantes sem fazer login. Compartilhe apenas com pessoas de confiança; a revogação tem efeito imediato.",
  revokingSignedInLinkDoesNotRemoveExistingCollaborators:
    "A revogação impede novas entradas. Os colaboradores existentes ainda podem editar; remova o acesso deles separadamente.",
  signInToEditSharedGroup: (values: MessageValues) =>
    interpolate("Entre ou crie uma conta para editar {name}.", values),
  readOnlyShareLinkCreated: "Link de compartilhamento somente leitura criado",
  readOnlyShareLinkCreatedAndCopied:
    "Link de compartilhamento somente leitura criado e copiado",
  shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually:
    "Link de compartilhamento criado. Seu navegador bloqueou a cópia automática; copie manualmente.",
  unableToCreateLink: "Não foi possível criar o link",
  shareLinkCopied: "Link de compartilhamento copiado",
  yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar:
    "Seu navegador bloqueou a cópia. Abra o link e copie da barra de endereços.",
  anyoneWithTheLinkCanViewExpensesBalancesAndSettlementsWithoutSigningInButCannotEdit:
    "Qualquer pessoa com o link pode visualizar despesas, saldos e acertos sem fazer login, mas não pode editar.",
  readOnlyShareLinks: "Links de compartilhamento somente leitura",
  createReadOnlyLink: "Criar link somente leitura",
  anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData:
    "Qualquer pessoa com o link pode visualizar as despesas, os saldos e as sugestões de acerto deste grupo, mas não pode adicionar nem alterar dados.",
  createAShareLink: "Criar um link de compartilhamento?",
  createShareLink: "Criar link de compartilhamento",
  revoked: "Revogado",
  active: "Ativo",
  openLink: "Abrir link",
  copy: "Copiar",
  revokeLink: "Revogar link",
  afterRevocationTheOldLinkWillImmediatelyStopWorking:
    "Após a revogação, o link antigo deixará de funcionar imediatamente.",
  shareLinkRevoked: "Link de compartilhamento revogado",
  revokeThisShareLink: "Revogar este link de compartilhamento?",
  revoke: "Revogar",
  noShareLinksYet: "Ainda não há links de compartilhamento.",
  collaboratorAdded: "Colaborador adicionado",
  unableToAddCollaborator: "Não foi possível adicionar o colaborador",
  collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings:
    "Os colaboradores devem ser usuários existentes. Eles podem gerenciar despesas e participantes, mas não as configurações do proprietário.",
  existingUsersUsername: "Nome de usuário de um usuário existente",
  addCollaborator: "Adicionar colaborador",
  removeName: (values: MessageValues) => interpolate("Remover {name}", values),
  thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain:
    "Esta conta não poderá mais gerenciar o grupo. Os dados de despesas existentes serão mantidos.",
  collaboratorRemoved: "Colaborador removido",
  removeCollaborator: "Remover colaborador?",
  remove: "Remover",
  dataAndExport: "Dados e exportação",
  csvPrintBackupAndRestore: "CSV, impressão, backup e restauração",
  exportingDoesNotChangeGroupData: "A exportação não altera os dados do grupo.",
  exportAndPrint: "Exportar e imprimir",
  expenseCsvExported: "CSV de despesas exportado",
  exportExpenseCsv: "Exportar CSV de despesas",
  settlementCsvExported: "CSV de acertos exportado",
  exportSettlementCsv: "Exportar CSV de acertos",
  print: "Imprimir",
  completeBackupDownloaded: "Backup completo baixado",
  downloadFailed: "Falha ao baixar",
  downloadCompleteBackup: "Baixar backup completo",
  expenseCsvImported: "CSV de despesas importado",
  importFailed: "Falha ao importar",
  allRowsAreCheckedFirstNoDataIsWrittenIfAnyRowHasAnError:
    "Todas as linhas são verificadas primeiro. Nenhum dado é gravado se alguma linha tiver um erro.",
  importExpenseCsv: "Importar CSV de despesas",
  chooseCsv: "Escolher CSV",
  importPreview: "Prévia da importação",
  rowsRowsCanBeImportedErrorsErrors: (values: MessageValues) =>
    interpolate(
      "Linhas que podem ser importadas: {rows}; erros: {errors}.",
      values,
    ),
  rowRowMessage: (values: MessageValues) =>
    interpolate("Linha {row}: {message}", values),
  importCountExpenses: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "Importar {count} despesa",
        other: "Importar {count} despesas",
      }),
      values,
    ),
  thisWillAddCountExpensesAtOnceAndRecalculateBalances: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "Isso adicionará {count} despesa de uma vez e recalculará os saldos.",
        other:
          "Isso adicionará {count} despesas de uma vez e recalculará os saldos.",
      }),
      values,
    ),
  applyCsvImport: "Aplicar importação CSV?",
  applyImport: "Aplicar importação",
  invalidBackupFormat: "Formato de backup inválido",
  backupRestoredAsANewGroup: "Backup restaurado como um novo grupo",
  restoreFailed: "Falha ao restaurar",
  restoringCreatesANewGroupAndDoesNotOverwriteCurrentData:
    "A restauração cria um novo grupo e não substitui os dados atuais.",
  restoreJsonBackup: "Restaurar backup JSON",
  chooseJsonBackup: "Escolher backup JSON",
  restorePreviewName: (values: MessageValues) =>
    interpolate("Prévia da restauração: {name}", values),
  peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency: (
    values: MessageValues,
  ) =>
    interpolate(
      "Pessoas: {people} · Despesas: {expenses} · Pagamentos: {payments} · Moeda base: {currency}",
      values,
    ),
  createNewGroup: "Criar novo grupo",
  aNewGroupNamedNameWillBeCreatedWithoutChangingExistingGroups: (
    values: MessageValues,
  ) =>
    interpolate(
      "Um novo grupo chamado “{name}” será criado sem alterar os grupos existentes.",
      values,
    ),
  restoreThisBackup: "Restaurar este backup?",
  createNewGroup2: "Criar novo grupo",
  copyGroup: "Duplicar grupo",
  copyThisGroup: "Duplicar este grupo?",
  copyGroupDescription:
    "Copie pessoas, moeda base e taxas personalizadas para um novo grupo. Despesas, pagamentos de acerto, colaboradores e links de compartilhamento não são copiados. O grupo original permanece inalterado.",
  groupCopied: "Grupo duplicado",
  groupPreferences: "Preferências do grupo",
  changingTheBaseCurrencyRecalculatesDisplayedAmountsAndClearsCustomExchangeRates:
    "Alterar a moeda base recalcula os valores exibidos e limpa as taxas de câmbio personalizadas.",
  nameAndBaseCurrency: "Nome e moeda base",
  totalSpendingWillDisplayAsAmountBalancesAndSettlementsBelowWillBeConverted: (
    values: MessageValues,
  ) =>
    interpolate(
      "O gasto total será exibido como {amount}; os saldos e os acertos abaixo serão convertidos.",
      values,
    ),
  expectCountSettlementSuggestionsCustomRatesWillResetToBuiltInValues: (
    values: MessageValues,
  ) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "Previsão de {count} sugestão de acerto; as taxas personalizadas serão redefinidas para os padrões do Bank of Taiwan.",
        other:
          "Previsão de {count} sugestões de acerto; as taxas personalizadas serão redefinidas para os padrões do Bank of Taiwan.",
      }),
      values,
    ),
  cancelChanges: "Cancelar alterações",
  applyGroupPreferences: "Aplicar preferências do grupo",
  changeTheBaseCurrencyToCurrencyRecalculateAllResultsAndClearCustomRates: (
    values: MessageValues,
  ) =>
    interpolate(
      "Alterar a moeda base para {currency}, recalcular todos os resultados e limpar as taxas personalizadas.",
      values,
    ),
  renameTheGroupToName: (values: MessageValues) =>
    interpolate("Renomear o grupo para “{name}”.", values),
  applyTheseChanges: "Aplicar estas alterações?",
  applyChanges: "Aplicar alterações",
  groupPreferencesApplied: "Preferências do grupo aplicadas",
  saveFailed: "Falha ao salvar",
  customExchangeRatesApplied: "Taxas de câmbio personalizadas aplicadas",
  unableToSaveExchangeRates: "Não foi possível salvar as taxas de câmbio",
  currencyConversion: "Conversão de moedas",
  countCustomRates: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "{count} taxa personalizada",
        other: "{count} taxas personalizadas",
      }),
      values,
    ),
  setHowMuch1UnitOfEachCurrencyEqualsInCurrencyLeaveBlankToUseTheBuiltInFixedRate:
    (values: MessageValues) =>
      interpolate(
        "Defina quanto 1 unidade de cada moeda equivale em {currency}. Taxas não definidas usam automaticamente as taxas médias à vista do Bank of Taiwan.",
        values,
      ),
  customExchangeRates: "Taxas de câmbio personalizadas",
  bankOfTaiwanSpotMidRateDescription:
    "Novas despesas sem taxas personalizadas usam a média das cotações à vista do Bank of Taiwan e mantêm essa cotação. Limpar as taxas personalizadas afeta as despesas futuras; os pagamentos continuam usando as taxas atuais.",
  loadBankOfTaiwanSpotMidRates: "Carregar taxas padrão do Bank of Taiwan",
  loadingBankExchangeRates: "Carregando taxas de câmbio do banco…",
  bankOfTaiwanSpotMidRatesLoadedAtTime: (values: MessageValues) =>
    interpolate(
      "Taxas médias à vista do Bank of Taiwan carregadas ({time}).",
      values,
    ),
  bankOfTaiwanDefaultRatesApplied: "Taxas padrão do Bank of Taiwan restauradas",
  unableToLoadBankExchangeRates:
    "As taxas de câmbio do banco estão indisponíveis no momento. Tente novamente mais tarde.",
  conversionPreview: "Prévia da conversão",
  totalSpendingAmountCountSettlementSuggestions: (values: MessageValues) =>
    interpolate(
      pluralForm("pt", values.count, {
        one: "Gasto total: {amount} · {count} sugestão de acerto.",
        other: "Gasto total: {amount} · {count} sugestões de acerto.",
      }),
      values,
    ),
  applyRates: "Aplicar taxas",
  allTotalsBalancesAndSettlementSuggestionsWillBeRecalculatedWithTheseRates:
    "As despesas existentes mantêm suas taxas. Despesas novas ou com conversão recalculada e pagamentos existentes usam as taxas atualizadas.",
  applyCustomExchangeRates: "Aplicar taxas de câmbio personalizadas?",
  restoreBankOfTaiwanDefaultRates:
    "Restaurar as taxas padrão do Bank of Taiwan?",
  apiWriteSettings: "Acesso de gravação da API",
  apiWritesAllowed: "Permitido",
  apiWritesBlocked: "Não permitido",
  apiWriteSettingsDescription:
    "Por padrão, os tokens de API e a CLI não podem alterar este grupo. Ao ativar, os membros com tokens de API podem editar de acordo com suas permissões. As ações no navegador não são afetadas.",
  allowApiWrites: "Permitir alterações via token de API",
  apiWriteSettingSaved: "Acesso de gravação da API atualizado",
  groupLifecycle: "Ciclo de vida do grupo",
  archivedReadOnly: "Arquivado · somente leitura",
  active2: "Ativo",
  afterRestoringDataCanBeAddedAndChangedAgain:
    "Após a restauração, será possível adicionar e alterar dados novamente.",
  archivingPreservesAllDataButMakesTheGroupReadOnly:
    "O arquivamento preserva todos os dados, mas torna o grupo somente leitura.",
  restoreGroup: "Restaurar grupo",
  archiveGroup: "Arquivar grupo",
  afterRestoringTheOwnerAndCollaboratorsCanEditDataAgain:
    "Após a restauração, o proprietário e os colaboradores poderão editar os dados novamente.",
  expensesPeopleAndPaymentRecordsArePreservedAndCannotBeChangedWhileArchived:
    "Despesas, pessoas e registros de pagamento são preservados e não podem ser alterados enquanto o grupo estiver arquivado.",
  groupRestored: "Grupo restaurado",
  groupArchived: "Grupo arquivado",
  restoreThisGroup: "Restaurar este grupo?",
  archiveThisGroup: "Arquivar este grupo?",
  thisPermanentlyDeletesAllPeopleExpensesReceiptsAndSettlementRecordsAndCannotBeUndone:
    "Isso exclui permanentemente todas as pessoas, despesas, comprovantes e registros de acerto e não pode ser desfeito.",
  deleteGroup: "Excluir grupo",
  enterNameToConfirm: (values: MessageValues) =>
    interpolate("Digite “{name}” para confirmar", values),
  permanentlyDeleteName: (values: MessageValues) =>
    interpolate("Excluir permanentemente “{name}”", values),
  thisCannotBeUndoneCancelingMakesNoChanges:
    "Esta ação não pode ser desfeita. Cancelar não faz nenhuma alteração.",
  permanentlyDeleteThisGroup: "Excluir permanentemente este grupo?",
  permanentlyDeleteGroup: "Excluir grupo permanentemente",
  groupDeleted: "Grupo excluído",
  readOnlyShare: "Compartilhamento somente leitura",
  youCanViewExpensesBalancesAndSettlementSuggestionsButCannotEditData:
    "Você pode visualizar despesas, saldos e sugestões de acerto, mas não pode editar os dados.",
  completeExpenseHistory: "Histórico completo de despesas",
  manageGroupSettings: "Gerenciar configurações do grupo",
  csvImportFailed: "Falha na importação CSV",
  theCsvHasNoData: "O CSV não contém dados",
  missingColumnsColumns: (values: MessageValues) =>
    interpolate("Colunas ausentes: {columns}", values),
  participantNotFoundName: (values: MessageValues) =>
    interpolate("Participante não encontrado: {name}", values),
  invalidJsonFormat: "Formato JSON inválido",
  incorrectUsernameOrPassword: "Nome de usuário ou senha incorretos",
  everyPersonNeedsAnAmountForACustomSplit:
    "Cada pessoa precisa de um valor para uma divisão personalizada",
  unsupportedBackupVersion: "Versão de backup não compatível",
  unsupportedSplitMethod: "Método de divisão não compatível",
  unsupportedExchangeRateCurrency: "Moeda da taxa de câmbio não compatível",
  unsupportedBaseCurrency: "Moeda base não compatível",
  unsupportedCurrency: "Moeda não compatível",
  aParticipantCannotBeMergedIntoThemselves:
    "Um participante não pode ser mesclado consigo mesmo",
  theOwnerCannotBeRemoved: "O proprietário não pode ser removido",
  thePayerAndRecipientMustBeDifferent:
    "O pagador e o destinatário devem ser diferentes",
  payerIsRequired: "É necessário informar o pagador",
  thePayerMustBeAParticipant: "O pagador deve ser um participante",
  serverError: "Erro do servidor",
  invalidPaymentRecordsInBackup: "Registros de pagamento inválidos no backup",
  splitTotalsInBackupAreInvalid: "Os totais de divisão no backup são inválidos",
  invalidSplitDataInBackup: "Dados de divisão inválidos no backup",
  invalidExchangeRatesInBackup: "Taxas de câmbio inválidas no backup",
  invalidParticipantDataInBackup: "Dados de participantes inválidos no backup",
  backupContainsDuplicateParticipants:
    "O backup contém participantes duplicados",
  invalidBaseCurrencyInBackup: "Moeda base inválida no backup",
  invalidExpenseCategoryInBackup: "Categoria de despesa inválida no backup",
  anExpenseParticipantInTheBackupDoesNotExist:
    "Um participante de uma despesa no backup não existe",
  anExpenseInTheBackupHasDuplicateParticipants:
    "Uma despesa no backup tem participantes duplicados",
  invalidExpenseDataInBackup: "Dados de despesas inválidos no backup",
  invalidExpenseTagsInBackup: "Etiquetas de despesas inválidas no backup",
  invalidTripNameInBackup: "Nome de viagem inválido no backup",
  backupIsMissingItsTrip: "A viagem está ausente no backup",
  backupIsMissingParticipants: "Os participantes estão ausentes no backup",
  backupIsMissingExpenses: "As despesas estão ausentes no backup",
  notesCanBeUpTo160Characters: "As observações podem ter até 160 caracteres",
  theShareLinkIsInvalidOrHasBeenRevoked:
    "O link de compartilhamento é inválido ou foi revogado",
  atLeastOneSplitParticipantIsRequired:
    "É necessário pelo menos um participante na divisão",
  splitParticipantsMustBelongToTheTrip:
    "Os participantes da divisão devem pertencer à viagem",
  splitAmountsMustAddUpToTheExpenseAmount:
    "A soma dos valores da divisão deve ser igual ao valor da despesa",
  splitAmountsMustBeGreaterThan0:
    "Os valores da divisão devem ser maiores que 0",
  invalidSplitAmount: "Valor de divisão inválido",
  invalidCategoryOrTagFormat: "Formato de categoria ou etiqueta inválido",
  exchangeRatesMustBeGreaterThan0: "As taxas de câmbio devem ser maiores que 0",
  invalidExchangeRateFormat: "Formato de taxa de câmbio inválido",
  aParticipantWithThisNameAlreadyExists:
    "Já existe um participante com este nome",
  thisParticipantHasPaymentRecordsAndCannotBeDeleted:
    "Este participante tem registros de pagamento e não pode ser excluído",
  thisParticipantHasExpensesAndCannotBeDeleted:
    "Este participante tem despesas e não pode ser excluído",
  onlyTheOwnerCanDownloadACompleteBackup:
    "Apenas o proprietário pode baixar um backup completo",
  onlyTheOwnerCanManageShareLinks:
    "Apenas o proprietário pode gerenciar os links de compartilhamento",
  onlyTheOwnerCanManageCollaborators:
    "Apenas o proprietário pode gerenciar os colaboradores",
  onlyTheOwnerCanManageTripSettings:
    "Apenas o proprietário pode gerenciar as configurações da viagem",
  namesCanBeUpTo80Characters: "Os nomes podem ter até 80 caracteres",
  passwordMustBeAtLeast8Characters3: "A senha deve ter pelo menos 8 caracteres",
  invalidArchiveStatus: "Status de arquivamento inválido",
  invalidApiWriteSetting: "Configuração de acesso de gravação da API inválida",
  onlyBrowserSessionsCanManageApiWrites:
    "Apenas sessões do navegador podem gerenciar o acesso de gravação da API",
  apiWritesDisabledForThisGroup:
    "Este grupo não permite alterações via token de API",
  apiEndpointNotFound: "Endpoint da API não encontrado",
  paymentRecordNotFound: "Registro de pagamento não encontrado",
  collaboratorNotFound: "Colaborador não encontrado",
  participantNotFound: "Participante não encontrado",
  noActiveShareLinkWasFound:
    "Nenhum link de compartilhamento ativo foi encontrado",
  expenseNotFound: "Despesa não encontrada",
  receiptNotFound: "Comprovante não encontrado",
  tripNotFound: "Viagem não encontrada",
  userNotFound: "Usuário não encontrado",
  descriptionMustBe1120Characters: "A descrição deve ter de 1 a 120 caracteres",
  theOwnerIsAlreadyInTheCollaboratorList:
    "O proprietário já está na lista de colaboradores",
  thisGroupIsArchivedRestoreItBeforeEditing:
    "Este grupo está arquivado. Restaure-o antes de editar.",
  receiptsMustBeJpegPngOrWebpImages:
    "Os comprovantes devem ser imagens JPEG, PNG ou WebP",
  theRecipientMustBeAParticipant: "O destinatário deve ser um participante",
  aTripWithThisNameAlreadyExists: "Já existe uma viagem com este nome",
  dateMustUseTheYyyyMmDdFormat: "A data deve usar o formato YYYY-MM-DD",
  upTo10TagsAreAllowed: "São permitidas até 10 etiquetas",
  tagsCanBeUpTo24Characters: "As etiquetas podem ter até 24 caracteres",
  invalidTagFormat: "Formato de etiqueta inválido",
  theTargetParticipantMustBelongToTheTrip:
    "O participante de destino deve pertencer à viagem",
  signInFirst: "Faça login primeiro",
  provideExpenseChanges: "Informe as alterações da despesa",
  provideTripChanges: "Informe as alterações da viagem",
  requestBodyIsTooLarge: "O corpo da solicitação é muito grande",
  selectAtLeastOneSplitParticipant:
    "Selecione pelo menos um participante para a divisão",
  enterATripNameOf1100Characters:
    "Digite um nome de viagem de 1 a 100 caracteres",
  enterAnExpenseDescriptionOf1120Characters:
    "Digite uma descrição da despesa de 1 a 120 caracteres",
  enterAParticipantNameOf180Characters:
    "Digite um nome de participante de 1 a 80 caracteres",
  enterAUsernameAndPassword: "Digite um nome de usuário e uma senha",
  enterSplitValues: "Digite os valores da divisão",
  enterAValidPaymentDate: "Digite uma data de pagamento válida",
  enterValidSplitShares: "Digite cotas de divisão válidas",
  enterValidSplitPercentages: "Digite porcentagens de divisão válidas",
  enterValidSplitAmounts: "Digite valores de divisão válidos",
  enterAValidExpenseDate: "Digite uma data de despesa válida",
  chooseACsvFile: "Escolha um arquivo CSV",
  selectSplitParticipants: "Selecione os participantes da divisão",
  chooseAReceiptImage: "Escolha uma imagem de comprovante",
  thisUserIsAlreadyACollaborator: "Este usuário já é um colaborador",
  thisUsernameIsAlreadyRegistered: "Este nome de usuário já está registrado",
  usernameIsBeingRegisteredOrAlreadyRegistered:
    "Este nome de usuário está sendo registrado ou já está em uso",
  usernameIsBeingRegistered: "Este nome de usuário está sendo registrado",
  usernameOrPasskeyAlreadyRegistered:
    "Este nome de usuário ou Passkey já está registrado",
  invalidAmount: "Valor inválido",
  theDefaultDevelopmentAccountsUsernameCannotBeChanged:
    "O nome de usuário da conta padrão de desenvolvimento não pode ser alterado",
  language: "Idioma",
  english: "Inglês",
  traditionalChinese: "Chinês tradicional",
};
