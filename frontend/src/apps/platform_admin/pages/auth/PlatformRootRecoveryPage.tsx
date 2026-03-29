import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { AppIcon } from "../../../../design-system/AppIcon";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import {
  getPlatformRootRecoveryStatus,
  recoverPlatformRootAccount,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import type {
  ApiError,
  PlatformRootRecoveryRequest,
  PlatformRootRecoveryStatusResponse,
} from "../../../../types";

const DEFAULT_FORM: PlatformRootRecoveryRequest = {
  recovery_key: "",
  full_name: "",
  email: "",
  password: "",
};

export function PlatformRootRecoveryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [status, setStatus] = useState<PlatformRootRecoveryStatusResponse | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [statusError, setStatusError] = useState<ApiError | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      setIsLoading(true);
      setStatusError(null);
      try {
        const response = await getPlatformRootRecoveryStatus();
        if (isMounted) {
          setStatus(response);
        }
      } catch (rawError) {
        if (isMounted) {
          setStatusError(rawError as ApiError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await recoverPlatformRootAccount(form);
      navigate("/login", {
        replace: true,
        state: {
          message:
            language === "es"
              ? `Cuenta raíz recuperada para ${response.email}. Inicia sesión con la nueva contraseña.`
              : `Root account recovered for ${response.email}. Sign in with the new password.`,
        },
      });
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(
    key: keyof PlatformRootRecoveryRequest,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const canSubmit =
    !isSubmitting &&
    status?.recovery_available === true &&
    form.recovery_key.trim() &&
    form.full_name.trim() &&
    form.email.trim() &&
    form.password.trim();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__eyebrow">Platform PaaS</div>
        <div className="d-flex align-items-start gap-3">
          <div className="page-header__icon">
            <AppIcon name="settings" size={22} />
          </div>
          <h1 className="login-card__title">
            {language === "es" ? "Recuperación de cuenta raíz" : "Root account recovery"}
          </h1>
        </div>
        <p className="login-card__subtitle">
          {language === "es"
            ? "Usa este flujo solo si ya no existe ningún superadministrador activo y conservas la clave de recuperación emitida al instalar."
            : "Use this flow only if there is no active superadmin left and you still have the recovery key issued during installation."}
        </p>

        <div className="login-card__portal-switch">
          <span>
            {language === "es"
              ? "Este no es el flujo normal de acceso diario."
              : "This is not the regular daily access flow."}
          </span>
          <AppToolbar compact>
            <Link className="btn btn-outline-secondary btn-sm" to="/login">
              {language === "es" ? "Volver al login" : "Back to login"}
            </Link>
          </AppToolbar>
        </div>

        {isLoading ? (
          <div className="alert alert-info">
            {language === "es" ? "Verificando disponibilidad..." : "Checking availability..."}
          </div>
        ) : null}
        {statusError ? (
          <div className="alert alert-danger">{getApiErrorDisplayMessage(statusError)}</div>
        ) : null}
        {!isLoading && status && !status.recovery_available ? (
          <div className="alert alert-warning">
            {status.has_active_superadmin
              ? language === "es"
                ? "La recuperación raíz no está disponible porque la plataforma todavía conserva un superadministrador activo."
                : "Root recovery is not available because the platform still has an active superadmin."
              : language === "es"
                ? "La recuperación raíz no está configurada en este entorno."
                : "Root recovery is not configured in this environment."}
          </div>
        ) : null}
        {error ? <div className="alert alert-danger">{getApiErrorDisplayMessage(error)}</div> : null}

        <AppForm onSubmit={handleSubmit}>
          <AppFormField
            label={language === "es" ? "Clave de recuperación" : "Recovery key"}
            fullWidth
          >
            <input
              className="form-control"
              type="password"
              value={form.recovery_key}
              onChange={(event) => updateField("recovery_key", event.target.value)}
              autoComplete="one-time-code"
            />
          </AppFormField>
          <AppFormField
            label={
              language === "es" ? "Nombre del superadministrador" : "Superadmin name"
            }
            fullWidth
          >
            <input
              className="form-control"
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              autoComplete="name"
            />
          </AppFormField>
          <AppFormField label={language === "es" ? "Correo raíz" : "Root email"} fullWidth>
            <input
              className="form-control"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
            />
          </AppFormField>
          <AppFormField
            label={language === "es" ? "Nueva contraseña" : "New password"}
            fullWidth
          >
            <input
              className="form-control"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="new-password"
            />
          </AppFormField>
          <AppFormActions>
            <button className="btn btn-primary" disabled={!canSubmit} type="submit">
              {isSubmitting
                ? language === "es"
                  ? "Recuperando..."
                  : "Recovering..."
                : language === "es"
                  ? "Recuperar cuenta raíz"
                  : "Recover root account"}
            </button>
          </AppFormActions>
        </AppForm>
      </div>
    </div>
  );
}
