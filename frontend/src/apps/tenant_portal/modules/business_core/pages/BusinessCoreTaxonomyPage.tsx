import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreTaxonomyPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Taxonomías" : "Taxonomy"}
      description={
        language === "es"
          ? "Wave 2 ya está operativa: usa Perfiles, Grupos y Tipos de tarea para mantener la base compartida ordenada antes de seguir con Mantenciones."
          : "Wave 2 is already live: use Profiles, Groups, and Task Types to keep the shared base ordered before continuing with Maintenance."
      }
    />
  );
}
