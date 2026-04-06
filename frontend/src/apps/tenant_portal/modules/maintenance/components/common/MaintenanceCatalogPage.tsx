import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../../store/language-context";
import type { ApiError } from "../../../../../../types";
import { MaintenanceHelpBubble } from "./MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "./MaintenanceModuleNav";

type SelectOption = {
  value: string;
  label: string;
};

type FieldConfig<TForm> = {
  key: keyof TForm;
  labelEs: string;
  labelEn: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "datetime-local";
  placeholderEs?: string;
  placeholderEn?: string;
  options?: SelectOption[];
  min?: number;
  disabled?: boolean;
};

type MaintenanceCatalogPageProps<TRow, TForm> = {
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  helpEs: string;
  helpEn: string;
  loadingLabelEs: string;
  loadingLabelEn: string;
  isLoading: boolean;
  isSubmitting: boolean;
  rows: TRow[];
  error: ApiError | null;
  feedback: string | null;
  editingId: number | null;
  form: TForm;
  fields: Array<FieldConfig<TForm>>;
  onFormChange: (next: TForm) => void;
  onSubmit: () => Promise<void>;
  onCancel?: () => void;
  onReload: () => Promise<void>;
  onNew: () => void;
  openCreateSignal?: string | number | null;
  columns: Array<{
    key: string;
    headerEs: string;
    headerEn: string;
    render: (row: TRow, language: string) => React.ReactNode;
  }>;
};

function formatInputValue(value: unknown): string | number {
  if (typeof value === "number") {
    return value;
  }
  return typeof value === "string" ? value : "";
}

