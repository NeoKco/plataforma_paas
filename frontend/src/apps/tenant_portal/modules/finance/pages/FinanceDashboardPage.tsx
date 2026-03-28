import { FinancePlaceholderPage } from "../components/common/FinancePlaceholderPage";
import { useLanguage } from "../../../../../store/language-context";

export function FinanceDashboardPage() {
  const { language } = useLanguage();

  return (
    <FinancePlaceholderPage
      title={language === "es" ? "Dashboard financiero" : "Financial dashboard"}
      description={
        language === "es"
          ? "Resumen ejecutivo del módulo base de finanzas del tenant."
          : "Executive summary of the tenant's base finance module."
      }
    />
  );
}
