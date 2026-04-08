import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { useInstall } from "../../../store/install-context";
import { useLanguage } from "../../../store/language-context";

export function RequireNotInstalled({ children }: { children: ReactNode }) {
  const { error, isChecking, isInstalled, reload } = useInstall();
  const { language } = useLanguage();

  if (isChecking) {
    return (
      <div className="container py-5">
        <LoadingBlock
          label={
            language === "es"
              ? "Verificando instalación de plataforma..."
              : "Checking platform installation..."
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 d-grid gap-3">
        <ErrorState
          title={
            language === "es"
              ? "No se pudo verificar la instalación"
              : "Could not verify the installation"
          }
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
        <div>
          <button className="btn btn-outline-primary" onClick={() => void reload()}>
            {language === "es" ? "Reintentar verificación" : "Retry check"}
          </button>
        </div>
      </div>
    );
  }

  if (isInstalled) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
