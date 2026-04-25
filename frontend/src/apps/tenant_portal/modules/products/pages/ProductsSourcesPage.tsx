import { useEffect, useState } from "react";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { ProductsModuleNav } from "../components/common/ProductsModuleNav";
import {
  createProductCatalogPriceHistory,
  createProductCatalogSource,
  getProductCatalogConnectors,
  getProductCatalogItems,
  getProductCatalogPriceHistory,
  getProductCatalogSources,
  type ProductCatalogConnector,
  type ProductCatalogItem,
  type ProductCatalogPriceHistoryItem,
  type ProductCatalogProductSource,
} from "../services/productsService";

function formatMoney(value: number, language: "es" | "en", currencyCode = "CLP") {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode || "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ProductsSourcesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [connectors, setConnectors] = useState<ProductCatalogConnector[]>([]);
  const [sources, setSources] = useState<ProductCatalogProductSource[]>([]);
  const [priceHistory, setPriceHistory] = useState<ProductCatalogPriceHistoryItem[]>([]);
  const [productId, setProductId] = useState("");
  const [connectorId, setConnectorId] = useState("");
  const [sourceStatus, setSourceStatus] = useState("all");
  const [sourceForm, setSourceForm] = useState({
    productId: "",
    connectorId: "",
    source_kind: "manual_capture",
    source_label: "",
    source_url: "",
    external_reference: "",
    source_status: "active",
    latest_unit_price: "0",
    currency_code: "CLP",
    source_summary: "",
  });
  const [priceForm, setPriceForm] = useState({
    productId: "",
    connectorId: "",
    source_label: "",
    source_url: "",
    unit_price: "0",
    currency_code: "CLP",
    price_kind: "reference",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [productsResponse, connectorsResponse, sourcesResponse, priceResponse] = await Promise.all([
        getProductCatalogItems(session.accessToken),
        getProductCatalogConnectors(session.accessToken),
        getProductCatalogSources(session.accessToken, {
          product_id: productId ? Number(productId) : null,
          connector_id: connectorId ? Number(connectorId) : null,
          source_status: sourceStatus === "all" ? null : sourceStatus,
        }),
        getProductCatalogPriceHistory(session.accessToken, {
          product_id: productId ? Number(productId) : null,
          connector_id: connectorId ? Number(connectorId) : null,
        }),
      ]);
      setProducts(productsResponse.data);
      setConnectors(connectorsResponse.data);
      setSources(sourcesResponse.data);
      setPriceHistory(priceResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken, productId, connectorId, sourceStatus]);

  async function handleCreateSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !sourceForm.productId) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await createProductCatalogSource(session.accessToken, Number(sourceForm.productId), {
        connector_id: sourceForm.connectorId ? Number(sourceForm.connectorId) : null,
        source_kind: sourceForm.source_kind,
        source_label: sourceForm.source_label || null,
        source_url: sourceForm.source_url || null,
        external_reference: sourceForm.external_reference || null,
        source_status: sourceForm.source_status,
        latest_unit_price: Number(sourceForm.latest_unit_price) || 0,
        currency_code: sourceForm.currency_code || "CLP",
        source_summary: sourceForm.source_summary || null,
      });
      setFeedback(response.message);
      setSourceForm((current) => ({
        ...current,
        source_label: "",
        source_url: "",
        external_reference: "",
        source_summary: "",
        latest_unit_price: "0",
      }));
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreatePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !priceForm.productId) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await createProductCatalogPriceHistory(session.accessToken, Number(priceForm.productId), {
        connector_id: priceForm.connectorId ? Number(priceForm.connectorId) : null,
        source_label: priceForm.source_label || null,
        source_url: priceForm.source_url || null,
        unit_price: Number(priceForm.unit_price) || 0,
        currency_code: priceForm.currency_code || "CLP",
        price_kind: priceForm.price_kind,
        notes: priceForm.notes || null,
      });
      setFeedback(response.message);
      setPriceForm((current) => ({
        ...current,
        source_label: "",
        source_url: "",
        unit_price: "0",
        notes: "",
      }));
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="reports"
        title={language === "es" ? "Fuentes y precios" : "Sources and pricing"}
        description={
          language === "es"
            ? "Cada producto puede conservar varias fuentes, referencias y eventos de precio. Este carril separa el catálogo operativo de la evidencia externa."
            : "Each product can preserve multiple sources, references, and price events. This separates the operational catalog from external evidence."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar fuentes/precios" : "Could not load sources/prices"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando fuentes..." : "Loading sources..."} /> : null}

      <PanelCard
        title={language === "es" ? "Filtros operativos" : "Operational filters"}
        subtitle={
          language === "es"
            ? "Cruza catálogo, conectores y estado de fuente para revisar precios vigentes o históricos."
            : "Cross catalog, connectors, and source state to review current or historical prices."
        }
      >
        <div className="crm-form-grid">
          <label>
            <span>{language === "es" ? "Producto" : "Product"}</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">{language === "es" ? "Todos" : "All"}</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Conector" : "Connector"}</span>
            <select value={connectorId} onChange={(event) => setConnectorId(event.target.value)}>
              <option value="">{language === "es" ? "Todos" : "All"}</option>
              {connectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Estado fuente" : "Source status"}</span>
            <select value={sourceStatus} onChange={(event) => setSourceStatus(event.target.value)}>
              <option value="all">{language === "es" ? "Todos" : "All"}</option>
              <option value="active">{language === "es" ? "Activa" : "Active"}</option>
              <option value="stale">{language === "es" ? "Desfasada" : "Stale"}</option>
              <option value="archived">{language === "es" ? "Archivada" : "Archived"}</option>
            </select>
          </label>
        </div>
      </PanelCard>

      <div className="crm-detail-grid">
        <PanelCard
          title={language === "es" ? "Registrar fuente manual" : "Register manual source"}
          subtitle={
            language === "es"
              ? "Útil cuando una referencia entra fuera del scraping o debes fijar una fuente aprobada."
              : "Useful when a reference comes outside scraping or you need to pin an approved source."
          }
        >
          <form className="crm-form-grid" onSubmit={(event) => void handleCreateSource(event)}>
            <label>
              <span>{language === "es" ? "Producto" : "Product"}</span>
              <select value={sourceForm.productId} onChange={(event) => setSourceForm((current) => ({ ...current, productId: event.target.value }))}>
                <option value="">{language === "es" ? "Selecciona" : "Select"}</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Conector" : "Connector"}</span>
              <select value={sourceForm.connectorId} onChange={(event) => setSourceForm((current) => ({ ...current, connectorId: event.target.value }))}>
                <option value="">{language === "es" ? "Sin conector" : "No connector"}</option>
                {connectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Tipo fuente" : "Source kind"}</span>
              <select value={sourceForm.source_kind} onChange={(event) => setSourceForm((current) => ({ ...current, source_kind: event.target.value }))}>
                <option value="manual_capture">{language === "es" ? "Manual" : "Manual"}</option>
                <option value="url_reference">{language === "es" ? "URL" : "URL"}</option>
                <option value="vendor_site">{language === "es" ? "Sitio proveedor" : "Vendor site"}</option>
                <option value="vendor_feed">{language === "es" ? "Feed proveedor" : "Vendor feed"}</option>
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Estado" : "Status"}</span>
              <select value={sourceForm.source_status} onChange={(event) => setSourceForm((current) => ({ ...current, source_status: event.target.value }))}>
                <option value="active">{language === "es" ? "Activa" : "Active"}</option>
                <option value="stale">{language === "es" ? "Desfasada" : "Stale"}</option>
                <option value="archived">{language === "es" ? "Archivada" : "Archived"}</option>
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Etiqueta fuente" : "Source label"}</span>
              <input value={sourceForm.source_label} onChange={(event) => setSourceForm((current) => ({ ...current, source_label: event.target.value }))} />
            </label>
            <label className="crm-form-grid__full">
              <span>URL</span>
              <input value={sourceForm.source_url} onChange={(event) => setSourceForm((current) => ({ ...current, source_url: event.target.value }))} />
            </label>
            <label>
              <span>{language === "es" ? "Referencia externa" : "External reference"}</span>
              <input value={sourceForm.external_reference} onChange={(event) => setSourceForm((current) => ({ ...current, external_reference: event.target.value }))} />
            </label>
            <label>
              <span>{language === "es" ? "Precio actual" : "Current price"}</span>
              <input type="number" min="0" step="0.01" value={sourceForm.latest_unit_price} onChange={(event) => setSourceForm((current) => ({ ...current, latest_unit_price: event.target.value }))} />
            </label>
            <label>
              <span>{language === "es" ? "Moneda" : "Currency"}</span>
              <input value={sourceForm.currency_code} onChange={(event) => setSourceForm((current) => ({ ...current, currency_code: event.target.value }))} />
            </label>
            <label className="crm-form-grid__full">
              <span>{language === "es" ? "Resumen" : "Summary"}</span>
              <textarea rows={3} value={sourceForm.source_summary} onChange={(event) => setSourceForm((current) => ({ ...current, source_summary: event.target.value }))} />
            </label>
            <div className="crm-form-actions crm-form-grid__full">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting || !sourceForm.productId}>
                {language === "es" ? "Guardar fuente" : "Save source"}
              </button>
            </div>
          </form>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Registrar evento de precio" : "Register price event"}
          subtitle={
            language === "es"
              ? "Permite fijar precio manual o precio observado sin alterar el catálogo base hasta revisarlo."
              : "Allows you to log a manual or observed price without altering the base catalog until reviewed."
          }
        >
          <form className="crm-form-grid" onSubmit={(event) => void handleCreatePrice(event)}>
            <label>
              <span>{language === "es" ? "Producto" : "Product"}</span>
              <select value={priceForm.productId} onChange={(event) => setPriceForm((current) => ({ ...current, productId: event.target.value }))}>
                <option value="">{language === "es" ? "Selecciona" : "Select"}</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Conector" : "Connector"}</span>
              <select value={priceForm.connectorId} onChange={(event) => setPriceForm((current) => ({ ...current, connectorId: event.target.value }))}>
                <option value="">{language === "es" ? "Sin conector" : "No connector"}</option>
                {connectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Tipo precio" : "Price kind"}</span>
              <select value={priceForm.price_kind} onChange={(event) => setPriceForm((current) => ({ ...current, price_kind: event.target.value }))}>
                <option value="reference">{language === "es" ? "Referencial" : "Reference"}</option>
                <option value="quoted">{language === "es" ? "Cotizado" : "Quoted"}</option>
                <option value="list_price">{language === "es" ? "Lista" : "List price"}</option>
                <option value="offer">{language === "es" ? "Oferta" : "Offer"}</option>
              </select>
            </label>
            <label>
              <span>{language === "es" ? "Precio" : "Price"}</span>
              <input type="number" min="0" step="0.01" value={priceForm.unit_price} onChange={(event) => setPriceForm((current) => ({ ...current, unit_price: event.target.value }))} />
            </label>
            <label>
              <span>{language === "es" ? "Moneda" : "Currency"}</span>
              <input value={priceForm.currency_code} onChange={(event) => setPriceForm((current) => ({ ...current, currency_code: event.target.value }))} />
            </label>
            <label>
              <span>{language === "es" ? "Etiqueta fuente" : "Source label"}</span>
              <input value={priceForm.source_label} onChange={(event) => setPriceForm((current) => ({ ...current, source_label: event.target.value }))} />
            </label>
            <label className="crm-form-grid__full">
              <span>URL</span>
              <input value={priceForm.source_url} onChange={(event) => setPriceForm((current) => ({ ...current, source_url: event.target.value }))} />
            </label>
            <label className="crm-form-grid__full">
              <span>{language === "es" ? "Notas" : "Notes"}</span>
              <textarea rows={3} value={priceForm.notes} onChange={(event) => setPriceForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div className="crm-form-actions crm-form-grid__full">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting || !priceForm.productId}>
                {language === "es" ? "Registrar precio" : "Register price"}
              </button>
            </div>
          </form>
        </PanelCard>
      </div>

      <DataTableCard
        title={language === "es" ? "Fuentes registradas" : "Registered sources"}
        subtitle={
          language === "es"
            ? "Cada fila representa una referencia usable por el catálogo."
            : "Each row represents a reference usable by the catalog."
        }
        rows={sources}
        columns={[
          {
            key: "product",
            header: language === "es" ? "Producto" : "Product",
            render: (row) => {
              const product = products.find((item) => item.id === row.product_id);
              return (
                <div>
                  <strong>{product?.name || `#${row.product_id}`}</strong>
                  <div className="text-muted small">{row.connector_name || row.source_kind}</div>
                </div>
              );
            },
          },
          {
            key: "source",
            header: language === "es" ? "Fuente" : "Source",
            render: (row) => (
              <div>
                <strong>{row.source_label || row.source_url || "—"}</strong>
                <div className="text-muted small">{row.external_reference || row.source_status}</div>
              </div>
            ),
          },
          {
            key: "price",
            header: language === "es" ? "Último precio" : "Latest price",
            render: (row) => formatMoney(row.latest_unit_price, language, row.currency_code),
          },
          {
            key: "seen",
            header: language === "es" ? "Última vista" : "Last seen",
            render: (row) => row.last_seen_at || "—",
          },
        ]}
      />

      <DataTableCard
        title={language === "es" ? "Historial de precios" : "Price history"}
        subtitle={
          language === "es"
            ? "Trazabilidad de precios observados o consolidados."
            : "Traceability of observed or consolidated prices."
        }
        rows={priceHistory}
        columns={[
          {
            key: "product",
            header: language === "es" ? "Producto" : "Product",
            render: (row) => (
              <div>
                <strong>{row.product_name || `#${row.product_id}`}</strong>
                <div className="text-muted small">{row.connector_name || row.price_kind}</div>
              </div>
            ),
          },
          {
            key: "price",
            header: language === "es" ? "Precio" : "Price",
            render: (row) => formatMoney(row.unit_price, language, row.currency_code),
          },
          {
            key: "source",
            header: language === "es" ? "Fuente" : "Source",
            render: (row) => row.source_label || row.source_url || "—",
          },
          {
            key: "captured",
            header: language === "es" ? "Capturado" : "Captured",
            render: (row) => row.captured_at || "—",
          },
        ]}
      />
    </div>
  );
}
