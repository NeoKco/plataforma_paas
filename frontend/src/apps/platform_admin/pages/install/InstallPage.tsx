import { useMemo, useState } from "react";
import type { FormEvent, HTMLAttributes } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { AppIcon } from "../../../../design-system/AppIcon";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { runInstallerSetup } from "../../../../services/install-api";
import { useInstall } from "../../../../store/install-context";
import { useLanguage } from "../../../../store/language-context";
import type {
  ApiError,
  InstallSetupRequest,
  InstallSetupResponse,
} from "../../../../types";

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
  initial_superadmin_full_name: "",
  initial_superadmin_email: "",
  initial_superadmin_password: "",
};

export function InstallPage() {
  const navigate = useNavigate();
  const { error, isChecking, isInstalled, reload } = useInstall();
  const { language } = useLanguage();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [completedSetup, setCompletedSetup] = useState<InstallSetupResponse | null>(null);

  const helperCards = useMemo(
    () => [
      {
        title: language === "es" ? "Prepara la base central" : "Prepare the control database",
        detail:
          language === "es"
            ? "Crea y deja lista la base de control donde viven tenants, billing y provisioning."
            : "Creates and prepares the control database where tenants, billing and provisioning live.",
      },
      {
        title: language === "es" ? "Escribe la configuración inicial" : "Write the initial config",
        detail:
          language === "es"
            ? "Genera el `.env` base para que backend y plataforma arranquen con la misma referencia."
            : "Generates the base `.env` so backend and platform boot with the same reference.",
      },
      {
        title: language === "es" ? "Activa el modo normal" : "Enable normal mode",
        detail:
          language === "es"
            ? "Marca la plataforma como instalada para salir del modo instalador y entrar al login."
            : "Marks the platform as installed so it can leave installer mode and move to login.",
      },
    ],
    [language]
  );

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];

    if (!form.admin_db_user.trim()) {
      missing.push(
        language === "es" ? "usuario administrador de PostgreSQL" : "PostgreSQL admin user"
      );
    }
    if (!form.admin_db_password.trim()) {
      missing.push(
        language === "es"
          ? "contraseña del administrador PostgreSQL"
          : "PostgreSQL admin password"
      );
    }
    if (!form.control_db_password.trim()) {
      missing.push(
        language === "es"
          ? "contraseña propietaria de la base de control"
          : "control database owner password"
      );
    }
    if (!form.initial_superadmin_full_name.trim()) {
      missing.push(
        language === "es"
          ? "nombre del superadministrador inicial"
          : "initial superadmin name"
      );
    }
    if (!form.initial_superadmin_email.trim()) {
      missing.push(
        language === "es"
          ? "correo del superadministrador inicial"
          : "initial superadmin email"
      );
    }
    if (!form.initial_superadmin_password.trim()) {
      missing.push(
        language === "es"
          ? "contraseña del superadministrador inicial"
          : "initial superadmin password"
      );
    }

    return missing;
  }, [form, language]);

  const canSubmit = requiredMissing.length === 0 && !isSubmitting;

  if (isChecking) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <LoadingBlock
            label={
              language === "es"
                ? "Verificando estado de instalación..."
                : "Checking installation status..."
            }
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <ErrorState
            title={
              language === "es"
                ? "No se pudo verificar la instalación"
                : "Could not verify installation"
            }
            detail={error.payload?.detail || error.message}
            requestId={error.payload?.request_id}
          />
          <AppToolbar compact className="mt-3">
            <button className="btn btn-outline-primary" onClick={() => void reload()}>
              {language === "es" ? "Reintentar" : "Retry"}
            </button>
          </AppToolbar>
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
    setCompletedSetup(null);

    try {
      const response = await runInstallerSetup(form);
      setIsCompleted(true);
      setSubmitMessage(response.message);
      setCompletedSetup(response);
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
        <div className="d-flex align-items-start gap-3">
          <div className="page-header__icon">
            <AppIcon name="settings" size={22} />
          </div>
          <h1 className="login-card__title">
            {language === "es" ? "Instalador inicial" : "Initial installer"}
          </h1>
        </div>
        <p className="login-card__subtitle">
          {language === "es"
            ? "Configura la base de control de la plataforma y deja el entorno listo para usar `Platform Admin`."
            : "Configure the platform control database and leave the environment ready to use `Platform Admin`."}
        </p>

        {!isCompleted ? (
          <>
            <div className="install-card__status-strip">
              <AppBadge className="install-card__status-pill" tone="info">
                {language === "es" ? "Modo primer arranque" : "First boot mode"}
              </AppBadge>
              <p className="install-card__status-copy">
                {language === "es"
                  ? "Usa credenciales de PostgreSQL con permiso para crear roles y bases de datos."
                  : "Use PostgreSQL credentials with permission to create roles and databases."}
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
                <div className="install-card__support-title">
                  {language === "es"
                    ? "Necesitas antes de continuar"
                    : "You need this before continuing"}
                </div>
                <ul className="install-card__support-list">
                  <li>
                    {language === "es"
                      ? "acceso al servidor PostgreSQL"
                      : "access to the PostgreSQL server"}
                  </li>
                  <li>
                    {language === "es"
                      ? "un usuario con permisos de creación"
                      : "a user with create permissions"}
                  </li>
                  <li>
                    {language === "es"
                      ? "definir la contraseña del propietario de `platform_control`"
                      : "define the password for the `platform_control` owner"}
                  </li>
                </ul>
              </div>
              <div className="install-card__support-box">
                <div className="install-card__support-title">
                  {language === "es" ? "Qué no hace esta pantalla" : "What this screen does not do"}
                </div>
                <ul className="install-card__support-list">
                  <li>{language === "es" ? "no crea tenants todavía" : "it does not create tenants yet"}</li>
                  <li>{language === "es" ? "no provisiona módulos tenant" : "it does not provision tenant modules"}</li>
                  <li>{language === "es" ? "no reemplaza el login de administración" : "it does not replace the admin login"}</li>
                </ul>
              </div>
            </div>

            {submitError ? (
              <ErrorState
                title={
                  language === "es"
                    ? "La instalación no pudo completarse"
                    : "Installation could not be completed"
                }
                detail={submitError.payload?.detail || submitError.message}
                requestId={submitError.payload?.request_id}
              />
            ) : null}

            <AppForm className="d-grid gap-4" onSubmit={handleSubmit}>
              <section className="install-card__section">
                <div className="install-card__section-title">
                  {language === "es" ? "Servidor PostgreSQL" : "PostgreSQL server"}
                </div>
                <p className="install-card__section-copy">
                  {language === "es"
                    ? "Credenciales técnicas del servidor para crear la base central y su usuario propietario."
                    : "Technical server credentials used to create the control database and its owner user."}
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label="Host"
                    helpText={
                      language === "es"
                        ? "Usa `127.0.0.1` si PostgreSQL corre en la misma máquina."
                        : "Use `127.0.0.1` if PostgreSQL runs on the same machine."
                    }
                    placeholder="127.0.0.1"
                    language={language}
                    value={form.admin_db_host}
                    onChange={(value) => updateField("admin_db_host", value)}
                  />
                  <Field
                    label={language === "es" ? "Puerto" : "Port"}
                    helpText={
                      language === "es" ? "Puerto estándar de PostgreSQL." : "Default PostgreSQL port."
                    }
                    inputMode="numeric"
                    placeholder="5432"
                    language={language}
                    value={String(form.admin_db_port)}
                    onChange={(value) =>
                      updateField("admin_db_port", Number.parseInt(value || "0", 10) || 0)
                    }
                  />
                </div>
                <div className="tenant-inline-form-grid">
                  <Field
                    label={language === "es" ? "Base administrativa" : "Admin database"}
                    helpText={language === "es" ? "Normalmente `postgres`." : "Usually `postgres`."}
                    placeholder="postgres"
                    language={language}
                    value={form.admin_db_name}
                    onChange={(value) => updateField("admin_db_name", value)}
                  />
                  <Field
                    label={language === "es" ? "Usuario administrador" : "Admin user"}
                    helpText={
                      language === "es"
                        ? "Usuario con permisos para crear base y rol."
                        : "User with permission to create the database and owner role."
                    }
                    placeholder="postgres"
                    required
                    language={language}
                    value={form.admin_db_user}
                    onChange={(value) => updateField("admin_db_user", value)}
                  />
                </div>
                <Field
                  label={language === "es" ? "Contraseña administrador" : "Admin password"}
                  helpText={
                    language === "es"
                      ? "No se guarda como credencial de uso diario; solo se usa para bootstrap."
                      : "It is not stored as a daily-use credential; it is only used for bootstrap."
                  }
                  placeholder={
                    language === "es" ? "Contraseña del usuario administrador" : "Admin user password"
                  }
                  type="password"
                  autoComplete="new-password"
                  required
                  language={language}
                  value={form.admin_db_password}
                  onChange={(value) => updateField("admin_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">
                  {language === "es" ? "Base de control" : "Control database"}
                </div>
                <p className="install-card__section-copy">
                  {language === "es"
                    ? "Define la base central de la plataforma y el usuario dueño que la operará en adelante."
                    : "Define the central platform database and the owner user that will operate it afterwards."}
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label={language === "es" ? "Nombre de base" : "Database name"}
                    helpText={
                      language === "es"
                        ? "Quedará como base principal de `platform_admin`."
                        : "It will become the main database for `platform_admin`."
                    }
                    placeholder="platform_control"
                    language={language}
                    value={form.control_db_name}
                    onChange={(value) => updateField("control_db_name", value)}
                  />
                  <Field
                    label={language === "es" ? "Usuario propietario" : "Owner user"}
                    helpText={
                      language === "es"
                        ? "Usuario técnico que usará la plataforma después de instalar."
                        : "Technical user the platform will use after installation."
                    }
                    placeholder="platform_owner"
                    language={language}
                    value={form.control_db_user}
                    onChange={(value) => updateField("control_db_user", value)}
                  />
                </div>
                <Field
                  label={language === "es" ? "Contraseña propietaria" : "Owner password"}
                  helpText={
                    language === "es"
                      ? "Esta sí queda como secreto operativo persistente."
                      : "This one remains as a persistent operational secret."
                  }
                  placeholder={
                    language === "es" ? "Contraseña del usuario propietario" : "Owner user password"
                  }
                  type="password"
                  autoComplete="new-password"
                  required
                  language={language}
                  value={form.control_db_password}
                  onChange={(value) => updateField("control_db_password", value)}
                />
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">
                  {language === "es" ? "Metadata de aplicación" : "Application metadata"}
                </div>
                <p className="install-card__section-copy">
                  {language === "es"
                    ? "Datos visibles del backend base. Puedes ajustarlos después si el proyecto evoluciona."
                    : "Visible metadata for the base backend. You can adjust it later if the project evolves."}
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label={language === "es" ? "Nombre visible" : "Display name"}
                    placeholder="Platform Backend"
                    language={language}
                    value={form.app_name}
                    onChange={(value) => updateField("app_name", value)}
                  />
                  <Field
                    label={language === "es" ? "Versión" : "Version"}
                    placeholder="0.1.0"
                    language={language}
                    value={form.app_version}
                    onChange={(value) => updateField("app_version", value)}
                  />
                </div>
              </section>

              <section className="install-card__section">
                <div className="install-card__section-title">
                  {language === "es" ? "Cuenta raíz de plataforma" : "Platform root account"}
                </div>
                <p className="install-card__section-copy">
                  {language === "es"
                    ? "Esta será la única cuenta `superadmin` inicial. No depende de seeds ni de credenciales por defecto."
                    : "This will be the only initial `superadmin` account. It does not depend on seeds or default credentials."}
                </p>
                <div className="tenant-inline-form-grid">
                  <Field
                    label={language === "es" ? "Nombre completo" : "Full name"}
                    helpText={
                      language === "es"
                        ? "Identidad visible del superadministrador inicial."
                        : "Visible identity for the initial superadmin."
                    }
                    placeholder={language === "es" ? "Administrador raíz" : "Root administrator"}
                    required
                    language={language}
                    value={form.initial_superadmin_full_name}
                    onChange={(value) =>
                      updateField("initial_superadmin_full_name", value)
                    }
                  />
                  <Field
                    label={language === "es" ? "Correo raíz" : "Root email"}
                    helpText={
                      language === "es"
                        ? "Será el correo de acceso al login de plataforma."
                        : "It will be the email used to sign in to the platform."
                    }
                    placeholder="admin@tu-plataforma.local"
                    required
                    language={language}
                    value={form.initial_superadmin_email}
                    onChange={(value) =>
                      updateField("initial_superadmin_email", value)
                    }
                  />
                </div>
                <Field
                  label={language === "es" ? "Contraseña inicial" : "Initial password"}
                  helpText={
                    language === "es"
                      ? "Define aquí la contraseña real del superadministrador inicial."
                      : "Set the actual password for the initial superadmin here."
                  }
                  placeholder={
                    language === "es"
                      ? "Contraseña inicial del superadministrador"
                      : "Initial superadmin password"
                  }
                  type="password"
                  autoComplete="new-password"
                  required
                  language={language}
                  value={form.initial_superadmin_password}
                  onChange={(value) =>
                    updateField("initial_superadmin_password", value)
                  }
                />
              </section>

              {requiredMissing.length ? (
                <div className="install-card__validation app-form-field app-form-field--full">
                  <strong>
                    {language === "es" ? "Faltan datos obligatorios:" : "Missing required data:"}
                  </strong>{" "}
                  {requiredMissing.join(", ")}.
                </div>
              ) : null}

              <AppFormActions>
                <button className="btn btn-primary" disabled={!canSubmit} type="submit">
                  {isSubmitting
                    ? language === "es"
                      ? "Instalando..."
                      : "Installing..."
                    : language === "es"
                      ? "Instalar plataforma"
                      : "Install platform"}
                </button>
              </AppFormActions>
            </AppForm>
          </>
        ) : (
          <div className="d-grid gap-3">
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>{language === "es" ? "Instalación completada." : "Installation completed."}</strong>{" "}
              {submitMessage ||
                (language === "es"
                  ? "La plataforma fue instalada correctamente."
                  : "The platform was installed successfully.")}
            </div>
            <div className="install-card__support-box">
              <div className="install-card__support-title">
                {language === "es" ? "Qué sigue ahora" : "What comes next"}
              </div>
              <ul className="install-card__support-list">
                <li>
                  {language === "es"
                    ? "si el backend ya estaba levantado, reinícialo una vez"
                    : "if the backend was already running, restart it once"}
                </li>
                <li>{language === "es" ? "abre el login de `Platform Admin`" : "open the `Platform Admin` login"}</li>
                <li>
                  {language === "es"
                    ? "entra con el correo raíz que definiste en esta instalación"
                    : "sign in with the root email defined during this installation"}
                </li>
              </ul>
            </div>
            {completedSetup?.initial_superadmin_email ? (
              <div className="install-card__support-box">
                <div className="install-card__support-title">
                  {language === "es" ? "Credenciales raíz iniciales" : "Initial root credentials"}
                </div>
                <ul className="install-card__support-list">
                  <li>
                    {language === "es" ? "correo" : "email"}:{" "}
                    {completedSetup.initial_superadmin_email}
                  </li>
                  <li>
                    {language === "es"
                      ? "contraseña: la definida en esta instalación"
                      : "password: the one defined during this installation"}
                  </li>
                </ul>
              </div>
            ) : null}
            {completedSetup?.recovery_key ? (
              <div className="install-card__support-box">
                <div className="install-card__support-title">
                  {language === "es" ? "Clave de recuperación" : "Recovery key"}
                </div>
                <ul className="install-card__support-list">
                  <li>
                    {language === "es"
                      ? "guárdala fuera de la plataforma"
                      : "store it outside the platform"}
                  </li>
                  <li>
                    {language === "es"
                      ? "solo sirve si alguna vez no queda ningún `superadmin` activo"
                      : "it is only used if there is ever no active `superadmin` left"}
                  </li>
                  <li>
                    {language === "es" ? "valor emitido ahora" : "value issued now"}:{" "}
                    {completedSetup.recovery_key}
                  </li>
                </ul>
              </div>
            ) : null}
            <div className="install-card__success-note">
              {language === "es"
                ? "Si el backend fue levantado antes de instalar, puede requerir reinicio para exponer las rutas normales de plataforma."
                : "If the backend was started before installation, it may require a restart to expose the normal platform routes."}
            </div>
            <AppToolbar>
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                {language === "es" ? "Ir al login" : "Go to login"}
              </button>
              <button className="btn btn-outline-secondary" onClick={() => void reload()}>
                {language === "es" ? "Revalidar estado" : "Recheck status"}
              </button>
            </AppToolbar>
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
  language,
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
  language: "es" | "en";
}) {
  const requiredLabel = language === "es" ? "obligatorio" : "required";

  return (
    <AppFormField fullWidth>
      <label className="form-label">
        {label}
        {required ? <span className="install-card__required">{requiredLabel}</span> : null}
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
    </AppFormField>
  );
}
