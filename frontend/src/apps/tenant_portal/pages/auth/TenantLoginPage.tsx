import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { LanguageSelect } from "../../../../components/common/LanguageSelect";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { AppIcon } from "../../../../design-system/AppIcon";
import { AppToolbar } from "../../../../design-system/AppLayout";
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
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillAppliedRef.current) {
      return;
    }
    prefillAppliedRef.current = true;

    try {
      const raw = sessionStorage.getItem("platform_paas.tenant_portal_prefill");
      if (!raw) {
        return;
      }
      sessionStorage.removeItem("platform_paas.tenant_portal_prefill");
      const parsed = JSON.parse(raw) as {
        tenantSlug?: string;
        email?: string;
        password?: string;
        issuedAt?: number;
      };
      if (!parsed?.password || !parsed?.email || !parsed?.tenantSlug) {
        return;
      }
      if (parsed.issuedAt && Date.now() - parsed.issuedAt > 5 * 60 * 1000) {
        return;
      }
      setTenantSlug(parsed.tenantSlug);
      setEmail(parsed.email);
      setPassword(parsed.password);
    } catch {
      // ignore malformed storage
    }
  }, []);

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
      setError(formatTenantLoginError(typedError, language));
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
              <AppIcon name="tenants" size={22} />
            </div>
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
          <AppToolbar compact>
            <Link className="btn btn-outline-secondary btn-sm" to="/login">
              {language === "es" ? "Abrir Admin Plataforma" : "Open Platform Admin"}
            </Link>
          </AppToolbar>
        </div>
        {location.state && typeof location.state === "object" && "message" in location.state ? (
          <div className="alert alert-warning">{String(location.state.message)}</div>
        ) : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <AppForm onSubmit={handleSubmit}>
          <AppFormField fullWidth>
            <FieldHelpLabel
              label={language === "es" ? "Código de tu espacio" : "Workspace code"}
              language={language}
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
          </AppFormField>
          <AppFormField fullWidth>
            <FieldHelpLabel
              label={language === "es" ? "Usuario" : "User"}
              language={language}
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
          </AppFormField>
          <AppFormField
            label={language === "es" ? "Contraseña" : "Password"}
            fullWidth
          >
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

function normalizeQueryValue(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

function formatTenantLoginError(error: ApiError, language: "es" | "en") {
  const detail = (error.payload?.detail || error.message || "").trim();

  if (detail === "Tenant database configuration is incomplete") {
    return language === "es"
      ? "Este tenant todavía no está provisionado. Completa el provisioning desde Platform Admin antes de intentar entrar al portal tenant."
      : "This tenant is not provisioned yet. Complete provisioning from Platform Admin before accessing the tenant portal.";
  }

  if (detail === "Invalid credentials") {
    return language === "es"
      ? "Las credenciales no son válidas para este tenant."
      : "The credentials are not valid for this tenant.";
  }

  if (detail === "Tenant not found or inactive") {
    return language === "es"
      ? "No se encontró un tenant operativo con ese código."
      : "No active tenant was found for that code.";
  }

  if (detail === "Tenant provisioning pending") {
    return language === "es"
      ? "Este tenant todavía está en provisioning. Termina ese proceso desde Platform Admin antes de entrar al portal."
      : "This tenant is still provisioning. Finish that process from Platform Admin before entering the portal.";
  }

  if (detail === "Tenant suspended") {
    return language === "es"
      ? "Este tenant está suspendido y no admite acceso hasta que se reactive desde Platform Admin."
      : "This tenant is suspended and access will remain blocked until it is reactivated from Platform Admin.";
  }

  if (detail === "Tenant archived") {
    return language === "es"
      ? "Este tenant está archivado y no admite acceso hasta que se restaure formalmente desde Platform Admin."
      : "This tenant is archived and access stays blocked until it is formally restored from Platform Admin.";
  }

  if (detail === "Tenant unavailable due to operational error") {
    return language === "es"
      ? "Este tenant no está disponible por un problema operativo. Revísalo desde Platform Admin."
      : "This tenant is unavailable due to an operational issue. Review it from Platform Admin.";
  }

  if (detail === "Tenant suspended due to overdue billing" || detail === "invoice overdue") {
    return language === "es"
      ? "Este tenant quedó suspendido por deuda vencida y el acceso está bloqueado hasta regularizar la facturación."
      : "This tenant was suspended due to overdue billing and access stays blocked until payment is regularized.";
  }

  if (detail === "Tenant suspended by billing policy") {
    return language === "es"
      ? "Este tenant está suspendido por política de facturación y el acceso está bloqueado."
      : "This tenant is suspended by billing policy and access is blocked.";
  }

  if (detail === "Tenant subscription canceled" || detail.includes("subscription canceled")) {
    return language === "es"
      ? "La suscripción de este tenant está cancelada y el acceso ya no está disponible."
      : "This tenant subscription is canceled and access is no longer available.";
  }

  return (
    detail ||
    (language === "es"
      ? "No se pudo iniciar sesión en el portal tenant."
      : "Could not sign in to the tenant portal.")
  );
}

type FieldHelpLabelProps = {
  helpText: string;
  label: string;
  language: "es" | "en";
};

function FieldHelpLabel({ helpText, label, language }: FieldHelpLabelProps) {
  return (
    <div className="login-field-help">
      <label className="form-label mb-0">{label}</label>
      <button
        aria-label={`${language === "es" ? "Ayuda" : "Help"}: ${label}`}
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
