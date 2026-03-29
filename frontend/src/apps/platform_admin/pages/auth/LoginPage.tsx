import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LanguageSelect } from "../../../../components/common/LanguageSelect";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { AppIcon } from "../../../../design-system/AppIcon";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { useLanguage } from "../../../../store/language-context";
import { useAuth } from "../../../../store/auth-context";
import type { ApiError } from "../../../../types";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setError(typedError.payload?.detail || typedError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__eyebrow">Platform PaaS</div>
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-start gap-3">
            <div className="page-header__icon">
              <AppIcon name="dashboard" size={22} />
            </div>
            <h1 className="login-card__title">
              {language === "es" ? "Administración de Plataforma" : "Platform Admin"}
            </h1>
          </div>
          <LanguageSelect />
        </div>
        <p className="login-card__subtitle">
          {language === "es"
            ? "Inicia sesión para operar tenants, provisioning y facturación."
            : "Sign in to operate tenants, provisioning and billing flows."}
        </p>
        <div className="login-card__portal-switch">
          <div className="d-grid gap-2">
            <span>
              {language === "es"
                ? "¿Necesitas entrar al espacio tenant?"
                : "Need the tenant workspace instead?"}
            </span>
            <AppToolbar compact>
              <Link className="btn btn-outline-secondary btn-sm" to="/tenant-portal/login">
                {language === "es" ? "Abrir Portal Tenant" : "Open Tenant Portal"}
              </Link>
              <Link className="btn btn-outline-secondary btn-sm" to="/login/root-recovery">
                {language === "es" ? "Recuperar cuenta raíz" : "Recover root account"}
              </Link>
            </AppToolbar>
          </div>
        </div>
        {location.state && typeof location.state === "object" && "message" in location.state ? (
          <div className="alert alert-warning">{String(location.state.message)}</div>
        ) : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <AppForm onSubmit={handleSubmit}>
          <AppFormField label="Email" fullWidth>
            <input
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </AppFormField>
          <AppFormField label={language === "es" ? "Contraseña" : "Password"} fullWidth>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </AppFormField>
          <AppFormActions>
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? language === "es"
                  ? "Ingresando..."
                  : "Signing in..."
                : language === "es"
                  ? "Ingresar"
                  : "Login"}
            </button>
          </AppFormActions>
        </AppForm>
      </div>
    </div>
  );
}
