import { useMemo, useState } from "react";
import type { FormEvent, HTMLAttributes } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { runInstallerSetup } from "../../../../services/install-api";
import { useInstall } from "../../../../store/install-context";
import type { ApiError, InstallSetupRequest } from "../../../../types";

const DEFAULT_FORM: InstallSetupRequest = {
  admin_db_host: "127.0.0.1",
  admin_db_port: 5432,
  admin_db_name: "postgres",
  admin_db_user: "",
  admin_db_password: "",
  control_db_name: "platform_control",
  control_db_user: "platform_owner",
  control_db_password: "",
  app_name: "Platform Backend",
  app_version: "0.1.0",
};

export function InstallPage() {
  const navigate = useNavigate();
  const { error, isChecking, isInstalled, reload } = useInstall();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const helperCards = useMemo(
    () => [
      "crea la base de control de plataforma",
      "escribe el archivo .env inicial",
      "marca la plataforma como instalada",
    ],
    []
  );

  if (isChecking) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <LoadingBlock label="Verificando estado de instalación..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <ErrorState
            title="No se pudo verificar la instalación"
            detail={error.payload?.detail || error.message}
            requestId={error.payload?.request_id}
          />
          <div className="mt-3">
            <button className="btn btn-outline-primary" onClick={() => void reload()}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInstalled && !isCompleted) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await runInstallerSetup(form);
      setIsCompleted(true);
      setSubmitMessage(response.message);
      await reload();
    } catch (rawError) {
      setSubmitError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<Key extends keyof InstallSetupRequest>(
    key: Key,
    value: InstallSetupRequest[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="login-screen">
      <div className="install-card">
        <div className="login-card__eyebrow">Platform PaaS</div>
        <h1 className="login-card__title">Instalador inicial</h1>
        <p className="login-card__subtitle">
          Configura la base de control de la plataforma y deja el entorno listo para
          usar `Platform Admin`.
        </p>

        {!isCompleted ? (
          <>
            <div className="install-card__intro">
              {helperCards.map((item) => (
                <div key={item} className="install-card__intro-item">
                  {item}
                </div>
              ))}
            </div>

            {submitError ? (
              <ErrorState
                title="La instalación no pudo completarse"
                detail={submitError.payload?.detail || submitError.message}
                requestId={submitError.payload?.request_id}
              />
            ) : null}

            <form className="d-grid gap-4" onSubmit={handleSubmit}>
              <section className="install-card__section">
                <div className="install-card__section-title">Servidor PostgreSQL</div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Host"
                    value={form.admin_db_host}
                    onChange={(value) => updateField("admin_db_host", value)}
                  />
                  <Field
                    label="Puerto"
                    inputMode="numeric"
                    value={String(form.admin_db_port)}
                    onChange={(value) =>
                      updateField("admin_db_port", Number.parseInt(value || "0", 10) || 0)
                    }
                  />
                </div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Base administrativa"
                    value={form.admin_db_name}
                    onChange={(value) => updateField("admin_db_name", value)}
                  />
                  <Field
                    label="Usuario administrador"
                    value={form.admin_db_user}
                    onChange={(value) => updateField("admin_db_user", value)}
                  />
                </div>
                <Field
                  label="Contraseña administrador"
                  type="password"
                  value={form.admin_db_password}
                  onChange={(value) => updateField("admin_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">Base de control</div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Nombre de base"
                    value={form.control_db_name}
                    onChange={(value) => updateField("control_db_name", value)}
                  />
                  <Field
                    label="Usuario propietario"
                    value={form.control_db_user}
                    onChange={(value) => updateField("control_db_user", value)}
                  />
                </div>
                <Field
                  label="Contraseña propietaria"
                  type="password"
                  value={form.control_db_password}
                  onChange={(value) => updateField("control_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">Metadata de aplicación</div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Nombre visible"
                    value={form.app_name}
                    onChange={(value) => updateField("app_name", value)}
                  />
                  <Field
                    label="Versión"
                    value={form.app_version}
                    onChange={(value) => updateField("app_version", value)}
                  />
                </div>
              </section>

              <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Instalando..." : "Instalar plataforma"}
              </button>
            </form>
          </>
        ) : (
          <div className="d-grid gap-3">
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>Instalación completada.</strong>{" "}
              {submitMessage || "La plataforma fue instalada correctamente."}
            </div>
            <div className="install-card__success-note">
              Si el backend fue levantado antes de instalar, puede requerir reinicio para
              exponer las rutas normales de plataforma.
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Ir al login
              </button>
              <button className="btn btn-outline-secondary" onClick={() => void reload()}>
                Revalidar estado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        className="form-control"
        inputMode={inputMode}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
