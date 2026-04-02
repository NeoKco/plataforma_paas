import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { useLanguage } from "../../../../../../store/language-context";
import { BusinessCoreModuleNav } from "./BusinessCoreModuleNav";

export function BusinessCorePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={title}
        description={description}
      />
      <BusinessCoreModuleNav />
      <PanelCard
        title={language === "es" ? "Dominio transversal" : "Shared domain"}
        subtitle={
          language === "es"
            ? "Este frente define la base tenant que luego reutilizan Mantenciones, Proyectos e IoT."
            : "This front defines the tenant base later reused by Maintenance, Projects, and IoT."
        }
      >
        <p className="mb-0 text-secondary">
          {language === "es"
            ? "El primer corte técnico se centra en empresas, clientes, contactos y sitios. Grupos, perfiles funcionales y tipos de tarea quedan como la taxonomía compartida del segundo bloque."
            : "The first technical wave focuses on organizations, clients, contacts, and sites. Work groups, functional profiles, and task types remain as the shared taxonomy of the second block."}
        </p>
      </PanelCard>
    </div>
  );
}
