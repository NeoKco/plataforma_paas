import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import { getTenantBusinessSites, type TenantBusinessSite } from "../services/sitesService";
import {
  createTenantBusinessSiteResponsible,
  deleteTenantBusinessSiteResponsible,
  getTenantBusinessSiteResponsibles,
  updateTenantBusinessSiteResponsible,
  type TenantBusinessSiteResponsible,
  type TenantBusinessSiteResponsibleWriteRequest,
} from "../services/siteResponsiblesService";

function buildDefaultForm(): TenantBusinessSiteResponsibleWriteRequest {
  return {
    site_id: 0,
    tenant_user_id: 0,
    responsibility_kind: "primary",
    is_primary: false,
    is_active: true,
    starts_at: null,
    ends_at: null,
    notes: null,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreSiteResponsiblesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const requestedSiteId = Number(searchParams.get("siteId") || 0);
  const [rows, setRows] = useState<TenantBusinessSiteResponsible[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessSiteResponsibleWriteRequest>(buildDefaultForm());

  const activeSites = useMemo(() => sites.filter((site) => site.is_active), [sites]);
  const activeUsers = useMemo(() => tenantUsers.filter((user) => user.is_active), [tenantUsers]);
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const visibleRows = useMemo(
    () => (requestedSiteId > 0 ? rows.filter((row) => row.site_id === requestedSiteId) : rows),
    [requestedSiteId, rows]
  );

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [responsiblesResponse, sitesResponse, usersResponse] = await Promise.all([
        getTenantBusinessSiteResponsibles(session.accessToken, {
          siteId: requestedSiteId > 0 ? requestedSiteId : undefined,
        }),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
      ]);
      setRows(responsiblesResponse.data);
      setSites(sitesResponse.data);
      setTenantUsers(usersResponse.data);
      setForm((current) =>
        current.site_id
          ? current
          : {
              ...current,
              site_id: sitesResponse.data.find((site) => site.is_active)?.id || 0,
              tenant_user_id: usersResponse.data.find((user) => user.is_active)?.id || 0,
            }
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm({
      ...buildDefaultForm(),
      site_id: activeSites[0]?.id || 0,
      tenant_user_id: activeUsers[0]?.id || 0,
    });
  }

  function startEdit(item: TenantBusinessSiteResponsible) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      site_id: item.site_id,
      tenant_user_id: item.tenant_user_id,
      responsibility_kind: item.responsibility_kind,
      is_primary: item.is_primary,
      is_active: item.is_active,
      starts_at: item.starts_at,
      ends_at: item.ends_at,
      notes: item.notes,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: TenantBusinessSiteResponsibleWriteRequest = {
        site_id: Number(form.site_id),
        tenant_user_id: Number(form.tenant_user_id),
        responsibility_kind: form.responsibility_kind.trim().toLowerCase(),
        is_primary: form.is_primary,
        is_active: form.is_active,
        starts_at: normalizeNullable(form.starts_at),
        ends_at: normalizeNullable(form.ends_at),
        notes: normalizeNullable(form.notes),
      };
      const response = editingId
        ? await updateTenantBusinessSiteResponsible(session.accessToken, editingId, payload)
        : await createTenantBusinessSiteResponsible(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: TenantBusinessSiteResponsible) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el responsable de sitio para "${item.site_label}". ¿Continuar?`
        : `Delete the site responsible for "${item.site_label}". Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessSiteResponsible(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Responsables de sitio"
      titleEn="Site responsibles"
      descriptionEs="Relación operativa entre sitios y usuarios tenant responsables del terreno o la coordinación local."
      descriptionEn="Operational relation between sites and tenant users responsible for the field or local coordination."
      helpEs="Usa esta vista para dejar explícito quién responde por cada dirección. Maintenance puede reutilizar esta base para responsables reales del sitio sin inventar textos libres."
      helpEn="Use this view to make explicit who is responsible for each address. Maintenance can reuse this base for real site responsibles without inventing free text labels."
      loadingLabelEs="Cargando responsables de sitio..."
      loadingLabelEn="Loading site responsibles..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={visibleRows}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadData}
      onNew={startCreate}
      fields={[
        {
          key: "site_id",
          labelEs: "Sitio",
          labelEn: "Site",
          type: "select",
          options: sites.map((site) => ({
            value: String(site.id),
            label: siteById.get(site.id)?.address_line || site.name || `#${site.id}`,
          })),
        },
        {
          key: "tenant_user_id",
          labelEs: "Usuario tenant",
          labelEn: "Tenant user",
          type: "select",
          options: tenantUsers.map((user) => ({
            value: String(user.id),
            label: `${user.full_name} · ${user.email}`,
          })),
        },
        {
          key: "responsibility_kind",
          labelEs: "Tipo de responsabilidad",
          labelEn: "Responsibility kind",
          type: "select",
          options: [
            { value: "primary", label: language === "es" ? "Principal" : "Primary" },
            { value: "technical", label: language === "es" ? "Técnica" : "Technical" },
            { value: "administrative", label: language === "es" ? "Administrativa" : "Administrative" },
            { value: "local", label: language === "es" ? "Local" : "Local" },
          ],
        },
        { key: "is_primary", labelEs: "Principal", labelEn: "Primary", type: "checkbox" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "starts_at", labelEs: "Inicio", labelEn: "Starts at", type: "text" },
        { key: "ends_at", labelEs: "Término", labelEn: "Ends at", type: "text" },
        { key: "notes", labelEs: "Notas", labelEn: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "site",
          headerEs: "Sitio",
          headerEn: "Site",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.site_label}</div>
              <div className="business-core-cell__meta">{item.site_name}</div>
            </div>
          ),
        },
        {
          key: "user",
          headerEs: "Usuario",
          headerEn: "User",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.user_full_name}</div>
              <div className="business-core-cell__meta">{item.user_email}</div>
            </div>
          ),
        },
        {
          key: "kind",
          headerEs: "Tipo",
          headerEn: "Kind",
          render: (item, currentLanguage) =>
            item.responsibility_kind === "technical"
              ? currentLanguage === "es"
                ? "Técnica"
                : "Technical"
              : item.responsibility_kind === "administrative"
                ? currentLanguage === "es"
                  ? "Administrativa"
                  : "Administrative"
                : item.responsibility_kind === "local"
                  ? currentLanguage === "es"
                    ? "Local"
                    : "Local"
                  : currentLanguage === "es"
                    ? "Principal"
                    : "Primary",
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item) => (
            <AppBadge tone={item.is_active ? "success" : "neutral"}>
              {item.is_active ? (language === "es" ? "Activo" : "Active") : (language === "es" ? "Inactivo" : "Inactive")}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item) => (
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => startEdit(item)}>
                {language === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                {language === "es" ? "Eliminar" : "Delete"}
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
