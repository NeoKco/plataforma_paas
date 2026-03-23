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
      {
        title: "Prepara la base central",
        detail: "Crea y deja lista la base de control donde viven tenants, billing y provisioning.",
      },
      {
        title: "Escribe la configuración inicial",
        detail: "Genera el `.env` base para que backend y plataforma arranquen con la misma referencia.",
      },
      {
        title: "Activa el modo normal",
        detail: "Marca la plataforma como instalada para salir del modo instalador y entrar al login.",
      },
    ],
    []
  );

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];

    if (!form.admin_db_user.trim()) {
      missing.push("usuario administrador de PostgreSQL");
    }
    if (!form.admin_db_password.trim()) {
      missing.push("contraseña del administrador PostgreSQL");
    }
    if (!form.control_db_password.trim()) {
      missing.push("contraseña propietaria de la base de control");
    }

    return missing;
  }, [form]);

  const canSubmit = requiredMissing.length === 0 && !isSubmitting;

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
            <div className="install-card__status-strip">
              <div className="install-card__status-pill">Modo primer arranque</div>
              <p className="install-card__status-copy">
                Usa credenciales de PostgreSQL con permiso para crear roles y bases de datos.
              </p>
            </div>

            <div className="install-card__intro">
              {helperCards.map((item) => (
                <div key={item.title} className="install-card__intro-item">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>

            <div className="install-card__support-grid">
              <div className="install-card__support-box">
                <div className="install-card__support-title">Necesitas antes de continuar</div>
                <ul className="install-card__support-list">
                  <li>acceso al servidor PostgreSQL</li>
                  <li>un usuario con permisos de creación</li>
                  <li>definir la contraseña del propietario de `platform_control`</li>
                </ul>
              </div>
              <div className="install-card__support-box">
                <div className="install-card__support-title">Qué no hace esta pantalla</div>
                <ul className="install-card__support-list">
                  <li>no crea tenants todavía</li>
                  <li>no provisiona módulos tenant</li>
                  <li>no reemplaza el login de administración</li>
                </ul>
              </div>
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
                <p className="install-card__section-copy">
                  Credenciales técnicas del servidor para crear la base central y su usuario propietario.
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Host"
                    helpText="Usa `127.0.0.1` si PostgreSQL corre en la misma máquina."
                    placeholder="127.0.0.1"
                    value={form.admin_db_host}
                    onChange={(value) => updateField("admin_db_host", value)}
                  />
                  <Field
                    label="Puerto"
                    helpText="Puerto estándar de PostgreSQL."
                    inputMode="numeric"
                    placeholder="5432"
                    value={String(form.admin_db_port)}
                    onChange={(value) =>
                      updateField("admin_db_port", Number.parseInt(value || "0", 10) || 0)
                    }
                  />
                </div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Base administrativa"
                    helpText="Normalmente `postgres`."
                    placeholder="postgres"
                    value={form.admin_db_name}
                    onChange={(value) => updateField("admin_db_name", value)}
                  />
                  <Field
                    label="Usuario administrador"
                    helpText="Usuario con permisos para crear base y rol."
                    placeholder="postgres"
                    required
                    value={form.admin_db_user}
                    onChange={(value) => updateField("admin_db_user", value)}
                  />
                </div>
                <Field
                  label="Contraseña administrador"
                  helpText="No se guarda como credencial de uso diario; solo se usa para bootstrap."
                  placeholder="Contraseña del usuario administrador"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.admin_db_password}
                  onChange={(value) => updateField("admin_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">Base de control</div>
                <p className="install-card__section-copy">
                  Define la base central de la plataforma y el usuario dueño que la operará en adelante.
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Nombre de base"
                    helpText="Quedará como base principal de `platform_admin`."
                    placeholder="platform_control"
                    value={form.control_db_name}
                    onChange={(value) => updateField("control_db_name", value)}
                  />
                  <Field
                    label="Usuario propietario"
                    helpText="Usuario técnico que usará la plataforma después de instalar."
                    placeholder="platform_owner"
                    value={form.control_db_user}
                    onChange={(value) => updateField("control_db_user", value)}
                  />
                </div>
                <Field
                  label="Contraseña propietaria"
                  helpText="Esta sí queda como secreto operativo persistente."
                  placeholder="Contraseña del usuario propietario"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.control_db_password}
                  onChange={(value) => updateField("control_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">Metadata de aplicación</div>
                <p className="install-card__section-copy">
                  Datos visibles del backend base. Puedes ajustarlos después si el proyecto evoluciona.
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Nombre visible"
                    placeholder="Platform Backend"
                    value={form.app_name}
                    onChange={(value) => updateField("app_name", value)}
                  />
                  <Field
                    label="Versión"
                    placeholder="0.1.0"
                    value={form.app_version}
                    onChange={(value) => updateField("app_version", value)}
                  />
                </div>
              </section>

              {requiredMissing.length ? (
                <div className="install-card__validation">
                  <strong>Faltan datos obligatorios:</strong> {requiredMissing.join(", ")}.
                </div>
              ) : null}

              <button className="btn btn-primary" disabled={!canSubmit} type="submit">
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
            <div className="install-card__support-box">
              <div className="install-card__support-title">Qué sigue ahora</div>
              <ul className="install-card__support-list">
                <li>si el backend ya estaba levantado, reinícialo una vez</li>
                <li>abre el login de `Platform Admin`</li>
                <li>crea o verifica el superadmin y luego empieza con tenants</li>
              </ul>
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
  helpText,
  placeholder,
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required ? <span className="install-card__required">obligatorio</span> : null}
      </label>
      {helpText ? <div className="install-card__field-help">{helpText}</div> : null}
      <input
        className="form-control"
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
