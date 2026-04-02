import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreOrganizationsPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Empresas y contrapartes" : "Organizations and counterparts"}
      description={
        language === "es"
          ? "Catálogo base para empresa propia, clientes institucionales, proveedores y partners."
          : "Base catalog for own company, institutional clients, suppliers, and partners."
      }
    />
  );
}
