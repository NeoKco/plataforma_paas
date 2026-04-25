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
  getProductCatalogComparisons,
  getProductCatalogConnectors,
  getProductCatalogItems,
  type ProductCatalogComparisonItem,
  type ProductCatalogConnector,
  type ProductCatalogItem,
} from "../services/productsService";

function formatMoney(value: number | null, language: "es" | "en", currencyCode = "CLP") {
  if (value === null) return "—";
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode || "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ProductsComparisonsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [connectors, setConnectors] = useState<ProductCatalogConnector[]>([]);
  const [rows, setRows] = useState<ProductCatalogComparisonItem[]>([]);
  const [productId, setProductId] = useState("");
  const [connectorId, setConnectorId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [productsResponse, connectorsResponse, comparisonsResponse] = await Promise.all([
        getProductCatalogItems(session.accessToken),
        getProductCatalogConnectors(session.accessToken),
        getProductCatalogComparisons(session.accessToken, {
          product_id: productId ? Number(productId) : null,
          connector_id: connectorId ? Number(connectorId) : null,
          limit: 100,
        }),
      ]);
      setProducts(productsResponse.data);
      setConnectors(connectorsResponse.data);
      setRows(comparisonsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken, productId, connectorId]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="reports"
        title={language === "es" ? "Comparación multi-fuente" : "Multi-source comparison"}
        description={
          language === "es"
            ? "Contrasta fuentes activas por producto y recomienda la mejor referencia vigente antes de cotizar o presupuestar."
            : "Compare active sources per product and recommend the best current reference before quoting or budgeting."
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

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la comparación" : "Could not load comparison"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Comparando fuentes..." : "Comparing sources..."} /> : null}

      <PanelCard
        title={language === "es" ? "Filtros de lectura" : "Reading filters"}
        subtitle={
          language === "es"
            ? "Úsalos para revisar un producto puntual o aislar una familia de conectores."
            : "Use them to inspect a specific product or isolate a connector family."
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
        </div>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Productos comparables" : "Comparable products"}
        subtitle={
          language === "es"
            ? "La recomendación prioriza fuentes activas, sincronización sana y mejor precio visible."
            : "The recommendation prioritizes active sources, healthy sync state, and the best visible price."
        }
        rows={rows}
        columns={[
          {
            key: "product",
            header: language === "es" ? "Producto" : "Product",
            render: (row) => (
              <div>
                <strong>{row.product_name}</strong>
                <div className="text-muted small">{row.product_sku || "—"}</div>
              </div>
            ),
          },
          {
            key: "coverage",
            header: language === "es" ? "Cobertura" : "Coverage",
            render: (row) => (
              <div>
                <strong>{row.active_source_count}/{row.source_count}</strong>
                <div className="text-muted small">{language === "es" ? "activas / total" : "active / total"}</div>
              </div>
            ),
          },
          {
            key: "recommended",
            header: language === "es" ? "Mejor referencia" : "Best reference",
            render: (row) => (
              <div>
                <strong>{formatMoney(row.recommended_price, language, row.recommended_currency_code || "CLP")}</strong>
                <div className="text-muted small">{row.recommended_reason || "—"}</div>
              </div>
            ),
          },
          {
            key: "spread",
            header: language === "es" ? "Brecha" : "Spread",
            render: (row) => (
              <div>
                <strong>{formatMoney(row.price_spread, language, row.recommended_currency_code || "CLP")}</strong>
                <div className="text-muted small">
                  {row.price_spread_percent !== null ? `${Math.round(row.price_spread_percent)}%` : "—"}
                </div>
              </div>
            ),
          },
          {
            key: "sources",
            header: language === "es" ? "Fuentes" : "Sources",
            render: (row) => (
              <div className="small">
                {row.sources.slice(0, 3).map((source) => (
                  <div key={source.source_id}>
                    {source.connector_name || source.source_label || `#${source.source_id}`} ·{" "}
                    {formatMoney(source.latest_unit_price, language, source.currency_code)} · {source.sync_status}
                  </div>
                ))}
                {row.sources.length > 3 ? <div className="text-muted">+{row.sources.length - 3}</div> : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
