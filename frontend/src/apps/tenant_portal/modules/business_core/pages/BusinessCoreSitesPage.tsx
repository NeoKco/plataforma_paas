import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreSitesPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Sitios" : "Sites"}
      description={
        language === "es"
          ? "Entidad de primer nivel para dirección operativa, contexto técnico y futuros activos."
          : "First-level entity for operating address, technical context, and future assets."
      }
    />
  );
}
