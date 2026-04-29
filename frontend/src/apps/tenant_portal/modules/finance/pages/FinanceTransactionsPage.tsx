import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppFilterGrid, AppTableWrap, AppToolbar } from "../../../../../design-system/AppLayout";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import {
  currentDateTimeLocalInputValue,
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../utils/dateTimeLocal";
import { displayPlatformCode } from "../../../../../utils/platform-labels";
import type { ApiError } from "../../../../../types";
import { FinanceHelpBubble } from "../components/common/FinanceHelpBubble";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { hasTenantPermission } from "../../../utils/tenant-permissions";
import {
  getTenantFinanceAccounts,
  type TenantFinanceAccount,
} from "../services/accountsService";
import {
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../services/categoriesService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  getTenantFinanceTags,
  type TenantFinanceTag,
} from "../services/tagsService";
import {
  createTenantFinanceTransaction,
  deleteTenantFinanceTransactionAttachment,
  downloadTenantFinanceTransactionAttachment,
  getTenantFinanceAccountBalances,
  getTenantFinanceSummary,
  getTenantFinanceTransactionDetail,
  getTenantFinanceTransactions,
  getTenantFinanceUsage,
  uploadTenantFinanceTransactionAttachment,
  voidTenantFinanceTransaction,
  updateTenantFinanceTransaction,
  updateTenantFinanceTransactionFavorite,
  updateTenantFinanceTransactionReconciliation,
  updateTenantFinanceTransactionsFavoriteBatch,
  updateTenantFinanceTransactionsReconciliationBatch,
  type TenantFinanceAccountBalance,
  type TenantFinanceTransactionFilters,
  type TenantFinanceSummaryResponse,
  type TenantFinanceTransaction,
  type TenantFinanceTransactionAttachment,
  type TenantFinanceTransactionDetailResponse,
  type TenantFinanceUsageResponse,
} from "../services/transactionsService";
import { useTransactionFilters } from "../hooks/useTransactionFilters";

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type AttachmentPreviewModalState = {
  attachmentId: number;
  fileName: string;
  previewUrl: string;
};

type TransactionFormState = {
  transactionType: string;
  accountId: string;
  targetAccountId: string;
  categoryId: string;
  tagIds: string[];
  currencyId: string;
  amount: string;
  exchangeRate: string;
  transactionAt: string;
  description: string;
  notes: string;
  isReconciled: boolean;
  isFavorite: boolean;
};

function buildDefaultFormState(timeZone?: string | null): TransactionFormState {
  return {
    transactionType: "expense",
    accountId: "",
    targetAccountId: "",
    categoryId: "",
    tagIds: [],
    currencyId: "",
    amount: "",
    exchangeRate: "",
    transactionAt: currentDateTimeLocalInputValue(timeZone),
    description: "",
    notes: "",
    isReconciled: false,
    isFavorite: false,
  };
}

export function FinanceTransactionsPage() {
  const { session, effectiveTimeZone, tenantUser } = useTenantAuth();
  const { language } = useLanguage();
  const canManageAllFinance = hasTenantPermission(tenantUser, "tenant.finance.manage");
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<TenantFinanceTransaction[]>([]);
  const [summaryResponse, setSummaryResponse] =
    useState<TenantFinanceSummaryResponse | null>(null);
  const [usageResponse, setUsageResponse] =
    useState<TenantFinanceUsageResponse | null>(null);
  const [accountBalances, setAccountBalances] = useState<TenantFinanceAccountBalance[]>([]);
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [tags, setTags] = useState<TenantFinanceTag[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] =
    useState<TenantFinanceTransactionDetailResponse["data"] | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);
  const [formState, setFormState] = useState<TransactionFormState>(() =>
    buildDefaultFormState()
  );
  const [reconciliationNote, setReconciliationNote] = useState("");
  const [reconciliationReasonCode, setReconciliationReasonCode] =
    useState<ReconciliationReasonCode>("operator_review");
  const [reconciliationConfirmation, setReconciliationConfirmation] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [usageError, setUsageError] = useState<ApiError | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [createAttachmentFile, setCreateAttachmentFile] = useState<File | null>(null);
  const [createAttachmentNotes, setCreateAttachmentNotes] = useState("");
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<number, string>>(
    {}
  );
  const [attachmentPreviewModal, setAttachmentPreviewModal] =
    useState<AttachmentPreviewModalState | null>(null);
  const [isAttachmentSubmitting, setIsAttachmentSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [deepLinkedTransactionId, setDeepLinkedTransactionId] = useState<number | null>(null);
  const { filters, setFilters } = useTransactionFilters<{
    transactionType: string;
    accountId: string;
    categoryId: string;
    tagId: string;
    favorite: string;
    reconciliation: string;
    search: string;
  }>({
    transactionType: "",
    accountId: "",
    categoryId: "",
    tagId: "",
    favorite: "",
    reconciliation: "",
    search: "",
  });

  const summary = summaryResponse?.data;
  const usage = usageResponse?.data;
  const baseCurrency =
    currencies.find((currency) => currency.is_base) || currencies[0] || null;
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const currencyMap = useMemo(
    () => new Map(currencies.map((currency) => [currency.id, currency])),
    [currencies]
  );
  const accountBalanceCurrencyIds = useMemo(
    () =>
      Array.from(
        new Set(
          accountBalances
            .filter((item) => !item.is_balance_hidden)
            .map((item) => item.currency_id)
        )
      ),
    [accountBalances]
  );
  const hasMixedVisibleAccountCurrencies = accountBalanceCurrencyIds.length > 1;
  const totalAccountBalanceHint = hasMixedVisibleAccountCurrencies
    ? language === "es"
      ? `Suma visible solo en moneda base (${baseCurrency?.code || "base"}). Revisa Balances por cuenta para otras monedas.`
      : `Visible total only in base currency (${baseCurrency?.code || "base"}). Review Account balances for other currencies.`
    : language === "es"
      ? "Suma de saldos iniciales y movimientos por cuenta."
      : "Sum of opening balances and account movements.";
  const previewCleanupRef = useRef<string[]>([]);
  const deepLinkedTransactionHandledRef = useRef<number | null>(null);
  const selectedAttachmentPreviewDependency = useMemo(() => {
    if (!selectedTransactionDetail) {
      return "";
    }
    return selectedTransactionDetail.attachments
      .map((attachment) => `${attachment.id}:${attachment.file_name}:${attachment.content_type || ""}`)
      .join("|");
  }, [selectedTransactionDetail]);

  const filteredCategories = useMemo(() => {
    if (formState.transactionType === "transfer") {
      return [];
    }
    return categories.filter((category) => {
      if (!category.is_active) {
        return false;
      }
      return category.category_type === formState.transactionType;
    });
  }, [categories, formState.transactionType]);

  useEffect(() => {
    const transactionIdRaw = searchParams.get("transactionId");
    const transactionId =
      transactionIdRaw && Number.isInteger(Number(transactionIdRaw))
        ? Number(transactionIdRaw)
        : null;
    setDeepLinkedTransactionId(transactionId);
    setFilters((current) => ({
      ...current,
      transactionType: searchParams.get("transactionType") ?? current.transactionType,
      accountId: searchParams.get("accountId") ?? current.accountId,
      categoryId: searchParams.get("categoryId") ?? current.categoryId,
      tagId: searchParams.get("tagId") ?? current.tagId,
      favorite: searchParams.get("favorite") ?? current.favorite,
      reconciliation: searchParams.get("reconciliation") ?? current.reconciliation,
      search: searchParams.get("search") ?? current.search,
    }));
  }, [searchParams, setFilters]);

  useEffect(() => {
    void loadFinanceWorkspace();
  }, [
    session?.accessToken,
    filters.transactionType,
    filters.accountId,
    filters.categoryId,
    filters.tagId,
    filters.favorite,
    filters.reconciliation,
    filters.search,
  ]);

  useEffect(() => {
    if (!formState.currencyId && baseCurrency) {
      setFormState((current) => ({
        ...current,
        currencyId: String(baseCurrency.id),
      }));
    }
    if (!formState.accountId && accounts.length > 0) {
      setFormState((current) => ({
        ...current,
        accountId: current.accountId || String(accounts[0].id),
      }));
    }
  }, [accounts, baseCurrency, formState.accountId, formState.currencyId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAttachmentPreviews() {
      if (!session?.accessToken || !selectedTransactionDetail) {
        setAttachmentPreviewUrls({});
        return;
      }

      previewCleanupRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewCleanupRef.current = [];

      const previewableAttachments = selectedTransactionDetail.attachments.filter(
        isImageAttachment
      );
      if (previewableAttachments.length === 0) {
        setAttachmentPreviewUrls({});
        return;
      }

      const nextPreviewUrls: Record<number, string> = {};
      for (const attachment of previewableAttachments) {
        try {
          const result = await downloadTenantFinanceTransactionAttachment(
            session.accessToken,
            selectedTransactionDetail.transaction.id,
            attachment.id
          );
          const previewUrl = URL.createObjectURL(result.blob);
          previewCleanupRef.current.push(previewUrl);
          nextPreviewUrls[attachment.id] = previewUrl;
        } catch {
          // Degrade silently when a preview cannot be generated.
        }
      }

      if (!isCancelled) {
        setAttachmentPreviewUrls(nextPreviewUrls);
        setAttachmentPreviewModal((current) => {
          if (!current) {
            return current;
          }
          const refreshedPreviewUrl = nextPreviewUrls[current.attachmentId];
          if (!refreshedPreviewUrl) {
            return null;
          }
          return { ...current, previewUrl: refreshedPreviewUrl };
        });
        return;
      }

      previewCleanupRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewCleanupRef.current = [];
    }

    void loadAttachmentPreviews();

    return () => {
      isCancelled = true;
    };
  }, [selectedAttachmentPreviewDependency, selectedTransactionDetail, session?.accessToken]);

  useEffect(() => {
    return () => {
      previewCleanupRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewCleanupRef.current = [];
    };
  }, []);

  async function loadFinanceWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsageError(null);

    const results = await Promise.allSettled([
      getTenantFinanceTransactions(session.accessToken, buildApiFilters(filters)),
      getTenantFinanceSummary(session.accessToken),
      getTenantFinanceUsage(session.accessToken),
      canManageAllFinance
        ? getTenantFinanceAccountBalances(session.accessToken)
        : Promise.resolve({ data: [] as TenantFinanceAccountBalance[] }),
      getTenantFinanceAccounts(session.accessToken, false),
      getTenantFinanceCategories(session.accessToken, { includeInactive: false }),
      getTenantFinanceTags(session.accessToken),
      getTenantFinanceCurrencies(session.accessToken, false),
    ]);

    const [
      transactionsResult,
      summaryResult,
      usageResult,
      balancesResult,
      accountsResult,
      categoriesResult,
      tagsResult,
      currenciesResult,
    ] = results;

    if (
      transactionsResult.status === "rejected" &&
      summaryResult.status === "rejected" &&
      balancesResult.status === "rejected"
    ) {
      setTransactions([]);
      setSummaryResponse(null);
      setUsageResponse(null);
      setAccountBalances([]);
      setAccounts([]);
      setCategories([]);
      setTags([]);
      setCurrencies([]);
      setError(transactionsResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setTransactions(
      transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []
    );
    setSelectedTransactionIds((current) =>
      current.filter((transactionId) =>
        (transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []).some(
          (transaction) => transaction.id === transactionId
        )
      )
    );
    setSummaryResponse(summaryResult.status === "fulfilled" ? summaryResult.value : null);

    if (usageResult.status === "fulfilled") {
      setUsageResponse(usageResult.value);
    } else {
      setUsageResponse(null);
      setUsageError(usageResult.reason as ApiError);
    }

    setAccountBalances(balancesResult.status === "fulfilled" ? balancesResult.value.data : []);
    setAccounts(accountsResult.status === "fulfilled" ? accountsResult.value.data : []);
    setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.data : []);
    setTags(tagsResult.status === "fulfilled" ? tagsResult.value.data : []);
    setCurrencies(currenciesResult.status === "fulfilled" ? currenciesResult.value.data : []);
    setIsLoading(false);
  }

  async function runRowAction(action: () => Promise<void>) {
    setIsActionSubmitting(true);
    setActionFeedback(null);
    try {
      await action();
      await loadFinanceWorkspace();
      if (selectedTransactionId) {
        await fetchTransactionDetail(selectedTransactionId);
      }
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function loadTransactionDetail(transactionId: number) {
    if (!session?.accessToken) {
      return;
    }

    setSelectedTransactionId(transactionId);
    setIsTransactionDetailOpen(true);
    await fetchTransactionDetail(transactionId);
  }

  async function openTransactionAttachments(transactionId: number) {
    if (!session?.accessToken) {
      return;
    }
    setSelectedTransactionId(transactionId);
    setIsTransactionDetailOpen(true);
    await fetchTransactionDetail(transactionId);
  }

  useEffect(() => {
    if (!session?.accessToken || deepLinkedTransactionId == null) {
      return;
    }
    if (deepLinkedTransactionHandledRef.current === deepLinkedTransactionId) {
      return;
    }
    deepLinkedTransactionHandledRef.current = deepLinkedTransactionId;
    setActionFeedback({
      type: "success",
      message:
        language === "es"
          ? `Abriste la transacción #${deepLinkedTransactionId} desde Mantenciones.`
          : `You opened transaction #${deepLinkedTransactionId} from Maintenance.`,
    });
    void loadTransactionDetail(deepLinkedTransactionId);
  }, [deepLinkedTransactionId, language, session?.accessToken]);

  async function fetchTransactionDetail(transactionId: number) {
    if (!session?.accessToken) {
      return;
    }

    setSelectedTransactionDetail(null);
    setDetailError(null);
    setAttachmentPreviewModal(null);
    setIsDetailLoading(true);
    try {
      const response = await getTenantFinanceTransactionDetail(
        session.accessToken,
        transactionId
      );
      setSelectedTransactionDetail(response.data);
    } catch (rawError) {
      setDetailError(rawError as ApiError);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleAttachmentUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file || !session?.accessToken || selectedTransactionId == null) {
      return;
    }

    setIsAttachmentSubmitting(true);
    setActionFeedback(null);

    try {
      const preparedFile = await prepareFinanceAttachmentFile(file);
      const response = await uploadTenantFinanceTransactionAttachment(
        session.accessToken,
        selectedTransactionId,
        preparedFile,
        attachmentNotes
      );
      await fetchTransactionDetail(selectedTransactionId);
      setAttachmentNotes("");
      setActionFeedback({ type: "success", message: response.message });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      event.target.value = "";
      setIsAttachmentSubmitting(false);
    }
  }

  function handleCreateAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setCreateAttachmentFile(file);
  }

  async function handleAttachmentDelete(
    attachment: TenantFinanceTransactionAttachment
  ) {
    if (!session?.accessToken || selectedTransactionId == null) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `¿Eliminar el adjunto ${attachment.file_name}?`
        : `Delete attachment ${attachment.file_name}?`
    );
    if (!confirmed) {
      return;
    }

    setIsAttachmentSubmitting(true);
    setActionFeedback(null);
    try {
      const response = await deleteTenantFinanceTransactionAttachment(
        session.accessToken,
        selectedTransactionId,
        attachment.id
      );
      await fetchTransactionDetail(selectedTransactionId);
      setActionFeedback({ type: "success", message: response.message });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsAttachmentSubmitting(false);
    }
  }

  async function handleAttachmentDownload(
    attachment: TenantFinanceTransactionAttachment
  ) {
    if (!session?.accessToken || selectedTransactionId == null) {
      return;
    }

    setActionFeedback(null);
    try {
      const result = await downloadTenantFinanceTransactionAttachment(
        session.accessToken,
        selectedTransactionId,
        attachment.id
      );
      downloadBlobFile(
        result.blob,
        attachment.file_name,
        result.contentType || attachment.content_type || "application/octet-stream"
      );
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    }
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const pendingCreateAttachmentFile = createAttachmentFile;
      const pendingCreateAttachmentNotes = normalizeNullableString(createAttachmentNotes);
      const payload = buildTransactionWritePayload(formState, effectiveTimeZone);
      const response = editingTransactionId
        ? await updateTenantFinanceTransaction(
            session.accessToken,
            editingTransactionId,
            payload
          )
        : await createTenantFinanceTransaction(session.accessToken, payload);

      await loadFinanceWorkspace();
      setSelectedTransactionId(response.data.id);
      setIsTransactionDetailOpen(true);
      setEditingTransactionId(null);
      setIsTransactionFormOpen(false);
      await fetchTransactionDetail(response.data.id);
      resetFormForCreate();

      if (pendingCreateAttachmentFile) {
        try {
          const preparedFile = await prepareFinanceAttachmentFile(pendingCreateAttachmentFile);
          const attachmentResponse = await uploadTenantFinanceTransactionAttachment(
            session.accessToken,
            response.data.id,
            preparedFile,
            pendingCreateAttachmentNotes ?? undefined
          );
          await fetchTransactionDetail(response.data.id);
          setActionFeedback({
            type: "success",
            message:
              language === "es"
                ? `${response.message} ${attachmentResponse.message} El detalle quedó abierto en modal.`
                : `${response.message} ${attachmentResponse.message} The detail modal is now open.`,
          });
        } catch {
          setActionFeedback({
            type: "success",
            message:
              language === "es"
                ? `${response.message} La transacción sí quedó creada, pero el adjunto inicial no se pudo cargar. Puedes reintentar desde el detalle abierto en modal.`
                : `${response.message} The transaction was created, but the initial attachment could not be uploaded. You can retry from the opened detail modal.`,
          });
        }
      } else {
        setActionFeedback({
          type: "success",
          message:
            language === "es"
              ? `${response.message} El detalle quedó abierto en modal para adjuntar boleta, factura u otro respaldo.`
              : `${response.message} The detail modal is now open so you can attach a receipt, invoice, or other backup.`,
        });
      }
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleToggleFavorite(transaction: TenantFinanceTransaction) {
    if (!session?.accessToken) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionFavorite(
        session.accessToken,
        transaction.id,
        !transaction.is_favorite
      );
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  async function handleToggleReconciliation(transaction: TenantFinanceTransaction) {
    if (!session?.accessToken) {
      return;
    }
    const nextState = !transaction.is_reconciled;
    const confirmed = window.confirm(
      nextState
        ? language === "es"
          ? "¿Confirmas conciliar esta transacción?"
          : "Do you confirm reconciling this transaction?"
        : language === "es"
          ? "¿Confirmas quitar la conciliación de esta transacción?"
          : "Do you confirm removing reconciliation from this transaction?"
    );
    if (!confirmed) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionReconciliation(
        session.accessToken,
        transaction.id,
        nextState,
        reconciliationNote,
        reconciliationReasonCode
      );
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  async function handleVoidTransaction(transaction: TenantFinanceTransaction) {
    if (!session?.accessToken) {
      return;
    }
    const reason = window.prompt(
      language === "es"
        ? "Motivo de anulación (opcional):"
        : "Void reason (optional):"
    );
    const confirmed = window.confirm(
      language === "es"
        ? `¿Confirmas anular la transacción "${transaction.description}"?`
        : `Do you confirm voiding transaction "${transaction.description}"?`
    );
    if (!confirmed) {
      return;
    }
    await runRowAction(async () => {
      const response = await voidTenantFinanceTransaction(
        session.accessToken,
        transaction.id,
        reason || undefined
      );
      if (selectedTransactionId === transaction.id) {
        closeTransactionDetailModal();
        setSelectedTransactionId(null);
        setSelectedTransactionDetail(null);
        setDetailError(null);
      }
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  async function handleBatchFavorite(isFavorite: boolean) {
    if (!session?.accessToken || selectedTransactionIds.length === 0) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionsFavoriteBatch(
        session.accessToken,
        selectedTransactionIds,
        isFavorite
      );
      setActionFeedback({ type: "success", message: response.message });
      setSelectedTransactionIds([]);
    });
  }

  async function handleBatchReconciliation(isReconciled: boolean) {
    if (!session?.accessToken || selectedTransactionIds.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      isReconciled
        ? language === "es"
          ? `¿Confirmas conciliar ${selectedTransactionIds.length} transacciones seleccionadas?`
          : `Do you confirm reconciling ${selectedTransactionIds.length} selected transactions?`
        : language === "es"
          ? `¿Confirmas quitar la conciliación de ${selectedTransactionIds.length} transacciones seleccionadas?`
          : `Do you confirm removing reconciliation from ${selectedTransactionIds.length} selected transactions?`
    );
    if (!confirmed) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionsReconciliationBatch(
        session.accessToken,
        selectedTransactionIds,
        isReconciled,
        reconciliationNote,
        reconciliationReasonCode
      );
      setActionFeedback({ type: "success", message: response.message });
      setSelectedTransactionIds([]);
      setReconciliationNote("");
      setReconciliationReasonCode("operator_review");
      setReconciliationConfirmation(false);
    });
  }

  function startEditingTransaction(transaction: TenantFinanceTransaction) {
    setEditingTransactionId(transaction.id);
    setFormState(buildTransactionFormState(transaction, effectiveTimeZone));
    setIsTransactionFormOpen(true);
    setActionFeedback(null);
  }

  function resetFormForCreate() {
    setEditingTransactionId(null);
    setFormState({
      ...buildDefaultFormState(effectiveTimeZone),
      accountId: accounts[0] ? String(accounts[0].id) : "",
      currencyId: baseCurrency ? String(baseCurrency.id) : "",
      transactionAt: currentDateTimeLocalInputValue(effectiveTimeZone),
    });
    setCreateAttachmentFile(null);
    setCreateAttachmentNotes("");
  }

  function openTransactionCreateModal() {
    resetFormForCreate();
    setIsTransactionFormOpen(true);
    setActionFeedback(null);
  }

  function closeTransactionFormModal() {
    setIsTransactionFormOpen(false);
    resetFormForCreate();
  }

  function closeTransactionDetailModal() {
    setIsTransactionDetailOpen(false);
    setAttachmentPreviewModal(null);
  }

  const selectedTransactions = transactions.filter((transaction) =>
    selectedTransactionIds.includes(transaction.id)
  );
  const selectedFavoritesCount = selectedTransactions.filter(
    (transaction) => transaction.is_favorite
  ).length;
  const selectedPendingReconciliationCount = selectedTransactions.filter(
    (transaction) => !transaction.is_reconciled
  ).length;
  const selectedLoanLinkedCount = selectedTransactions.filter(
    (transaction) => transaction.loan_id != null
  ).length;
  const favoriteTransactionsCount = transactions.filter(
    (transaction) => transaction.is_favorite
  ).length;
  const pendingReconciliationCount = transactions.filter(
    (transaction) => !transaction.is_reconciled
  ).length;
  const loanLinkedTransactionsCount = transactions.filter(
    (transaction) => transaction.loan_id != null
  ).length;
  const selectedReconciledCount = selectedTransactions.filter(
    (transaction) => transaction.is_reconciled
  ).length;

  function toggleTransactionSelection(transactionId: number) {
    setSelectedTransactionIds((current) =>
      current.includes(transactionId)
        ? current.filter((id) => id !== transactionId)
        : [...current, transactionId]
    );
  }

  function toggleVisibleSelection() {
    const visibleIds = transactions.map((transaction) => transaction.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((transactionId) => selectedTransactionIds.includes(transactionId));
    setSelectedTransactionIds((current) =>
      allVisibleSelected
        ? current.filter((transactionId) => !visibleIds.includes(transactionId))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  }

  function applySmartSelection(
    mode:
      | "all_visible"
      | "favorites"
      | "unreconciled"
      | "reconciled"
      | "loan_linked"
      | "income"
      | "expense"
      | "clear"
  ) {
    if (mode === "clear") {
      setSelectedTransactionIds([]);
      setReconciliationConfirmation(false);
      return;
    }

    const nextIds = transactions
      .filter((transaction) => {
        if (mode === "all_visible") {
          return true;
        }
        if (mode === "favorites") {
          return transaction.is_favorite;
        }
        if (mode === "unreconciled") {
          return !transaction.is_reconciled;
        }
        if (mode === "reconciled") {
          return transaction.is_reconciled;
        }
        if (mode === "loan_linked") {
          return transaction.loan_id != null;
        }
        if (mode === "income") {
          return transaction.transaction_type === "income";
        }
        if (mode === "expense") {
          return transaction.transaction_type === "expense";
        }
        return false;
      })
      .map((transaction) => transaction.id);

    setSelectedTransactionIds(nextIds);
    setReconciliationConfirmation(false);
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Espacio" : "Workspace"}
        icon="transactions"
        title={language === "es" ? "Transacciones financieras" : "Financial transactions"}
        description={
          language === "es"
            ? "Opera el núcleo real de finance con balances por cuenta y trazabilidad reciente."
            : "Operate the real finance core with account balances and recent traceability."
        }
        actions={
          <AppToolbar compact>
            <FinanceHelpBubble
              label={language === "es" ? "Ayuda sobre transacciones" : "Transactions help"}
              helpText={
                language === "es"
                  ? "Conciliar valida el movimiento sin borrarlo. Anular lo saca de balances y reportes, pero conserva auditoría. Los adjuntos se suben al crear o desde el detalle operacional."
                  : "Reconcile validates the movement without deleting it. Void removes it from balances and reports while keeping audit history. Attachments can be uploaded on create or from the operational detail."
              }
            />
            <button className="btn btn-primary" type="button" onClick={openTransactionCreateModal}>
              {language === "es" ? "Registrar transacción" : "Register transaction"}
            </button>
          </AppToolbar>
        }
      />

      <FinanceModuleNav />

      {isTransactionFormOpen ? (
        <div
          className="finance-form-backdrop"
          role="presentation"
          onClick={closeTransactionFormModal}
        >
          <div
            className="finance-form-modal finance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingTransactionId
                ? language === "es"
                  ? "Editar transacción"
                  : "Edit transaction"
                : language === "es"
                  ? "Registrar transacción"
                  : "Register transaction"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="finance-form-modal__eyebrow">
              {editingTransactionId
                ? language === "es"
                  ? "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingTransactionId
                  ? language === "es"
                    ? "Editar transacción"
                    : "Edit transaction"
                  : language === "es"
                    ? "Registrar transacción"
                    : "Register transaction"
              }
              subtitle={
                editingTransactionId
                  ? language === "es"
                    ? "Ajusta el movimiento seleccionado sin invadir la lectura principal."
                    : "Adjust the selected movement without invading the main reading area."
                  : language === "es"
                    ? "Usa el contrato moderno de finance_transactions para ingresos, egresos y transferencias."
                    : "Use the modern finance_transactions contract for income, expenses, and transfers."
              }
            >
              {editingTransactionId ? (
                <div className="tenant-action-feedback tenant-action-feedback--success">
                  <strong>{language === "es" ? "Edición activa:" : "Active edit:"}</strong>{" "}
                  {language === "es"
                    ? `estás modificando la transacción #${editingTransactionId}.`
                    : `you are editing transaction #${editingTransactionId}.`}
                </div>
              ) : null}
              <form className="d-grid gap-3" onSubmit={handleCreateTransaction}>
                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                    <select
                      className="form-select"
                      value={formState.transactionType}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          transactionType: event.target.value,
                          targetAccountId:
                            event.target.value === "transfer"
                              ? current.targetAccountId
                              : "",
                          categoryId:
                            event.target.value === "transfer" ? "" : current.categoryId,
                          tagIds: event.target.value === "transfer" ? [] : current.tagIds,
                        }))
                      }
                    >
                      <option value="income">{language === "es" ? "Ingreso" : "Income"}</option>
                      <option value="expense">{language === "es" ? "Egreso" : "Expense"}</option>
                      <option value="transfer">{language === "es" ? "Transferencia" : "Transfer"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Cuenta origen" : "Source account"}
                    </label>
                    <select
                      className="form-select"
                      value={formState.accountId}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, accountId: event.target.value }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Selecciona una cuenta" : "Select an account"}
                      </option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tenant-inline-form-grid">
                  {formState.transactionType === "transfer" ? (
                    <div>
                      <label className="form-label">
                        {language === "es" ? "Cuenta destino" : "Target account"}
                      </label>
                      <select
                        className="form-select"
                        value={formState.targetAccountId}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            targetAccountId: event.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {language === "es"
                            ? "Selecciona una cuenta destino"
                            : "Select a target account"}
                        </option>
                        {accounts
                          .filter((account) => String(account.id) !== formState.accountId)
                          .map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">{language === "es" ? "Categoría" : "Category"}</label>
                      <select
                        className="form-select"
                        value={formState.categoryId}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, categoryId: event.target.value }))
                        }
                      >
                        <option value="">{language === "es" ? "Sin categoría" : "No category"}</option>
                        {filteredCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="form-text">
                        {filteredCategories.length > 0
                          ? language === "es"
                            ? `Solo se muestran categorías de tipo ${
                                formState.transactionType === "income" ? "ingreso" : "egreso"
                              }.`
                            : `Only ${formState.transactionType === "income" ? "income" : "expense"} categories are shown.`
                          : language === "es"
                            ? `No hay categorías activas de tipo ${
                                formState.transactionType === "income" ? "ingreso" : "egreso"
                              }.`
                            : `There are no active ${
                                formState.transactionType === "income" ? "income" : "expense"
                              } categories.`}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label>
                    <select
                      className="form-select"
                      value={formState.currencyId}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, currencyId: event.target.value }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Selecciona una moneda" : "Select a currency"}
                      </option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code} · {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">{language === "es" ? "Monto" : "Amount"}</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formState.amount}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, amount: event.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="form-label">{language === "es" ? "Fecha y hora" : "Date and time"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={formState.transactionAt}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          transactionAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {selectedCurrencyRequiresExchangeRate(baseCurrency, formState.currencyId) ? (
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Tipo de cambio" : "Exchange rate"}
                    </label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formState.exchangeRate}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          exchangeRate: event.target.value,
                        }))
                      }
                      placeholder={language === "es" ? "Ej: 950.25" : "Ex: 950.25"}
                    />
                  </div>
                ) : null}

                <div>
                  <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
                  <input
                    className="form-control"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder={
                      language === "es"
                        ? "Ej: Pago proveedor de mantención"
                        : "Ex: Maintenance supplier payment"
                    }
                  />
                </div>

                <div>
                  <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder={
                      language === "es"
                        ? "Contexto adicional del movimiento"
                        : "Additional movement context"
                    }
                  />
                </div>

                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Adjunto inicial" : "Initial attachment"}
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={isActionSubmitting}
                      onChange={handleCreateAttachmentSelection}
                    />
                    <div className="form-text">
                      {language === "es"
                        ? "Opcional. Puedes dejar lista la boleta, factura o respaldo desde ahora. Las imágenes se comprimen antes de subir y el máximo final es 5 MB."
                        : "Optional. You can queue the receipt, invoice, or backup file right now. Images are compressed before upload and the final max size is 5 MB."}
                    </div>
                    {createAttachmentFile ? (
                      <div className="small mt-2">
                        <strong>{language === "es" ? "Archivo listo:" : "Queued file:"}</strong>{" "}
                        {createAttachmentFile.name} ·{" "}
                        {formatFileSize(createAttachmentFile.size)}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Nota del adjunto inicial" : "Initial attachment note"}
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      value={createAttachmentNotes}
                      onChange={(event) => setCreateAttachmentNotes(event.target.value)}
                      placeholder={
                        language === "es"
                          ? "Ej: factura proveedor marzo"
                          : "Ex: supplier invoice march"
                      }
                    />
                    {createAttachmentFile ? (
                      <div className="mt-2">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          type="button"
                          disabled={isActionSubmitting}
                          onClick={() => {
                            setCreateAttachmentFile(null);
                            setCreateAttachmentNotes("");
                          }}
                        >
                          {language === "es" ? "Quitar archivo" : "Remove file"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {formState.transactionType !== "transfer" ? (
                  <div>
                    <label className="form-label">{language === "es" ? "Etiquetas" : "Tags"}</label>
                    <select
                      className="form-select"
                      multiple
                      value={formState.tagIds}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          tagIds: Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          ),
                        }))
                      }
                    >
                      {tags.map((tag) => (
                        <option key={tag.id} value={String(tag.id)}>
                          {tag.name}
                          {tag.is_active ? "" : language === "es" ? " · inactiva" : " · inactive"}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      {language === "es"
                        ? "Usa Ctrl o Cmd para seleccionar varias etiquetas sobre el mismo movimiento."
                        : "Use Ctrl or Cmd to select multiple tags for the same movement."}
                    </div>
                  </div>
                ) : null}

                <AppToolbar>
                  <label className="form-check d-flex align-items-center gap-2 mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={formState.isReconciled}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          isReconciled: event.target.checked,
                        }))
                      }
                    />
                    <span className="form-check-label">
                      {language === "es" ? "Marcar conciliada" : "Mark reconciled"}
                    </span>
                  </label>
                  <label className="form-check d-flex align-items-center gap-2 mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={formState.isFavorite}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          isFavorite: event.target.checked,
                        }))
                      }
                    />
                    <span className="form-check-label">
                      {language === "es" ? "Favorita" : "Favorite"}
                    </span>
                  </label>
                </AppToolbar>

                <AppToolbar compact>
                  <button className="btn btn-primary" type="submit" disabled={isActionSubmitting}>
                    {editingTransactionId
                      ? language === "es"
                        ? "Guardar cambios"
                        : "Save changes"
                      : language === "es"
                        ? "Registrar transacción"
                        : "Create transaction"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    disabled={isActionSubmitting}
                    onClick={closeTransactionFormModal}
                  >
                    {editingTransactionId
                      ? language === "es"
                        ? "Cancelar edición"
                        : "Cancel editing"
                      : language === "es"
                        ? "Cancelar"
                        : "Cancel"}
                  </button>
                </AppToolbar>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>{language === "es" ? "Transacciones:" : "Transactions:"}</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando transacciones financieras..." : "Loading financial transactions..."} />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          icon="transactions"
          label={language === "es" ? "Transacciones" : "Transactions"}
          value={summary?.total_entries || 0}
          hint={language === "es" ? "Movimientos persistidos en finance_transactions" : "Entries persisted in finance_transactions"}
        />
        <MetricCard
          icon="income"
          label={language === "es" ? "Ingresos" : "Income"}
          tone="success"
          value={formatMoney(summary?.total_income || 0, baseCurrency?.code, language)}
          hint={language === "es" ? "Acumulado visible" : "Visible total"}
        />
        <MetricCard
          icon="expense"
          label={language === "es" ? "Egresos" : "Expenses"}
          tone="warning"
          value={formatMoney(summary?.total_expense || 0, baseCurrency?.code, language)}
          hint={language === "es" ? "Acumulado visible" : "Visible total"}
        />
        <MetricCard
          icon="balance"
          label={language === "es" ? "Resultado neto" : "Net result"}
          tone="default"
          value={formatMoney((summary?.net_result ?? summary?.balance ?? 0), baseCurrency?.code, language)}
          hint={language === "es" ? "Ingresos menos egresos visibles" : "Visible income minus expenses"}
        />
        <MetricCard
          icon="accounts"
          label={
            language === "es" ? "Saldo total en cuentas" : "Total account balance"
          }
          tone="info"
          value={formatMoney(summary?.total_account_balance ?? 0, baseCurrency?.code, language)}
          hint={totalAccountBalanceHint}
        />
      </div>

      {error ? (
        <ErrorState
          title={language === "es" ? "Transacciones de finance no disponibles" : "Finance transactions unavailable"}
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <PanelCard
        title={language === "es" ? "Balances por cuenta" : "Account balances"}
        subtitle={
          language === "es"
            ? "Lectura rápida del saldo operativo calculado sobre saldo inicial y transacciones."
            : "Quick operational balance view calculated from opening balance and transactions."
        }
      >
        {accountBalances.length > 0 ? (
          <div className="finance-balance-list">
            {accountBalances.map((item) => {
              const currency = currencyMap.get(item.currency_id);
              return (
                <div key={item.account_id} className="finance-balance-list__item">
                  <div>
                    <div className="finance-balance-list__title">{item.account_name}</div>
                    <div className="small text-secondary">
                      {displayPlatformCode(item.account_type)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="finance-balance-list__value">
                      {item.is_balance_hidden
                        ? language === "es"
                          ? "oculto"
                          : "hidden"
                        : formatMoney(item.balance, currency?.code, language)}
                    </div>
                    <div className="small text-secondary">
                      {currency?.code || `#${item.currency_id}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-secondary">
            {language === "es"
              ? "Aún no hay cuentas activas para calcular balances."
              : "There are no active accounts yet to calculate balances."}
          </div>
        )}

        <hr />

        {usageError ? (
          <ErrorState
            title={language === "es" ? "Uso de finance no disponible" : "Finance usage unavailable"}
            detail={usageError.payload?.detail || usageError.message}
            requestId={usageError.payload?.request_id}
          />
        ) : usage ? (
          <div className="tenant-detail-grid">
            <DetailField label={language === "es" ? "Clave de módulo" : "Module key"} value={<code>{usage.module_key}</code>} />
            <DetailField label={language === "es" ? "Usado" : "Used"} value={usage.used_entries} />
            <DetailField
              label={language === "es" ? "Límite" : "Limit"}
              value={usage.unlimited ? (language === "es" ? "ilimitado" : "unlimited") : usage.max_entries ?? "—"}
            />
            <DetailField
              label={language === "es" ? "Restante" : "Remaining"}
              value={usage.unlimited ? "—" : usage.remaining_entries ?? "—"}
            />
            <DetailField
              label={language === "es" ? "Fuente" : "Source"}
              value={usage.limit_source ? displayPlatformCode(usage.limit_source) : language === "es" ? "ninguna" : "none"}
            />
            <DetailField
              label={language === "es" ? "Estado" : "Status"}
              value={
                usage.at_limit ? (
                  <AppBadge tone="warning">{language === "es" ? "al límite" : "at limit"}</AppBadge>
                ) : (
                  <AppBadge tone="success">ok</AppBadge>
                )
              }
            />
          </div>
        ) : null}
      </PanelCard>

      <div className="d-grid gap-4">
        <PanelCard
          title={language === "es" ? "Transacciones recientes" : "Recent transactions"}
          subtitle={
            language === "es"
              ? "La tabla ya lee finance_transactions y no la capa legacy de entries."
              : "The table now reads finance_transactions and no longer the legacy entries layer."
          }
        >
          <div className="tenant-detail-grid mb-3">
            <DetailField label={language === "es" ? "Favoritas visibles" : "Visible favorites"} value={favoriteTransactionsCount} />
            <DetailField label={language === "es" ? "Pendientes conciliación" : "Pending reconciliation"} value={pendingReconciliationCount} />
            <DetailField label={language === "es" ? "Seleccionadas" : "Selected"} value={selectedTransactionIds.length} />
            <DetailField
              label={language === "es" ? "Favoritas seleccionadas" : "Selected favorites"}
              value={selectedFavoritesCount}
            />
          </div>

          <AppFilterGrid>
            <div>
              <label className="form-label">{language === "es" ? "Buscar" : "Search"}</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder={language === "es" ? "Descripción o notas" : "Description or notes"}
              />
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
              <select
                className="form-select"
                value={filters.transactionType}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    transactionType: event.target.value,
                  }))
                }
              >
                <option value="">{language === "es" ? "Todos" : "All"}</option>
                <option value="income">{language === "es" ? "Ingresos" : "Income"}</option>
                <option value="expense">{language === "es" ? "Egresos" : "Expenses"}</option>
                <option value="transfer">{language === "es" ? "Transferencias" : "Transfers"}</option>
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Cuenta" : "Account"}</label>
              <select
                className="form-select"
                value={filters.accountId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Categoría" : "Category"}</label>
              <select
                className="form-select"
                value={filters.categoryId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Etiqueta" : "Tag"}</label>
              <select
                className="form-select"
                value={filters.tagId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, tagId: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                    {tag.is_active ? "" : language === "es" ? " · inactiva" : " · inactive"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Favorita" : "Favorite"}</label>
              <select
                className="form-select"
                value={filters.favorite}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    favorite: event.target.value,
                  }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                <option value="yes">{language === "es" ? "Favoritas" : "Favorites"}</option>
                <option value="no">{language === "es" ? "No favoritas" : "Not favorites"}</option>
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Conciliación" : "Reconciliation"}</label>
              <select
                className="form-select"
                value={filters.reconciliation}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    reconciliation: event.target.value,
                  }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                <option value="pending">{language === "es" ? "Pendientes" : "Pending"}</option>
                <option value="done">{language === "es" ? "Conciliadas" : "Reconciled"}</option>
              </select>
            </div>
          </AppFilterGrid>

          <AppToolbar compact className="mb-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => applySmartSelection("all_visible")}
            >
              {language === "es" ? "Seleccionar visibles" : "Select visible"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => applySmartSelection("unreconciled")}
            >
              {language === "es" ? "Seleccionar pendientes" : "Select pending"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => applySmartSelection("loan_linked")}
            >
              {language === "es" ? "Seleccionar préstamos" : "Select loans"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => applySmartSelection("income")}
            >
              {language === "es" ? "Seleccionar ingresos" : "Select income"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => applySmartSelection("expense")}
            >
              {language === "es" ? "Seleccionar egresos" : "Select expense"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  favorite: "yes",
                }))
              }
            >
              {language === "es" ? "Solo favoritas" : "Favorites only"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  reconciliation: "pending",
                }))
              }
            >
              {language === "es" ? "Pendientes conciliación" : "Pending reconciliation"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters({
                  transactionType: "",
                  accountId: "",
                  categoryId: "",
                  tagId: "",
                  favorite: "",
                  reconciliation: "",
                  search: "",
                })
              }
            >
              {language === "es" ? "Limpiar filtros" : "Clear filters"}
            </button>
          </AppToolbar>

          <div className="tenant-detail-grid mb-3">
            <DetailField label={language === "es" ? "Favoritas visibles" : "Visible favorites"} value={favoriteTransactionsCount} />
            <DetailField label={language === "es" ? "Pendientes visibles" : "Visible pending"} value={pendingReconciliationCount} />
            <DetailField label={language === "es" ? "Ligadas a préstamo" : "Loan-linked"} value={loanLinkedTransactionsCount} />
            <DetailField
              label={language === "es" ? "Ingreso / egreso" : "Income / expense"}
              value={`${transactions.filter((transaction) => transaction.transaction_type === "income").length} / ${transactions.filter((transaction) => transaction.transaction_type === "expense").length}`}
            />
          </div>

          {selectedTransactionIds.length > 0 ? (
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>{language === "es" ? "Mesa de trabajo:" : "Workbench:"}</strong> {selectedTransactionIds.length} {language === "es" ? "transacciones seleccionadas." : "selected transactions."}
              {" "}
              {selectedPendingReconciliationCount} {language === "es" ? "pendientes de conciliación." : "pending reconciliation."}
              <div className="finance-reconciliation-workspace mt-3">
                <div className="tenant-detail-grid">
                  <DetailField label={language === "es" ? "Pendientes seleccionadas" : "Selected pending"} value={selectedPendingReconciliationCount} />
                  <DetailField label={language === "es" ? "Ya conciliadas" : "Already reconciled"} value={selectedReconciledCount} />
                  <DetailField label={language === "es" ? "Favoritas seleccionadas" : "Selected favorites"} value={selectedFavoritesCount} />
                  <DetailField label={language === "es" ? "Ligadas a préstamo" : "Loan-linked"} value={selectedLoanLinkedCount} />
                </div>
                <div className="mt-3">
                  <label className="form-label">{language === "es" ? "Nota de conciliación" : "Reconciliation note"}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={reconciliationNote}
                    onChange={(event) => setReconciliationNote(event.target.value)}
                    placeholder={language === "es" ? "Ej: revisión operativa validada contra cartola del día" : "Ex: operational review validated against today's statement"}
                  />
                  <div className="form-text">
                    {language === "es"
                      ? "La nota queda visible en la auditoría reciente de cada transacción conciliada."
                      : "The note remains visible in the recent audit trail of each reconciled transaction."}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">
                    {language === "es" ? "Motivo de conciliación" : "Reconciliation reason"}
                  </label>
                  <select
                    className="form-select"
                    value={reconciliationReasonCode}
                    onChange={(event) =>
                      setReconciliationReasonCode(
                        event.target.value as ReconciliationReasonCode
                      )
                    }
                  >
                    {RECONCILIATION_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {displayReconciliationReason(option.value, language)}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    {language === "es"
                      ? "El motivo tipado también queda guardado en la auditoría del movimiento."
                      : "The typed reason is also stored in the transaction audit trail."}
                  </div>
                </div>
                <label className="form-check d-flex align-items-center gap-2 mt-3 mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={reconciliationConfirmation}
                    onChange={(event) =>
                      setReconciliationConfirmation(event.target.checked)
                    }
                  />
                  <span className="form-check-label">
                    {language === "es"
                      ? "Confirmo que revisé la selección antes de operar conciliación en lote."
                      : "I confirm that I reviewed the selection before running batch reconciliation."}
                  </span>
                </label>
              </div>
              <AppToolbar compact className="mt-2">
                <button
                  className="btn btn-outline-warning btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => void handleBatchFavorite(true)}
                >
                  {language === "es" ? "Marcar favoritas" : "Mark favorites"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => void handleBatchFavorite(false)}
                >
                  {language === "es" ? "Quitar favoritas" : "Remove favorites"}
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  disabled={
                    isActionSubmitting ||
                    selectedPendingReconciliationCount === 0 ||
                    !reconciliationConfirmation
                  }
                  onClick={() => void handleBatchReconciliation(true)}
                >
                  {language === "es" ? "Conciliar lote" : "Reconcile batch"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={
                    isActionSubmitting ||
                    selectedReconciledCount === 0 ||
                    !reconciliationConfirmation
                  }
                  onClick={() => void handleBatchReconciliation(false)}
                >
                  {language === "es" ? "Desconciliar lote" : "Unreconcile batch"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => applySmartSelection("clear")}
                >
                  {language === "es" ? "Limpiar selección" : "Clear selection"}
                </button>
              </AppToolbar>
            </div>
          ) : null}

          {transactions.length > 0 ? (
            <AppTableWrap>
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          transactions.length > 0 &&
                          transactions.every((transaction) =>
                            selectedTransactionIds.includes(transaction.id)
                          )
                        }
                        onChange={toggleVisibleSelection}
                      />
                    </th>
                    <th>{language === "es" ? "Detalle" : "Detail"}</th>
                    <th>{language === "es" ? "Fecha" : "Date"}</th>
                    <th>{language === "es" ? "Tipo" : "Type"}</th>
                    <th>{language === "es" ? "Descripción" : "Description"}</th>
                    <th>{language === "es" ? "Cuenta" : "Account"}</th>
                    <th>{language === "es" ? "Categoría" : "Category"}</th>
                    <th>{language === "es" ? "Monto" : "Amount"}</th>
                    <th>{language === "es" ? "Estado conciliación" : "Reconciliation status"}</th>
                    <th>{language === "es" ? "Acciones" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const account = transaction.account_id
                      ? accountMap.get(transaction.account_id)
                      : null;
                    const category = transaction.category_id
                      ? categoryMap.get(transaction.category_id)
                      : null;
                    const currency = currencyMap.get(transaction.currency_id);
                    const isSelected = selectedTransactionId === transaction.id;
                    return (
                      <tr
                        key={transaction.id}
                        className={isSelected ? "table-primary" : undefined}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.includes(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            type="button"
                            onClick={() => void loadTransactionDetail(transaction.id)}
                          >
                            {language === "es" ? "Ver" : "View"}
                          </button>
                        </td>
                        <td>{formatDateTime(transaction.transaction_at, language, effectiveTimeZone)}</td>
                        <td>
                          <StatusBadge value={displayTransactionType(transaction.transaction_type, language)} />
                        </td>
                        <td>
                          <div>{transaction.description}</div>
                          {transaction.tag_ids.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {renderTransactionTagChips(transaction.tag_ids, tagMap, language)}
                            </div>
                          ) : null}
                        </td>
                        <td>{account?.name || "—"}</td>
                        <td>{category?.name || "—"}</td>
                        <td>{formatMoney(transaction.amount, currency?.code, language)}</td>
                        <td>
                          {transaction.is_reconciled ? (
                            <AppBadge tone="success">
                              {displayReconciliationState(true, language)}
                            </AppBadge>
                          ) : (
                            <AppBadge tone="neutral">
                              {displayReconciliationState(false, language)}
                            </AppBadge>
                          )}
                        </td>
                        <td>
                          <div className="d-grid gap-2">
	                          <AppToolbar compact>
	                            <button
	                              className="btn btn-sm btn-outline-primary"
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => startEditingTransaction(transaction)}
                            >
                              {language === "es" ? "Editar" : "Edit"}
                            </button>
	                            <button
	                              className="btn btn-sm btn-outline-info"
	                              type="button"
	                              disabled={isActionSubmitting || isAttachmentSubmitting}
	                              onClick={() => void openTransactionAttachments(transaction.id)}
	                            >
	                              {language === "es" ? "Adjuntar" : "Attach"}
	                            </button>
	                            <button
	                              className={`btn btn-sm ${
	                                transaction.is_favorite
	                                  ? "btn-outline-warning"
                                  : "btn-outline-secondary"
                              }`}
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => void handleToggleFavorite(transaction)}
                            >
                              {transaction.is_favorite
                                ? language === "es"
                                  ? "Quitar favorita"
                                  : "Remove favorite"
                                : language === "es"
                                  ? "Favorita"
                                  : "Favorite"}
                            </button>
                            <button
                              className={`btn btn-sm ${
                                transaction.is_reconciled
                                  ? "btn-outline-secondary"
                                  : "btn-outline-success"
                              }`}
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => void handleToggleReconciliation(transaction)}
                            >
                              {transaction.is_reconciled
                                ? language === "es"
                                  ? "Desconciliar"
                                  : "Unreconcile"
                                : language === "es"
                                  ? "Conciliar"
                                : "Reconcile"}
                            </button>
                            {transaction.source_type?.startsWith("loan_installment_") ? null : (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                type="button"
                                disabled={isActionSubmitting}
                                onClick={() => void handleVoidTransaction(transaction)}
                              >
                                {language === "es" ? "Anular" : "Void"}
                              </button>
                            )}
                          </AppToolbar>
                          {selectedTransactionDetail?.transaction.id === transaction.id &&
                          selectedTransactionDetail.attachments.length > 0 ? (
                            <div className="finance-attachment-actions-strip">
                              {selectedTransactionDetail.attachments.map((attachment) => {
                                const previewUrl = attachmentPreviewUrls[attachment.id];
                                if (previewUrl) {
                                  return (
                                    <button
                                      key={attachment.id}
                                      className="finance-attachment-actions-strip__thumb"
                                      type="button"
                                      onClick={() =>
                                        setAttachmentPreviewModal({
                                          attachmentId: attachment.id,
                                          fileName: attachment.file_name,
                                          previewUrl,
                                        })
                                      }
                                      title={
                                        language === "es"
                                          ? `Ver ${attachment.file_name}`
                                          : `View ${attachment.file_name}`
                                      }
                                    >
                                      <img
                                        src={previewUrl}
                                        alt={attachment.file_name}
                                        loading="lazy"
                                      />
                                    </button>
                                  );
                                }
                                return (
                                  <AppBadge key={attachment.id} tone="neutral">
                                    {isPdfAttachment(attachment)
                                      ? "PDF"
                                      : language === "es"
                                        ? "Archivo"
                                        : "File"}
                                  </AppBadge>
                                );
                              })}
                            </div>
                          ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AppTableWrap>
          ) : (
            <div className="text-secondary">
              {language === "es"
                ? "Aún no se registran transacciones en el núcleo moderno de finance."
                : "No transactions have been recorded yet in the modern finance core."}
            </div>
          )}
        </PanelCard>
        {isTransactionDetailOpen ? (
          <div
            className="finance-form-backdrop"
            role="presentation"
            onClick={closeTransactionDetailModal}
          >
            <div
              className="finance-form-modal finance-form-modal--wide finance-form-modal--xwide"
              role="dialog"
              aria-modal="true"
              aria-label={
                language === "es" ? "Detalle operacional" : "Operational detail"
              }
              onClick={(event) => event.stopPropagation()}
            >
              <div className="finance-form-modal__eyebrow">
                {language === "es" ? "Lectura operacional" : "Operational reading"}
              </div>
              <PanelCard
                title={language === "es" ? "Detalle de transacción" : "Transaction detail"}
                subtitle={
                  language === "es"
                    ? "Revisa trazabilidad, adjuntos y auditoría reciente sin salir de la tabla."
                    : "Review traceability, attachments, and recent audit without leaving the table."
                }
              >
                {isDetailLoading ? (
                  <LoadingBlock
                    label={
                      language === "es"
                        ? "Cargando detalle de la transacción..."
                        : "Loading transaction detail..."
                    }
                  />
                ) : null}
                {detailError ? (
                  <ErrorState
                    title={language === "es" ? "Detalle no disponible" : "Detail unavailable"}
                    detail={detailError.payload?.detail || detailError.message}
                    requestId={detailError.payload?.request_id}
                  />
                ) : null}

                {!isDetailLoading && !detailError && selectedTransactionDetail ? (
                  <div className="d-grid gap-3">
                    <div className="tenant-action-feedback tenant-action-feedback--success">
                      <strong>{language === "es" ? "Adjuntos:" : "Attachments:"}</strong>{" "}
                      {language === "es"
                        ? "usa este modal para revisar auditoría y subir boletas, facturas o respaldos."
                        : "use this modal to review audit data and upload receipts, invoices, or backups."}
                    </div>
                    <div className="tenant-detail-grid finance-transaction-detail-grid">
                      <DetailField
                        label={language === "es" ? "Tipo" : "Type"}
                        value={displayTransactionType(
                          selectedTransactionDetail.transaction.transaction_type,
                          language
                        )}
                      />
                      <DetailField
                        label={language === "es" ? "Cuenta origen" : "Source account"}
                        value={
                          selectedTransactionDetail.transaction.account_id
                            ? accountMap.get(selectedTransactionDetail.transaction.account_id)
                                ?.name || "—"
                            : "—"
                        }
                      />
                      <DetailField
                        label={language === "es" ? "Cuenta destino" : "Target account"}
                        value={
                          selectedTransactionDetail.transaction.target_account_id
                            ? accountMap.get(
                                selectedTransactionDetail.transaction.target_account_id
                              )?.name || "—"
                            : "—"
                        }
                      />
                      <DetailField
                        label={language === "es" ? "Categoría" : "Category"}
                        value={
                          selectedTransactionDetail.transaction.category_id
                            ? categoryMap.get(
                                selectedTransactionDetail.transaction.category_id
                              )?.name || "—"
                            : "—"
                        }
                      />
                      <DetailField
                        label={language === "es" ? "Monto" : "Amount"}
                        value={formatMoney(
                          selectedTransactionDetail.transaction.amount,
                          currencyMap.get(selectedTransactionDetail.transaction.currency_id)?.code,
                          language
                        )}
                      />
                      <DetailField
                        label={language === "es" ? "Registrada en" : "Recorded at"}
                        value={formatDateTime(
                          selectedTransactionDetail.transaction.transaction_at,
                          language,
                          effectiveTimeZone
                        )}
                      />
                    </div>

                    <div className="finance-transaction-detail-grid finance-transaction-detail-grid--two">
                      <div>
                        <div className="tenant-detail__label">
                          {language === "es" ? "Descripción" : "Description"}
                        </div>
                        <div className="tenant-detail__value">
                          {selectedTransactionDetail.transaction.description}
                        </div>
                      </div>
                      <div>
                        <div className="tenant-detail__label">
                          {language === "es" ? "Notas" : "Notes"}
                        </div>
                        <div className="tenant-detail__value">
                          {selectedTransactionDetail.transaction.notes ||
                            (language === "es" ? "sin notas" : "no notes")}
                        </div>
                      </div>
                    </div>

                    <AppToolbar compact>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        type="button"
                        disabled={isActionSubmitting}
                        onClick={() => startEditingTransaction(selectedTransactionDetail.transaction)}
                      >
                        {language === "es" ? "Editar esta transacción" : "Edit this transaction"}
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={closeTransactionDetailModal}
                      >
                        {language === "es" ? "Cerrar detalle" : "Close detail"}
                      </button>
                    </AppToolbar>

                    <div className="d-grid gap-2">
                      <div className="tenant-detail__label">
                        {language === "es"
                          ? "Boletas / facturas adjuntas"
                          : "Attached receipts / invoices"}
                      </div>
                      <div className="tenant-inline-form-grid">
                        <div>
                          <label className="form-label">
                            {language === "es" ? "Nota del adjunto" : "Attachment note"}
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            value={attachmentNotes}
                            onChange={(event) => setAttachmentNotes(event.target.value)}
                            placeholder={
                              language === "es"
                                ? "Ej: boleta supermercado o factura proveedor"
                                : "Ex: grocery receipt or supplier invoice"
                            }
                          />
                        </div>
                        <div>
                          <label className="form-label">
                            {language === "es" ? "Subir archivo" : "Upload file"}
                          </label>
                          <input
                            className="form-control"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            disabled={isAttachmentSubmitting}
                            onChange={(event) => void handleAttachmentUpload(event)}
                          />
                          <div className="form-text">
                            {language === "es"
                              ? "Se aceptan JPG, PNG, WEBP o PDF. Las imágenes se comprimen antes de subir y el máximo final es 5 MB."
                              : "JPG, PNG, WEBP, or PDF accepted. Images are compressed before upload and the final max size is 5 MB."}
                          </div>
                        </div>
                      </div>
                      {selectedTransactionDetail.attachments.length > 0 ? (
                        <div className="finance-audit-list">
                          {selectedTransactionDetail.attachments.map((attachment) => {
                            const previewUrl = attachmentPreviewUrls[attachment.id];
                            return (
                              <div key={attachment.id} className="finance-audit-list__item">
                                <div className="finance-attachment-card">
                                  <div className="finance-attachment-card__media">
                                    {previewUrl ? (
                                      <button
                                        className="finance-attachment-card__preview"
                                        type="button"
                                        onClick={() =>
                                          setAttachmentPreviewModal({
                                            attachmentId: attachment.id,
                                            fileName: attachment.file_name,
                                            previewUrl,
                                          })
                                        }
                                        title={
                                          language === "es"
                                            ? `Abrir vista previa de ${attachment.file_name}`
                                            : `Open preview for ${attachment.file_name}`
                                        }
                                      >
                                        <img
                                          src={previewUrl}
                                          alt={attachment.file_name}
                                          loading="lazy"
                                        />
                                      </button>
                                    ) : (
                                      <div className="finance-attachment-card__file">
                                        {isPdfAttachment(attachment) ? "PDF" : "FILE"}
                                      </div>
                                    )}
                                  </div>
                                  <div className="finance-attachment-card__content">
                                    <strong>{attachment.file_name}</strong>
                                    <div className="small text-secondary">
                                      {displayAttachmentMeta(
                                        attachment,
                                        language,
                                        effectiveTimeZone
                                      )}
                                    </div>
                                    {attachment.notes ? <div>{attachment.notes}</div> : null}
                                  </div>
                                  <div className="d-flex gap-2 flex-wrap">
                                    {previewUrl ? (
                                      <button
                                        className="btn btn-outline-primary btn-sm"
                                        type="button"
                                        onClick={() =>
                                          setAttachmentPreviewModal({
                                            attachmentId: attachment.id,
                                            fileName: attachment.file_name,
                                            previewUrl,
                                          })
                                        }
                                      >
                                        {language === "es" ? "Ver imagen" : "View image"}
                                      </button>
                                    ) : null}
                                    <button
                                      className="btn btn-outline-secondary btn-sm"
                                      type="button"
                                      disabled={isAttachmentSubmitting}
                                      onClick={() => void handleAttachmentDownload(attachment)}
                                    >
                                      {language === "es" ? "Descargar" : "Download"}
                                    </button>
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      type="button"
                                      disabled={isAttachmentSubmitting}
                                      onClick={() => void handleAttachmentDelete(attachment)}
                                    >
                                      {language === "es" ? "Eliminar" : "Delete"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="tenant-detail__value">
                          {language === "es"
                            ? "Todavía no hay boletas o facturas cargadas para esta transacción."
                            : "There are no uploaded receipts or invoices for this transaction yet."}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="tenant-detail__label mb-2">
                        {language === "es" ? "Etiquetas" : "Tags"}
                      </div>
                      {selectedTransactionDetail.transaction.tag_ids.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {renderTransactionTagChips(
                            selectedTransactionDetail.transaction.tag_ids,
                            tagMap,
                            language
                          )}
                        </div>
                      ) : (
                        <div className="tenant-detail__value">
                          {language === "es" ? "sin etiquetas" : "no tags"}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="tenant-detail__label mb-2">
                        {language === "es" ? "Auditoría reciente" : "Recent audit trail"}
                      </div>
                      {selectedTransactionDetail.audit_events.length > 0 ? (
                        <div className="finance-audit-list">
                          {selectedTransactionDetail.audit_events.map((event) => (
                            <div key={event.id} className="finance-audit-list__item">
                              <div className="d-flex justify-content-between gap-3">
                                <strong>{displayPlatformCode(event.event_type)}</strong>
                                <span className="small text-secondary">
                                  {formatDateTime(
                                    event.created_at,
                                    language,
                                    effectiveTimeZone
                                  )}
                                </span>
                              </div>
                              <div>{event.summary}</div>
                              {event.payload ? (
                                <pre className="finance-audit-list__payload">
                                  {JSON.stringify(event.payload, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-secondary">
                          {language === "es"
                            ? "Esta transacción aún no tiene eventos de auditoría adicionales."
                            : "This transaction does not have additional audit events yet."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : !isDetailLoading && !detailError ? (
                  <div className="text-secondary">
                    {language === "es"
                      ? "Selecciona una transacción para revisar cuentas, montos, auditoría y adjuntar boletas o facturas."
                      : "Select a transaction to review accounts, amounts, audit trail, and attach receipts or invoices."}
                  </div>
                ) : null}
              </PanelCard>
            </div>
          </div>
        ) : null}
          {attachmentPreviewModal ? (
            <div
              className="confirm-dialog-backdrop"
              role="presentation"
              onClick={() => setAttachmentPreviewModal(null)}
            >
              <div
                className="confirm-dialog finance-attachment-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-label={attachmentPreviewModal.fileName}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="d-flex justify-content-between gap-3 align-items-start">
                  <div>
                    <div className="confirm-dialog__title">{attachmentPreviewModal.fileName}</div>
                    <div className="confirm-dialog__description">
                      {language === "es"
                        ? "Vista previa del documento adjunto."
                        : "Attachment preview."}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    type="button"
                    onClick={() => setAttachmentPreviewModal(null)}
                  >
                    {language === "es" ? "Cerrar" : "Close"}
                  </button>
                </div>
                <div className="finance-attachment-preview-modal__body">
                  <img
                    src={attachmentPreviewModal.previewUrl}
                    alt={attachmentPreviewModal.fileName}
                  />
                </div>
              </div>
            </div>
          ) : null}
	      </div>
	    </div>
	  );
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeNullableFloat(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatMoney(value: number, currencyCode = "USD", language: "es" | "en" = "es"): string {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

function formatDateTime(
  value: string | null,
  language: "es" | "en" = "es",
  timeZone?: string | null
): string {
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function displayTransactionType(value: string, language: "es" | "en" = "es"): string {
  if (value === "income") {
    return language === "es" ? "ingreso" : "income";
  }
  if (value === "expense") {
    return language === "es" ? "egreso" : "expense";
  }
  if (value === "transfer") {
    return language === "es" ? "transferencia" : "transfer";
  }
  return value;
}

function selectedCurrencyRequiresExchangeRate(
  baseCurrency: TenantFinanceCurrency | null,
  selectedCurrencyId: string
): boolean {
  if (!baseCurrency || !selectedCurrencyId) {
    return false;
  }
  return String(baseCurrency.id) !== selectedCurrencyId;
}

function displayAttachmentMeta(
  attachment: TenantFinanceTransactionAttachment,
  language: "es" | "en",
  timeZone?: string | null
) {
  const parts = [
    formatFileSize(attachment.file_size),
    attachment.content_type || "application/octet-stream",
    formatDateTime(attachment.created_at, language, timeZone),
  ];
  return parts.join(" · ");
}

function isImageAttachment(attachment: TenantFinanceTransactionAttachment) {
  return (attachment.content_type || "").toLowerCase().startsWith("image/");
}

function isPdfAttachment(attachment: TenantFinanceTransactionAttachment) {
  return (attachment.content_type || "").toLowerCase() === "application/pdf";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function prepareFinanceAttachmentFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  return compressImageFile(file);
}

async function compressImageFile(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(
    1,
    maxDimension / Math.max(imageBitmap.width, imageBitmap.height)
  );
  const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/webp", 0.82);
  });
  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "attachment";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function downloadBlobFile(blob: Blob, filename: string, mimeType: string) {
  const typedBlob = new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(typedBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}

function buildApiFilters(filters: {
  transactionType: string;
  accountId: string;
  categoryId: string;
  tagId: string;
  favorite: string;
  reconciliation: string;
  search: string;
}): TenantFinanceTransactionFilters {
  return {
    transactionType: filters.transactionType || undefined,
    accountId: filters.accountId ? Number(filters.accountId) : null,
    categoryId: filters.categoryId ? Number(filters.categoryId) : null,
    tagId: filters.tagId ? Number(filters.tagId) : null,
    isFavorite:
      filters.favorite === "yes"
        ? true
        : filters.favorite === "no"
          ? false
          : null,
    isReconciled:
      filters.reconciliation === "done"
        ? true
        : filters.reconciliation === "pending"
          ? false
          : null,
    search: filters.search || undefined,
  };
}

function buildTransactionWritePayload(
  formState: TransactionFormState,
  timeZone?: string | null
) {
  return {
    transaction_type: formState.transactionType,
    account_id: normalizeNullableNumber(formState.accountId),
    target_account_id:
      formState.transactionType === "transfer"
        ? normalizeNullableNumber(formState.targetAccountId)
        : null,
    category_id:
      formState.transactionType === "transfer"
        ? null
        : normalizeNullableNumber(formState.categoryId),
    beneficiary_id: null,
    person_id: null,
    project_id: null,
    currency_id: Number(formState.currencyId),
    loan_id: null,
    amount: Number.parseFloat(formState.amount),
    discount_amount: 0,
    exchange_rate: normalizeNullableFloat(formState.exchangeRate),
    amortization_months: null,
    transaction_at: fromDateTimeLocalInputValue(formState.transactionAt, timeZone),
    alternative_date: null,
    description: formState.description.trim(),
    notes: normalizeNullableString(formState.notes),
    is_favorite: formState.isFavorite,
    is_reconciled: formState.isReconciled,
    tag_ids:
      formState.transactionType === "transfer"
        ? null
        : formState.tagIds.length > 0
          ? formState.tagIds.map((tagId) => Number(tagId))
          : null,
  };
}

function buildTransactionFormState(
  transaction: TenantFinanceTransaction,
  timeZone?: string | null
): TransactionFormState {
  return {
    transactionType: transaction.transaction_type,
    accountId: transaction.account_id ? String(transaction.account_id) : "",
    targetAccountId: transaction.target_account_id
      ? String(transaction.target_account_id)
      : "",
    categoryId: transaction.category_id ? String(transaction.category_id) : "",
    tagIds: transaction.tag_ids.map((tagId) => String(tagId)),
    currencyId: String(transaction.currency_id),
    amount: String(transaction.amount),
    exchangeRate: transaction.exchange_rate ? String(transaction.exchange_rate) : "",
    transactionAt: toDateTimeLocalInputValue(transaction.transaction_at, timeZone),
    description: transaction.description,
    notes: transaction.notes || "",
    isReconciled: transaction.is_reconciled,
    isFavorite: transaction.is_favorite,
  };
}

type ReconciliationReasonCode =
  | "operator_review"
  | "bank_statement_match"
  | "cash_closure"
  | "loan_crosscheck"
  | "migration_cleanup"
  | "other";

const RECONCILIATION_REASON_OPTIONS: Array<{ value: ReconciliationReasonCode }> = [
  { value: "operator_review" },
  { value: "bank_statement_match" },
  { value: "cash_closure" },
  { value: "loan_crosscheck" },
  { value: "migration_cleanup" },
  { value: "other" },
];

function displayReconciliationReason(
  value: ReconciliationReasonCode,
  language: "es" | "en" = "es"
): string {
  if (value === "operator_review") {
    return language === "es" ? "revisión operativa" : "operator review";
  }
  if (value === "bank_statement_match") {
    return language === "es" ? "match con cartola" : "bank statement match";
  }
  if (value === "cash_closure") {
    return language === "es" ? "cierre de caja" : "cash closure";
  }
  if (value === "loan_crosscheck") {
    return language === "es" ? "cruce con préstamo" : "loan cross-check";
  }
  if (value === "migration_cleanup") {
    return language === "es" ? "ajuste post migración" : "migration cleanup";
  }
  return language === "es" ? "otro" : "other";
}

function displayReconciliationState(
  isReconciled: boolean,
  language: "es" | "en" = "es"
): string {
  if (isReconciled) {
    return language === "es" ? "conciliada" : "reconciled";
  }
  return language === "es" ? "pendiente conciliación" : "pending reconciliation";
}

function renderTransactionTagChips(
  tagIds: number[],
  tagMap: Map<number, TenantFinanceTag>,
  language: "es" | "en" = "es"
) {
  return tagIds.map((tagId) => {
    const tag = tagMap.get(tagId);
    const label = tag
      ? `${tag.name}${tag.is_active ? "" : language === "es" ? " · inactiva" : " · inactive"}`
      : `#${tagId}`;
    return (
      <AppBadge key={tagId} tone="neutral">
        {label}
      </AppBadge>
    );
  });
}
