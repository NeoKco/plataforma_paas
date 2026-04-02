import { useMemo, useState } from "react";
import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import { useLanguage } from "../../../../../../store/language-context";
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
  columns,
}: MaintenanceCatalogPageProps<TRow, TForm>) {
  const { language } = useLanguage();
  const [localError, setLocalError] = useState<string | null>(null);

  const localizedColumns = useMemo(
    () =>
      columns.map((column) => ({
        key: column.key,
        header: language === "es" ? column.headerEs : column.headerEn,
        render: (row: TRow) => column.render(row, language),
      })),
    [columns, language]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      await onSubmit();
    } catch (rawError) {
      setLocalError((rawError as Error).message);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="maintenance"
        title={language === "es" ? titleEs : titleEn}
        description={language === "es" ? descriptionEs : descriptionEn}
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={language === "es" ? helpEs : helpEn}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void onReload()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={onNew}>
              {language === "es" ? "Nuevo registro" : "New record"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {localError ? <div className="alert alert-danger mb-0">{localError}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar la vista"
              : "The view could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? loadingLabelEs : loadingLabelEn} />
      ) : null}

      <div className="maintenance-catalog-layout">
        <PanelCard
          title={
            editingId
              ? language === "es"
                ? "Editar registro"
                : "Edit record"
              : language === "es"
                ? "Nuevo registro"
                : "New record"
          }
          subtitle={
            language === "es"
              ? "Mantén limpio este dominio técnico para que el ciclo de mantenciones no se degrade."
              : "Keep this technical domain clean so the work-order lifecycle does not degrade."
          }
        >
          <form className="maintenance-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="row g-3">
              {fields.map((field) => {
                const label = language === "es" ? field.labelEs : field.labelEn;
                const placeholder =
                  language === "es" ? field.placeholderEs : field.placeholderEn;
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
                      type={field.type ?? "text"}
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
            </div>
            <div className="maintenance-form__actions">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? language === "es"
                    ? "Guardando..."
                    : "Saving..."
                  : editingId
                    ? language === "es"
                      ? "Guardar cambios"
                      : "Save changes"
                    : language === "es"
                      ? "Crear registro"
                      : "Create record"}
              </button>
              {editingId && onCancel ? (
                <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

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
    </div>
  );
}
