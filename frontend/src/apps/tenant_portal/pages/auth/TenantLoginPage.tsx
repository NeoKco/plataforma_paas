import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { LanguageSelect } from "../../../../components/common/LanguageSelect";
import { useLanguage } from "../../../../store/language-context";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../types";

export function TenantLoginPage() {
  const { isAuthenticated, login } = useTenantAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchTenantSlug = normalizeQueryValue(searchParams.get("tenantSlug"));
  const searchEmail = normalizeQueryValue(searchParams.get("email"));
  const [tenantSlug, setTenantSlug] = useState(searchTenantSlug || "");
  const [email, setEmail] = useState(searchEmail || "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTenantSlug) {
      setTenantSlug(searchTenantSlug);
    }
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchEmail, searchTenantSlug]);

  if (isAuthenticated) {
    return <Navigate to="/tenant-portal" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(tenantSlug, email, password);
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setError(formatTenantLoginError(typedError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__eyebrow">Platform PaaS</div>
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h1 className="login-card__title">
              {language === "es" ? "Portal Tenant" : "Tenant Portal"}
            </h1>
          </div>
          <LanguageSelect />
        </div>
        <p className="login-card__subtitle">
          {language === "es"
            ? "Inicia sesión para revisar el estado de tu tenant, su plan, límites y módulos habilitados."
            : "Sign in to inspect your tenant status, plan, limits and enabled modules."}
        </p>
        <div className="login-card__portal-switch">
          <span>
            {language === "es"
              ? "¿Necesitas entrar a la operación de plataforma?"
              : "Need platform operations instead?"}
          </span>
          <Link className="btn btn-outline-secondary btn-sm" to="/login">
            {language === "es" ? "Abrir Admin Plataforma" : "Open Platform Admin"}
          </Link>
        </div>
        {location.state && typeof location.state === "object" && "message" in location.state ? (
          <div className="alert alert-warning">{String(location.state.message)}</div>
        ) : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <form className="d-grid gap-3" onSubmit={handleSubmit}>
          <div>
            <FieldHelpLabel
              label={language === "es" ? "Código de tu espacio" : "Workspace code"}
              helpText={
                language === "es"
                  ? "Es el identificador corto de tu portal. Si no lo conoces, pídelo al administrador."
                  : "This is your portal short code. If you do not know it, ask your administrator."
              }
            />
            <input
              className="form-control"
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              autoComplete="organization"
              placeholder={language === "es" ? "Ej: empresa-demo" : "Ex: empresa-demo"}
            />
          </div>
          <div>
            <FieldHelpLabel
              label={language === "es" ? "Usuario" : "User"}
              helpText={
                language === "es"
                  ? "Normalmente corresponde al correo de acceso entregado para tu tenant."
                  : "Usually this matches the access email assigned to your tenant."
              }
            />
            <input
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder={
                language === "es"
                  ? "Ej: admin@empresa-demo.local"
                  : "Ex: admin@empresa-demo.local"
              }
            />
          </div>
          <div>
            <label className="form-label">
              {language === "es" ? "Contraseña" : "Password"}
            </label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? language === "es"
                ? "Ingresando..."
                : "Signing in..."
              : language === "es"
                ? "Ingresar"
                : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function normalizeQueryValue(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

function formatTenantLoginError(error: ApiError) {
  const detail = (error.payload?.detail || error.message || "").trim();

  if (detail === "Tenant database configuration is incomplete") {
    return "Este tenant todavía no está provisionado. Completa el provisioning desde Platform Admin antes de intentar entrar al portal tenant.";
  }

  if (detail === "Invalid credentials") {
    return "Las credenciales no son válidas para este tenant.";
  }

  if (detail === "Tenant not found or inactive") {
    return "No se encontró un tenant operativo con ese código.";
  }

  if (detail === "Tenant provisioning pending") {
    return "Este tenant todavía está en provisioning. Termina ese proceso desde Platform Admin antes de entrar al portal.";
  }

  if (detail === "Tenant suspended") {
    return "Este tenant está suspendido y no admite acceso hasta que se reactive desde Platform Admin.";
  }

  if (detail === "Tenant archived") {
    return "Este tenant está archivado y no admite acceso hasta que se restaure formalmente desde Platform Admin.";
  }

  if (detail === "Tenant unavailable due to operational error") {
    return "Este tenant no está disponible por un problema operativo. Revísalo desde Platform Admin.";
  }

  if (detail === "Tenant suspended due to overdue billing" || detail === "invoice overdue") {
    return "Este tenant quedó suspendido por deuda vencida y el acceso está bloqueado hasta regularizar la facturación.";
  }

  if (detail === "Tenant suspended by billing policy") {
    return "Este tenant está suspendido por política de facturación y el acceso está bloqueado.";
  }

  if (detail === "Tenant subscription canceled" || detail.includes("subscription canceled")) {
    return "La suscripción de este tenant está cancelada y el acceso ya no está disponible.";
  }

  return detail || "No se pudo iniciar sesión en el portal tenant.";
}

type FieldHelpLabelProps = {
  helpText: string;
  label: string;
};

function FieldHelpLabel({ helpText, label }: FieldHelpLabelProps) {
  return (
    <div className="login-field-help">
      <label className="form-label mb-0">{label}</label>
      <button
        aria-label={`Ayuda: ${label}`}
        className="login-field-help__trigger"
        type="button"
      >
        ?
      </button>
      <div className="login-field-help__bubble" role="tooltip">
        {helpText}
      </div>
    </div>
  );
}
