import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  createTenantSocialCommunityGroup,
  deleteTenantSocialCommunityGroup,
  getTenantSocialCommunityGroups,
  updateTenantSocialCommunityGroup,
  updateTenantSocialCommunityGroupStatus,
  type TenantSocialCommunityGroup,
  type TenantSocialCommunityGroupWriteRequest,
} from "../services/socialCommunityGroupsService";

function buildDefaultForm(): TenantSocialCommunityGroupWriteRequest {
  return {
    name: "",
    commune: null,
    sector: null,
    zone: null,
    territorial_classification: null,
    notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreSocialCommunityGroupsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [items, setItems] = useState<TenantSocialCommunityGroup[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantSocialCommunityGroupWriteRequest>(buildDefaultForm());

  const usageByGroupId = useMemo(() => {
    const grouped = new Map<number, { linkedClients: number; activeClients: number }>();
    clients.forEach((client) => {
      if (!client.social_community_group_id) {
        return;
      }
      const current = grouped.get(client.social_community_group_id) ?? {
        linkedClients: 0,
        activeClients: 0,
      };
      grouped.set(client.social_community_group_id, {
        linkedClients: current.linkedClients + 1,
        activeClients: current.activeClients + (client.is_active ? 1 : 0),
      });
    });
    return grouped;
  }, [clients]);

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [groupsResponse, clientsResponse] = await Promise.all([
        getTenantSocialCommunityGroups(session.accessToken, {
          includeInactive: true,
        }),
        getTenantBusinessClients(session.accessToken, { includeInactive: true }),
      ]);
      setItems(groupsResponse.data);
      setClients(clientsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
  }

  function startEdit(item: TenantSocialCommunityGroup) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      name: item.name,
      commune: item.commune,
      sector: item.sector,
      zone: item.zone,
      territorial_classification: item.territorial_classification,
      notes: item.notes,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload: TenantSocialCommunityGroupWriteRequest = {
      ...form,
      name: form.name.trim(),
      commune: normalizeNullable(form.commune),
      sector: normalizeNullable(form.sector),
      zone: normalizeNullable(form.zone),
      territorial_classification: normalizeNullable(form.territorial_classification),
      notes: normalizeNullable(form.notes),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response =
        editingId !== null
          ? await updateTenantSocialCommunityGroup(session.accessToken, editingId, payload)
          : await createTenantSocialCommunityGroup(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantSocialCommunityGroup) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantSocialCommunityGroupStatus(
        session.accessToken,
        item.id,
        !item.is_active
      );
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantSocialCommunityGroup) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      t(
        `Eliminar "${item.name}" quitará este grupo social del catálogo compartido. Continúa solo si ya no hay clientes vinculados.`,
        `Deleting "${item.name}" will remove this social group from the shared catalog. Continue only if no clients still point to it.`
      )
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantSocialCommunityGroup(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Grupos sociales"
      titleEn="Social community groups"
      descriptionEs="Catálogo principal de agrupaciones sociales comunes que luego se asignan a los clientes."
      descriptionEn="Primary catalog of shared social community groups later assigned to clients."
      helpEs="Crea aquí los grupos sociales reales del negocio. Luego, al crear o editar un cliente, selecciónalo directamente sin depender de sugerencias por similitud."
      helpEn="Create the real social groups here. Then pick one directly while creating or editing a client instead of relying on similarity suggestions."
      loadingLabelEs="Cargando grupos sociales..."
      loadingLabelEn="Loading social community groups..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={items}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadItems}
      onNew={startCreate}
      renderTableIntro={({ language: currentLanguage, rows }) => (
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <PanelCard
              title={currentLanguage === "en" ? "Active" : "Activos"}
            >
              <div className="business-core-summary-metric">
                {rows.filter((item) => item.is_active).length}
              </div>
            </PanelCard>
          </div>
          <div className="col-12 col-md-3">
            <PanelCard
              title={currentLanguage === "en" ? "With commune" : "Con comuna"}
            >
              <div className="business-core-summary-metric">
                {rows.filter((item) => Boolean(item.commune)).length}
              </div>
            </PanelCard>
          </div>
          <div className="col-12 col-md-3">
            <PanelCard
              title={
                currentLanguage === "en" ? "With classification" : "Con clasificación"
              }
            >
              <div className="business-core-summary-metric">
                {rows.filter((item) => Boolean(item.territorial_classification)).length}
              </div>
            </PanelCard>
          </div>
          <div className="col-12 col-md-3">
            <PanelCard
              title={currentLanguage === "en" ? "In use" : "En uso"}
            >
              <div className="business-core-summary-metric">
                {rows.filter((item) => (usageByGroupId.get(item.id)?.linkedClients ?? 0) > 0).length}
              </div>
            </PanelCard>
          </div>
          <div className="col-12 col-md-6">
            <PanelCard
              title={currentLanguage === "en" ? "Linked clients" : "Clientes ligados"}
            >
              <div className="business-core-summary-metric">
                {rows.reduce(
                  (accumulator, item) =>
                    accumulator + (usageByGroupId.get(item.id)?.linkedClients ?? 0),
                  0
                )}
              </div>
            </PanelCard>
          </div>
          <div className="col-12 col-md-6">
            <PanelCard
              title={currentLanguage === "en" ? "Direct assignment ready" : "Listo para asignación directa"}
            >
              <div className="business-core-cell__meta">
                {currentLanguage === "es"
                  ? "Este catálogo ya debe alimentar el selector de Clientes. Si un grupo ya existe aquí, no deberías volver a resolverlo por similitud."
                  : "This catalog should already feed the Clients selector. If a group already exists here, you should not resolve it again by similarity."}
              </div>
            </PanelCard>
          </div>
        </div>
      )}
      fields={[
        {
          key: "name",
          labelEs: "Nombre grupo social",
          labelEn: "Social group name",
          placeholderEs: "Ej: Los Arbolitos",
          placeholderEn: "Ex: Los Arbolitos",
        },
        {
          key: "commune",
          labelEs: "Comuna",
          labelEn: "Commune",
          placeholderEs: "Ej: La Florida",
          placeholderEn: "Ex: La Florida",
        },
        {
          key: "sector",
          labelEs: "Sector",
          labelEn: "Sector",
          placeholderEs: "Ej: Oriente",
          placeholderEn: "Ex: East",
        },
        {
          key: "zone",
          labelEs: "Zona",
          labelEn: "Zone",
          placeholderEs: "Ej: Zona A",
          placeholderEn: "Ex: Zone A",
        },
        {
          key: "territorial_classification",
          labelEs: "Clasificación territorial / social",
          labelEn: "Territorial / social classification",
          placeholderEs: "Ej: territorial",
          placeholderEn: "Ex: territorial",
        },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "notes", labelEs: "Notas", labelEn: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "group",
          headerEs: "Grupo social",
          headerEn: "Social group",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">
                {[item.commune, item.sector, item.zone].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          ),
        },
        {
          key: "classification",
          headerEs: "Clasificación",
          headerEn: "Classification",
          render: (item) => item.territorial_classification || "—",
        },
        {
          key: "coverage",
          headerEs: "Cobertura",
          headerEn: "Coverage",
          render: (item) => {
            const usage = usageByGroupId.get(item.id);
            return (
              <div>
                <div className="business-core-cell__title">
                  {usage?.linkedClients
                    ? t(`${usage.linkedClients} clientes`, `${usage.linkedClients} clients`)
                    : t("sin clientes ligados", "no linked clients")}
                </div>
                <div className="business-core-cell__meta">
                  {usage?.linkedClients
                    ? t(
                        `${usage.activeClients} activos · ${usage.linkedClients - usage.activeClients} inactivos`,
                        `${usage.activeClients} active · ${usage.linkedClients - usage.activeClients} inactive`
                      )
                    : t(
                        "catálogo listo para asignación directa",
                        "catalog ready for direct assignment"
                      )}
                </div>
                <div className="business-core-cell__meta">
                  {[item.commune, item.zone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            );
          },
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item) => (
            <AppBadge tone={item.is_active ? "success" : "warning"}>
              {item.is_active ? t("activo", "active") : t("inactivo", "inactive")}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item) => (
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(item)}>
                {t("Editar", "Edit")}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                onClick={() => void handleToggle(item)}
              >
                {item.is_active ? t("Desactivar", "Deactivate") : t("Activar", "Activate")}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                {t("Eliminar", "Delete")}
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
