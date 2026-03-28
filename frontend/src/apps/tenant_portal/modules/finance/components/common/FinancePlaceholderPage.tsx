import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { useLanguage } from "../../../../../../store/language-context";

export function FinancePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <PageHeader eyebrow="Finance" title={title} description={description} />
      <PanelCard
        title={language === "es" ? "Vista en preparación" : "View in preparation"}
        subtitle={
          language === "es"
            ? "Esta sección queda reservada para los siguientes lotes del roadmap maestro."
            : "This section is reserved for the next slices in the master roadmap."
        }
      >
        <p className="text-secondary mb-0">
          {language === "es"
            ? "El módulo `finance` ya quedó estructurado como slice del tenant portal. Esta pantalla se habilitará cuando se implementen los catálogos, cuentas, reportes y demás bloques del roadmap."
            : "The `finance` module is already structured as a tenant portal slice. This screen will be enabled as catalogs, accounts, reports, and the remaining roadmap blocks are implemented."}
        </p>
      </PanelCard>
    </div>
  );
}
