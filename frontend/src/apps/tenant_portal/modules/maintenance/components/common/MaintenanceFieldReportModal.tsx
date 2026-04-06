import { useEffect, useMemo, useRef, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import { pickLocalizedText } from "../../../../../../store/language-context";
import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../../types";
import {
  deleteTenantMaintenanceWorkOrderEvidence,
  downloadTenantMaintenanceWorkOrderEvidence,
  getTenantMaintenanceFieldReport,
  updateTenantMaintenanceFieldReport,
  uploadTenantMaintenanceWorkOrderEvidence,
  type TenantMaintenanceFieldReport,
} from "../../services/fieldReportsService";

type MaintenanceFieldReportModalWorkOrder = {
  id: number;
  title: string;
};

type ChecklistFormItem = {
  item_key: string;
  label: string;
  is_completed: boolean;
  notes: string;
};

type Props = {
  accessToken?: string | null;
  clientLabel: string;
  siteLabel: string;
  installationLabel: string;
  effectiveTimeZone?: string | null;
  isOpen: boolean;
  language: "es" | "en";
  mode?: "edit" | "readonly";
  onClose: () => void;
  onFeedback?: (message: string) => void;
  workOrder: MaintenanceFieldReportModalWorkOrder | null;
};

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null) {
  if (!value) {
    return pickLocalizedText(language, { es: "sin fecha", en: "no date" });
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function buildChecklistForm(report?: TenantMaintenanceFieldReport | null): ChecklistFormItem[] {
  return (report?.checklist_items ?? []).map((item) => ({
    item_key: item.item_key,
    label: item.label,
    is_completed: item.is_completed,
    notes: item.notes ?? "",
  }));
}

export function MaintenanceFieldReportModal({
  accessToken,
  clientLabel,
  siteLabel,
  installationLabel,
  effectiveTimeZone,
  isOpen,
  language,
  mode = "edit",
  onClose,
  onFeedback,
  workOrder,
}: Props) {
  const isReadOnly = mode === "readonly";
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [report, setReport] = useState<TenantMaintenanceFieldReport | null>(null);
  const [closureNotes, setClosureNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistFormItem[]>([]);
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const closureSectionRef = useRef<HTMLDivElement | null>(null);
  const checklistSectionRef = useRef<HTMLDivElement | null>(null);
  const evidenceSectionRef = useRef<HTMLDivElement | null>(null);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.is_completed).length,
    [checklistItems]
  );

  const evidenceCount = report?.evidences.length ?? 0;

  function scrollToSection(sectionRef: React.RefObject<HTMLDivElement | null>) {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (!isOpen || !accessToken || !workOrder) {
      return;
    }
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTenantMaintenanceFieldReport(accessToken as string, workOrder!.id);
        if (cancelled) {
          return;
        }
        setReport(response.data);
        setClosureNotes(response.data.closure_notes ?? "");
        setChecklistItems(buildChecklistForm(response.data));
      } catch (rawError) {
        if (!cancelled) {
          setError(rawError as ApiError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isOpen, workOrder]);

  async function handleSave() {
    if (!accessToken || !workOrder || isReadOnly) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceFieldReport(accessToken, workOrder.id, {
        closure_notes: closureNotes.trim() || null,
        checklist_items: checklistItems.map((item) => ({
          item_key: item.item_key,
          label: item.label,
          is_completed: item.is_completed,
          notes: item.notes.trim() || null,
        })),
      });
      setReport(response.data);
      setClosureNotes(response.data.closure_notes ?? "");
      setChecklistItems(buildChecklistForm(response.data));
      onFeedback?.(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload() {
    if (!accessToken || !workOrder || !selectedFile || isReadOnly) {
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const response = await uploadTenantMaintenanceWorkOrderEvidence(
        accessToken,
        workOrder.id,
        selectedFile,
        uploadNotes
      );
      setReport((current) =>
        current
          ? { ...current, evidences: [response.data, ...current.evidences] }
          : current
      );
      setSelectedFile(null);
      setUploadNotes("");
      onFeedback?.(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteEvidence(evidenceId: number) {
    if (!accessToken || !workOrder || isReadOnly) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceWorkOrderEvidence(
        accessToken,
        workOrder.id,
        evidenceId
      );
      setReport((current) =>
        current
          ? {
              ...current,
              evidences: current.evidences.filter((item) => item.id !== evidenceId),
            }
          : current
      );
      onFeedback?.(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDownloadEvidence(evidenceId: number, fileName: string) {
    if (!accessToken || !workOrder) {
      return;
    }
    try {
      const result = await downloadTenantMaintenanceWorkOrderEvidence(
        accessToken,
        workOrder.id,
        evidenceId
      );
      const blob = result.contentType
        ? new Blob([result.blob], { type: result.contentType })
        : result.blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return isOpen && workOrder ? (
    <div className="maintenance-form-backdrop" role="presentation" onClick={onClose}>
      <div
        className="maintenance-form-modal maintenance-form-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t("Checklist y evidencias de mantención", "Maintenance checklist and evidence")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="maintenance-form-modal__eyebrow">
          {t("Terreno y cierre", "Field work and closure")}
        </div>
        <PanelCard
          title={t("Checklist y evidencias", "Checklist and evidence")}
          subtitle={t(
            "Registro técnico base del trabajo ejecutado, con adjuntos y observación de cierre estandarizada.",
            "Base technical record of executed work, with attachments and standardized closure notes."
          )}
        >
          <div className="maintenance-history-entry__meta mb-3">
            <strong>{workOrder.title}</strong>
            {` · ${clientLabel} · ${siteLabel} · ${installationLabel}`}
          </div>

          <div className="maintenance-mobile-quick-actions mb-3">
            <div className="maintenance-mobile-quick-actions__header">
              <div>
                <div className="maintenance-history-entry__title">
                  {t("Acciones rápidas en terreno", "Field quick actions")}
                </div>
                <div className="maintenance-history-entry__meta">
                  {t(
                    "Atajos móviles para completar cierre, checklist y evidencias sin recorrer toda la modal.",
                    "Mobile shortcuts to complete closure, checklist, and evidence without scrolling through the full modal."
                  )}
                </div>
              </div>
              <div className="maintenance-mobile-quick-actions__metrics">
                <div className="maintenance-mobile-quick-actions__metric">
                  <strong>{completedCount}/{checklistItems.length}</strong>
                  <span>{t("checklist", "checklist")}</span>
                </div>
                <div className="maintenance-mobile-quick-actions__metric">
                  <strong>{evidenceCount}</strong>
                  <span>{t("evidencias", "evidence")}</span>
                </div>
              </div>
            </div>
            <div className="maintenance-mobile-quick-actions__buttons">
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => scrollToSection(closureSectionRef)}>
                {t("Ir a cierre", "Jump to closure")}
              </button>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => scrollToSection(checklistSectionRef)}>
                {t("Ir a checklist", "Jump to checklist")}
              </button>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => scrollToSection(evidenceSectionRef)}>
                {t("Ir a evidencias", "Jump to evidence")}
              </button>
            </div>
          </div>

          {error ? (
            <ErrorState
              title={t("No se pudo cargar el checklist", "The checklist could not be loaded")}
              detail={getApiErrorDisplayMessage(error)}
              requestId={error.payload?.request_id}
            />
          ) : null}

          {isLoading ? (
            <LoadingBlock label={t("Cargando checklist...", "Loading checklist...")} />
          ) : (
            <div className="d-grid gap-3">
              <div ref={closureSectionRef} className="row g-3">
                <div className="col-12 col-lg-4">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {t("Avance checklist", "Checklist progress")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {completedCount}/{checklistItems.length} {t("ítems completos", "items completed")}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-8">
                  <label className="form-label">
                    {t("Observación de cierre estandarizada", "Standardized closure notes")}
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={closureNotes}
                    disabled={isReadOnly}
                    onChange={(event) => setClosureNotes(event.target.value)}
                  />
                </div>
              </div>

              <div ref={checklistSectionRef} className="panel-card border-0 bg-light-subtle">
                <div className="panel-card__header pb-2">
                  <div>
                    <h3 className="panel-card__title mb-1">
                      {t("Checklist técnico", "Technical checklist")}
                    </h3>
                    <p className="panel-card__subtitle mb-0">
                      {t(
                        "Checklist base para dejar trazabilidad homogénea de terreno.",
                        "Base checklist to keep consistent field traceability."
                      )}
                    </p>
                  </div>
                </div>
                <div className="panel-card__body pt-0 d-grid gap-3">
                  {checklistItems.map((item, index) => (
                    <div key={item.item_key} className="maintenance-cost-lines__item">
                      <div className="row g-3 align-items-start">
                        <div className="col-12 col-lg-5">
                          <div className="form-check mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={item.is_completed}
                              disabled={isReadOnly}
                              onChange={(event) =>
                                setChecklistItems((current) =>
                                  current.map((entry, currentIndex) =>
                                    currentIndex === index
                                      ? { ...entry, is_completed: event.target.checked }
                                      : entry
                                  )
                                )
                              }
                            />
                            <label className="form-check-label">{item.label}</label>
                          </div>
                        </div>
                        <div className="col-12 col-lg-7">
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder={t("Nota técnica breve", "Short technical note")}
                            value={item.notes}
                            disabled={isReadOnly}
                            onChange={(event) =>
                              setChecklistItems((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? { ...entry, notes: event.target.value }
                                    : entry
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div ref={evidenceSectionRef} className="panel-card border-0 bg-light-subtle">
                <div className="panel-card__header pb-2">
                  <div>
                    <h3 className="panel-card__title mb-1">
                      {t("Evidencias", "Evidence")}
                    </h3>
                    <p className="panel-card__subtitle mb-0">
                      {t(
                        "Adjuntos PDF o imagen del trabajo ejecutado.",
                        "PDF or image attachments from the executed work."
                      )}
                    </p>
                  </div>
                </div>
                <div className="panel-card__body pt-0 d-grid gap-3">
                  {!isReadOnly ? (
                    <div className="maintenance-cost-lines__item">
                      <div className="row g-3 align-items-end">
                        <div className="col-12 col-lg-5">
                          <label className="form-label">{t("Archivo", "File")}</label>
                          <input
                            className="form-control"
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            capture="environment"
                            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                          />
                          <div className="form-text text-muted">
                            {t(
                              "En móvil puedes abrir cámara o galería según lo permita el dispositivo.",
                              "On mobile, the device may offer camera or gallery capture."
                            )}
                          </div>
                        </div>
                        <div className="col-12 col-lg-5">
                          <label className="form-label">{t("Nota", "Note")}</label>
                          <input
                            className="form-control"
                            value={uploadNotes}
                            onChange={(event) => setUploadNotes(event.target.value)}
                          />
                        </div>
                        <div className="col-12 col-lg-2">
                          <button
                            className="btn btn-outline-primary w-100"
                            type="button"
                            disabled={!selectedFile || isUploading}
                            onClick={() => void handleUpload()}
                          >
                            {isUploading ? t("Subiendo...", "Uploading...") : t("Adjuntar", "Upload")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {report?.evidences.length ? (
                    <div className="d-grid gap-2">
                      {report.evidences.map((item) => (
                        <div key={item.id} className="maintenance-history-entry">
                          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                            <div>
                              <div className="maintenance-history-entry__title">{item.file_name}</div>
                              <div className="maintenance-history-entry__meta">
                                {item.notes || t("Sin nota", "No note")}
                              </div>
                              <div className="maintenance-history-entry__meta">
                                {Math.max(item.file_size / 1024, 0).toFixed(1)} KB · {formatDateTime(item.created_at, language, effectiveTimeZone)}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => void handleDownloadEvidence(item.id, item.file_name)}
                              >
                                {t("Descargar", "Download")}
                              </button>
                              {!isReadOnly ? (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  type="button"
                                  onClick={() => void handleDeleteEvidence(item.id)}
                                >
                                  {t("Eliminar", "Delete")}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="maintenance-history-entry__meta">
                      {t("Aún no hay evidencias adjuntas.", "There is no evidence attached yet.")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="maintenance-form__actions maintenance-form__actions--sticky-mobile mt-4">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
              {t("Cerrar", "Close")}
            </button>
            {!isReadOnly ? (
              <button className="btn btn-primary" type="button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? t("Guardando...", "Saving...") : t("Guardar checklist", "Save checklist")}
              </button>
            ) : null}
          </div>
        </PanelCard>
      </div>
    </div>
  ) : null;
}
