import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreClientsPage() {
  const { language } = useLanguage();

  return (
    <BusinessCorePlaceholderPage
      title={language === "es" ? "Clientes" : "Clients"}
      description={
        language === "es"
          ? "Entidad cliente separada de la organización para no mezclar roles comerciales con identidad base."
          : "Client entity separated from organization to avoid mixing commercial roles with base identity."
      }
    />
  );
}
