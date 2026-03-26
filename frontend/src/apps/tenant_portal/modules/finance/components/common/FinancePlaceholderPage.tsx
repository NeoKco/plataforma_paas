import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";

export function FinancePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="d-grid gap-4">
      <PageHeader eyebrow="Finance" title={title} description={description} />
      <PanelCard
        title="Vista en preparación"
        subtitle="Esta sección queda reservada para los siguientes lotes del roadmap maestro."
      >
        <p className="text-secondary mb-0">
          El módulo `finance` ya quedó estructurado como slice del tenant portal.
          Esta pantalla se habilitará cuando se implementen los catálogos, cuentas,
          reportes y demás bloques del roadmap.
        </p>
      </PanelCard>
    </div>
  );
}
