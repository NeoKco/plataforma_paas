import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../../design-system/AppLayout";
import { AppBadge } from "../../../../../../design-system/AppBadge";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../../store/language-context";
import type { ApiError } from "../../../../../../types";
import { BusinessCoreHelpBubble } from "./BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "./BusinessCoreModuleNav";

type SelectOption = {
  value: string;
  label: string;
};

type FieldConfig<TForm> = {
  key: keyof TForm;
  labelEs: string;
  labelEn: string;
  type?: "text" | "email" | "number" | "textarea" | "select" | "checkbox";
  placeholderEs?: string;
  placeholderEn?: string;
  options?: SelectOption[];
  min?: number;
};

type BusinessCoreCatalogPageProps<TRow, TForm> = {
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
  renderEditorExtra?: (context: { language: string; editingId: number | null; form: TForm }) => React.ReactNode;
  renderTableIntro?: (context: { language: string; rows: TRow[] }) => React.ReactNode;
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

export function BusinessCoreCatalogPage<TRow, TForm extends Record<string, unknown>>({
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
  renderEditorExtra,
  renderTableIntro,
  columns,
}: BusinessCoreCatalogPageProps<TRow, TForm>) {
  const { language } = useLanguage();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  useEffect(() => {
    if (editingId !== null) {
      setIsEditorOpen(true);
    }
  }, [editingId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      await onSubmit();
      setIsEditorOpen(false);
    } catch (rawError) {
      setLocalError((rawError as Error).message);
    }
  }

  function handleOpenNew() {
    setLocalError(null);
    onNew();
    setIsEditorOpen(true);
  }

  function handleCloseEditor() {
    if (isSubmitting) {
      return;
    }
    setLocalError(null);
    if (onCancel) {
      onCancel();
    } else {
      onNew();
    }
    setIsEditorOpen(false);
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={pickLocalizedText(language, {
          es: "Core de negocio",
          en: "Business core",
        })}
        icon="business-core"
        title={localizedTitle}
        description={localizedDescription}
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={pickLocalizedText(language, { es: "Ayuda", en: "Help" })}
              helpText={localizedHelp}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void onReload()}>
              {pickLocalizedText(language, { es: "Recargar", en: "Reload" })}
            </button>
            <button className="btn btn-primary" type="button" onClick={handleOpenNew}>
              {pickLocalizedText(language, { es: "Nuevo registro", en: "New record" })}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

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

      {!isLoading && renderTableIntro ? renderTableIntro({ language, rows }) : null}

      <DataTableCard
        title={pickLocalizedText(language, {
          es: "Catálogo activo",
          en: "Active catalog",
        })}
        subtitle={pickLocalizedText(language, {
          es: "Lista operativa del dominio compartido.",
          en: "Operational list of the shared domain.",
        })}
        rows={rows}
        columns={localizedColumns}
      />

      {isEditorOpen ? (
        <div className="confirm-dialog-backdrop" role="presentation" onClick={handleCloseEditor}>
          <div
            className="confirm-dialog business-core-form-modal business-core-form-modal--catalog"
            role="dialog"
            aria-modal="true"
            aria-label={pickLocalizedText(language, {
              es: editingId ? "Editar registro" : "Nuevo registro",
              en: editingId ? "Edit record" : "New record",
            })}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {pickLocalizedText(language, {
                es: "Captura puntual",
                en: "Targeted capture",
              })}
            </div>
            <div className="confirm-dialog__title">
              {pickLocalizedText(language, {
                es: editingId ? "Editar registro" : "Nuevo registro",
                en: editingId ? "Edit record" : "New record",
              })}
            </div>
            <div className="confirm-dialog__description">
              {pickLocalizedText(language, {
                es: "Abre este formulario solo cuando realmente necesites crear o corregir un registro del core compartido.",
                en: "Open this form only when you actually need to create or correct a shared core record.",
              })}
            </div>
            <PanelCard
              title={pickLocalizedText(language, {
                es: editingId ? "Edición" : "Alta",
                en: editingId ? "Edition" : "Creation",
              })}
              subtitle={pickLocalizedText(language, {
                es: "Mantén esta base transversal limpia para que otros módulos la reutilicen.",
                en: "Keep this shared base clean so other modules can reuse it.",
              })}
            >
              <form className="business-core-form" onSubmit={(event) => void handleSubmit(event)}>
                <div className="row g-3 business-core-form-grid--dense">
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
                          type={field.type === "number" ? "number" : field.type ?? "text"}
                          min={field.min}
                          value={formatInputValue(value)}
                          placeholder={placeholder}
                          onChange={(event) =>
                            onFormChange({
                              ...form,
                              [field.key]:
                                field.type === "number"
                                  ? Number(event.target.value || 0)
                                  : event.target.value,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                  {renderEditorExtra ? (
                    <div className="col-12">
                      {renderEditorExtra({ language, editingId, form })}
                    </div>
                  ) : null}
                </div>
                <div className="business-core-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={handleCloseEditor}>
                    {pickLocalizedText(language, { es: "Cancelar", en: "Cancel" })}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
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
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
