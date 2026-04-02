import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreContactsPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Contactos" : "Contacts"}
      description={
        language === "es"
          ? "Contactos compartidos de negocio, separados del CRM y reutilizables por sitio y cliente."
          : "Shared business contacts, separated from CRM and reusable by site and client."
      }
    />
  );
}