export function MaintenanceCatalogPage<TRow, TForm extends Record<string, unknown>>({
  titleEs,
  titleEn,
  descriptionEs,
  descriptionEn,
  helpEs,
  helpEn,
  loadingLabelEs,
  loadingLabelEn,
  isLoading,
  isSubmitting,
  rows,
  error,
  feedback,
  editingId,
  form,
  fields,
  onFormChange,
  onSubmit,
  onCancel,
  onReload,
  onNew,
  openCreateSignal,
  columns,
}: MaintenanceCatalogPageProps<TRow, TForm>) {
  const { language } = useLanguage();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const localizedTitle = pickLocalizedText(language, { es: titleEs, en: titleEn });
  const localizedDescription = pickLocalizedText(language, {
    es: descriptionEs,
    en: descriptionEn,
  });
  const localizedHelp = pickLocalizedText(language, { es: helpEs, en: helpEn });
  const localizedLoadingLabel = pickLocalizedText(language, {
    es: loadingLabelEs,
    en: loadingLabelEn,
  });

  const localizedColumns = useMemo(
    () =>
      columns.map((column) => ({
        key: column.key,
        header: pickLocalizedText(language, {
          es: column.headerEs,
          en: column.headerEn,
        }),
        render: (row: TRow) => column.render(row, language),
      })),
    [columns, language]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      await onSubmit();
      setIsFormOpen(false);
    } catch (rawError) {
      setLocalError((rawError as Error).message);
    }
  }

  useEffect(() => {
    if (editingId) {
      setIsFormOpen(true);
    }
  }, [editingId]);

  useEffect(() => {
    if (openCreateSignal && !editingId) {
      setLocalError(null);
      setIsFormOpen(true);
    }
  }, [editingId, openCreateSignal]);

  function handleOpenCreate() {
    setLocalError(null);
    onNew();
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    if (isSubmitting) {
      return;
    }
    setLocalError(null);
    setIsFormOpen(false);
    if (editingId && onCancel) {
      onCancel();
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={pickLocalizedText(language, {
          es: "Mantenciones",
          en: "Maintenance",
        })}
        icon="maintenance"
        title={localizedTitle}
        description={localizedDescription}
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={pickLocalizedText(language, { es: "Ayuda", en: "Help" })}
              helpText={localizedHelp}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void onReload()}>
              {pickLocalizedText(language, { es: "Recargar", en: "Reload" })}
            </button>
            <button className="btn btn-primary" type="button" onClick={handleOpenCreate}>
              {pickLocalizedText(language, { es: "Nuevo registro", en: "New record" })}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {localError ? <div className="alert alert-danger mb-0">{localError}</div> : null}
      {error ? (
        <ErrorState
          title={pickLocalizedText(language, {
            es: "No se pudo cargar la vista",
            en: "The view could not be loaded",
          })}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={localizedLoadingLabel} />
      ) : null}

      {isFormOpen ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={handleCloseForm}
        >
          <div
            className="maintenance-form-modal"
            role="dialog"
            aria-modal="true"
            aria-label={pickLocalizedText(language, {
              es: editingId ? "Editar registro" : "Nuevo registro",
              en: editingId ? "Edit record" : "New record",
            })}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {pickLocalizedText(language, {
                es: editingId ? "Edición puntual" : "Alta bajo demanda",
                en: editingId ? "Targeted edit" : "On-demand creation",
              })}
            </div>
            <PanelCard
              title={pickLocalizedText(language, {
                es: editingId ? "Editar registro" : "Nuevo registro",
                en: editingId ? "Edit record" : "New record",
              })}
              subtitle={pickLocalizedText(language, {
                es: "Mantén limpio este dominio técnico para que el ciclo de mantenciones no se degrade.",
                en: "Keep this technical domain clean so the work-order lifecycle does not degrade.",
              })}
            >
              <form className="maintenance-form" onSubmit={(event) => void handleSubmit(event)}>
                <div className="row g-3">
                  {fields.map((field) => {
                    const label = pickLocalizedText(language, {
                      es: field.labelEs,
                      en: field.labelEn,
                    });
                    const placeholder = pickLocalizedText(language, {
                      es: field.placeholderEs ?? "",
                      en: field.placeholderEn ?? "",
                    });
                    const value = form[field.key];

                    if (field.type === "checkbox") {
                      return (
                        <div className="col-12" key={String(field.key)}>
                          <label className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={Boolean(value)}
                              disabled={field.disabled}
                              onChange={(event) =>
                                onFormChange({
                                  ...form,
                                  [field.key]: event.target.checked,
                                })
                              }
                            />
                            <span className="form-check-label">{label}</span>
                          </label>
                        </div>
                      );
                    }

                    if (field.type === "textarea") {
                      return (
                        <div className="col-12" key={String(field.key)}>
                          <label className="form-label">{label}</label>
                          <textarea
                            className="form-control"
                            value={formatInputValue(value)}
                            placeholder={placeholder}
                            rows={4}
                            disabled={field.disabled}
                            onChange={(event) =>
                              onFormChange({
                                ...form,
                                [field.key]: event.target.value,
                              })
                            }
                          />
                        </div>
                      );
                    }

                    if (field.type === "select") {
                      return (
                        <div className="col-12 col-md-6" key={String(field.key)}>
                          <label className="form-label">{label}</label>
                          <select
                            className="form-select"
                            value={formatInputValue(value)}
                            disabled={field.disabled}
                            onChange={(event) =>
                              onFormChange({
                                ...form,
                                [field.key]: event.target.value,
                              })
                            }
                          >
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div className="col-12 col-md-6" key={String(field.key)}>
                        <label className="form-label">{label}</label>
                        <input
                          className="form-control"
                          type={field.type ?? "text"}
                          min={field.min}
                          value={formatInputValue(value)}
                          placeholder={placeholder}
                          disabled={field.disabled}
                          onChange={(event) =>
                            onFormChange({
                              ...form,
                              [field.key]:
                                field.type === "number"
                                  ? Number(event.target.value || 0)
                                  {pickLocalizedText(language, { es: "Cancelar", en: "Cancel" })}
                            })
                          }
                                  {isSubmitting
                                    ? pickLocalizedText(language, { es: "Guardando...", en: "Saving..." })
                                    : editingId
                                      ? pickLocalizedText(language, {
                                          es: "Guardar cambios",
                                          en: "Save changes",
                                        })
                                      : pickLocalizedText(language, {
                                          es: "Crear registro",
                                          en: "Create record",
                                        })}
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : editingId
                        ? language === "es"
                          ? "Guardar cambios"
                          : "Save changes"
                        : language === "es"
                          ? "Crear registro"
                      title={pickLocalizedText(language, {
                        es: "Catálogo operativo",
                        en: "Operational catalog",
                      })}
                      subtitle={pickLocalizedText(language, {
                        es: "Base técnica que alimenta la operación del módulo.",
                        en: "Technical base that feeds the module operation.",
                      })}
        </div>
      ) : null}

      <DataTableCard
        title={language === "es" ? "Catálogo operativo" : "Operational catalog"}
        subtitle={
          language === "es"
            ? "Lista base del módulo técnico."
            : "Base list for the technical module."
        }
        rows={rows}
        columns={localizedColumns}
      />
    </div>
  );
}
