import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreTaxonomyPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Taxonomías" : "Taxonomy"}
      description={
        language === "es"
          ? "Perfiles funcionales, grupos de trabajo y tipos de tarea compartidos por los módulos operativos."
          : "Functional profiles, work groups, and task types shared by operational modules."
      }
    />
  );
}
