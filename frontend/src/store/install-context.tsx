import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getHealthStatus } from "../services/install-api";
import type { ApiError } from "../types";

type InstallContextValue = {
  error: ApiError | null;
  isChecking: boolean;
  isInstalled: boolean;
  reload: () => Promise<boolean>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function reload() {
    setIsChecking(true);
    setError(null);
    try {
      const response = await getHealthStatus();
      setIsInstalled(response.installed);
      return response.installed;
    } catch (rawError) {
      setError(rawError as ApiError);
      return false;
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const value = useMemo<InstallContextValue>(
    () => ({
      error,
      isChecking,
      isInstalled,
      reload,
    }),
    [error, isChecking, isInstalled]
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error("useInstall must be used within InstallProvider");
  }
  return context;
}
