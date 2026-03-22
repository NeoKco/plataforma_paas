import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { useInstall } from "../../../store/install-context";

export function RequireInstalled({ children }: { children: ReactNode }) {
  const { error, isChecking, isInstalled, reload } = useInstall();

  if (isChecking) {
    return (
      <div className="container py-5">
        <LoadingBlock label="Verificando instalación de plataforma..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 d-grid gap-3">
        <ErrorState
          title="No se pudo verificar la instalación"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
        <div>
          <button className="btn btn-outline-primary" onClick={() => void reload()}>
            Reintentar verificación
          </button>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return <Navigate to="/install" replace />;
  }

  return <>{children}</>;
}
