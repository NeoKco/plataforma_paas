import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import {
  createProductCatalogItem,
  deleteProductCatalogImage,
  deleteProductCatalogItem,
  downloadProductCatalogImage,
  getProductCatalogImagePreview,
  getProductCatalogItems,
  setPrimaryProductCatalogImage,
  uploadProductCatalogImage,
  updateProductCatalogItem,
  updateProductCatalogItemStatus,
  type ProductCatalogItem,
  type ProductCatalogProductCharacteristic,
  type ProductCatalogWriteRequest,
} from "../../products/services/productsService";
import { ProductsModuleNav } from "../../products/components/common/ProductsModuleNav";

function buildDefaultCharacteristic(index: number): ProductCatalogProductCharacteristic {
  return {
    id: null,
    label: "",
    value: "",
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultForm(): ProductCatalogWriteRequest {
  return {
    sku: null,
    name: "",
    product_type: "service",
    unit_label: null,
    unit_price: 0,
    description: null,
    is_active: true,
    sort_order: 100,
    characteristics: [buildDefaultCharacteristic(0)],
  };
}

function buildFormFromItem(item: ProductCatalogItem): ProductCatalogWriteRequest {
  return {
    sku: item.sku,
    name: item.name,
    product_type: item.product_type,
    unit_label: item.unit_label,
    unit_price: item.unit_price,
    description: item.description,
    is_active: item.is_active,
    sort_order: item.sort_order,
    characteristics:
      item.characteristics.length > 0
        ? item.characteristics.map((characteristic) => ({
            id: characteristic.id,
            label: characteristic.label,
            value: characteristic.value,
            sort_order: characteristic.sort_order,
          }))
        : [buildDefaultCharacteristic(0)],
  };
}

export function CRMProductsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<ProductCatalogItem[]>([]);
  const [form, setForm] = useState<ProductCatalogWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const [quickViewItem, setQuickViewItem] = useState<ProductCatalogItem | null>(null);

  const currentEditingItem =
    editingId != null ? rows.find((item) => item.id === editingId) ?? null : null;

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductCatalogItems(session.accessToken);
      setRows(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    setFeedback(null);
    setImageFile(null);
    setImageCaption("");
  }

  function startEdit(item: ProductCatalogItem) {
    setEditingId(item.id);
    setForm(buildFormFromItem(item));
    setFeedback(null);
  }

  useEffect(() => {
    if (!session?.accessToken || !currentEditingItem) {
      setImagePreviewUrls((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }
    let cancelled = false;
    const createdUrls: string[] = [];
    const accessToken = session.accessToken;
    const editingItem = currentEditingItem;

    async function loadPreviews() {
      const entries = await Promise.all(
        editingItem.images.map(async (image) => {
          try {
            const result = await downloadProductCatalogImage(
              accessToken,
              editingItem.id,
              image.id
            );
            const previewUrl = URL.createObjectURL(result.blob);
            createdUrls.push(previewUrl);
            return [image.id, previewUrl] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setImagePreviewUrls((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url));
        return Object.fromEntries(entries.filter(Boolean) as Array<readonly [number, string]>);
      });
    }

    void loadPreviews();
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [
    session?.accessToken,
    currentEditingItem?.id,
    currentEditingItem?.images.map((image) => image.id).join(":"),
  ]);

  function updateCharacteristic(index: number, next: Partial<ProductCatalogProductCharacteristic>) {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item
      ),
    }));
  }

  function addCharacteristic() {
    setForm((current) => ({
      ...current,
      characteristics: [...current.characteristics, buildDefaultCharacteristic(current.characteristics.length)],
    }));
  }

  function removeCharacteristic(index: number) {
    setForm((current) => ({
      ...current,
      characteristics:
        current.characteristics.length === 1
          ? [buildDefaultCharacteristic(0)]
          : current.characteristics.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        characteristics: form.characteristics.filter(
          (item) => item.label.trim() && item.value.trim()
        ),
      };
      const response = editingId
        ? await updateProductCatalogItem(session.accessToken, editingId, payload)
        : await createProductCatalogItem(session.accessToken, payload);
      setFeedback(response.message);
      await loadRows();
      if (editingId) {
        startNew();
      } else {
        setEditingId(response.data.id);
        setForm(buildFormFromItem(response.data));
        setImageFile(null);
        setImageCaption("");
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: ProductCatalogItem) {
    if (!session?.accessToken) return;
    try {
      const response = await updateProductCatalogItemStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: ProductCatalogItem) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${item.name}"?` : `Delete "${item.name}"?`)) return;
    try {
      const response = await deleteProductCatalogItem(session.accessToken, item.id);
      setFeedback(response.message);
      if (editingId === item.id) {
        startNew();
      }
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleUploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || editingId == null || !imageFile) return;
    setIsUploadingImage(true);
    setError(null);
    setFeedback(null);
    try {
      const preparedFile = await prepareProductCatalogImageFile(imageFile);
      const response = await uploadProductCatalogImage(
        session.accessToken,
        editingId,
        preparedFile,
        imageCaption || null,
        !currentEditingItem || currentEditingItem.images.length === 0
      );
      setFeedback(response.message);
      setImageFile(null);
      setImageCaption("");
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!session?.accessToken || editingId == null) return;
    if (!window.confirm(language === "es" ? "¿Eliminar la foto del catálogo?" : "Delete catalog photo?")) {
      return;
    }
    try {
      const response = await deleteProductCatalogImage(session.accessToken, editingId, imageId);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleSetPrimaryImage(imageId: number) {
    if (!session?.accessToken || editingId == null) return;
    try {
      const response = await setPrimaryProductCatalogImage(session.accessToken, editingId, imageId);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="products"
        title={language === "es" ? "Productos y servicios" : "Products and services"}
        description={
          language === "es"
            ? "Catálogo técnico-comercial reutilizable para cotizaciones, proyectos y futuras automatizaciones."
            : "Reusable technical-commercial catalog for quotes, projects, and future automations."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nuevo producto" : "New product"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar productos" : "Could not load products"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando catálogo..." : "Loading catalog..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar producto" : "Edit product") : (language === "es" ? "Nuevo producto" : "New product")}
        subtitle={
          language === "es"
            ? "Mantén atributos técnicos y comerciales que luego podrán reutilizarse en cotizaciones y proyectos."
            : "Keep technical and commercial attributes that can later be reused in quotes and projects."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Nombre" : "Name"}</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label>
            <span>SKU</span>
            <input value={form.sku || ""} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Tipo" : "Type"}</span>
            <select value={form.product_type} onChange={(event) => setForm((current) => ({ ...current, product_type: event.target.value }))}>
              <option value="service">{language === "es" ? "Servicio" : "Service"}</option>
              <option value="product">{language === "es" ? "Producto" : "Product"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Unidad" : "Unit"}</span>
            <input value={form.unit_label || ""} onChange={(event) => setForm((current) => ({ ...current, unit_label: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Precio base" : "Base price"}</span>
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: Number(event.target.value) || 0 }))} />
          </label>
          <label>
            <span>{language === "es" ? "Orden" : "Order"}</span>
            <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Descripción" : "Description"}</span>
            <textarea value={form.description || ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} rows={3} />
          </label>

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <div>
                <strong>{language === "es" ? "Características" : "Characteristics"}</strong>
                <div className="text-muted small">
                  {language === "es"
                    ? "Especificaciones breves para diferenciar el producto o servicio."
                    : "Short specs to differentiate the product or service."}
                </div>
              </div>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={addCharacteristic}>
                {language === "es" ? "Agregar característica" : "Add characteristic"}
              </button>
            </div>
            <div className="crm-lines-list">
              {form.characteristics.map((characteristic, index) => (
                <div key={`${editingId || "new"}-characteristic-${index}`} className="crm-line-card">
                  <div className="crm-line-grid">
                    <label>
                      <span>{language === "es" ? "Etiqueta" : "Label"}</span>
                      <input value={characteristic.label} onChange={(event) => updateCharacteristic(index, { label: event.target.value })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Valor" : "Value"}</span>
                      <input value={characteristic.value} onChange={(event) => updateCharacteristic(index, { value: event.target.value })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Orden" : "Order"}</span>
                      <input type="number" min="0" value={characteristic.sort_order} onChange={(event) => updateCharacteristic(index, { sort_order: Number(event.target.value) || 0 })} />
                    </label>
                  </div>
                  <div className="crm-line-card__footer">
                    <span className="text-muted small">
                      {language === "es"
                        ? "Se muestra en catálogo y puede reaprovecharse en propuestas."
                        : "Shown in catalog and reusable in proposals."}
                    </span>
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removeCharacteristic(index)}>
                      {language === "es" ? "Quitar" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="crm-inline-check">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>{language === "es" ? "Activo" : "Active"}</span>
          </label>
          <div className="crm-form-actions">
            {editingId ? (
              <button className="btn btn-outline-secondary" type="button" onClick={startNew}>
                {language === "es" ? "Cancelar edición" : "Cancel edit"}
              </button>
            ) : null}
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {editingId
                ? language === "es"
                  ? "Guardar cambios"
                  : "Save changes"
                : language === "es"
                  ? "Crear producto"
                  : "Create product"}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <div className="crm-lines-header">
            <div>
              <strong>{language === "es" ? "Fotos del catálogo" : "Catalog photos"}</strong>
              <div className="text-muted small">
                {editingId
                  ? language === "es"
                    ? "Sube imágenes comprimidas en WEBP, JPEG o PNG. La primera queda como principal y podrás cambiarla después."
                    : "Upload compressed WEBP, JPEG, or PNG images. The first one becomes primary and you can change it later."
                  : language === "es"
                    ? "Guarda primero el producto o servicio para poder cargar su galería."
                    : "Save the product or service first before uploading its gallery."}
              </div>
            </div>
          </div>

          {editingId ? (
            <>
              <form className="crm-form-grid mt-3" onSubmit={(event) => void handleUploadImage(event)}>
                <label className="crm-form-grid__full">
                  <span>{language === "es" ? "Foto" : "Photo"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  />
                </label>
                <label className="crm-form-grid__full">
                  <span>{language === "es" ? "Pie de foto" : "Caption"}</span>
                  <input
                    value={imageCaption}
                    onChange={(event) => setImageCaption(event.target.value)}
                    placeholder={language === "es" ? "Opcional" : "Optional"}
                  />
                </label>
                <div className="crm-form-actions">
                  <button className="btn btn-primary" disabled={!imageFile || isUploadingImage} type="submit">
                    {language === "es" ? "Subir foto" : "Upload photo"}
                  </button>
                </div>
              </form>

              {currentEditingItem?.images.length ? (
                <div className="d-grid gap-3 mt-3">
                  {currentEditingItem.images.map((image) => (
                    <div key={image.id} className="crm-line-card">
                      <div className="d-flex gap-3 align-items-start flex-wrap">
                        {imagePreviewUrls[image.id] ? (
                          <img
                            src={imagePreviewUrls[image.id]}
                            alt={image.caption || image.file_name}
                            style={{
                              width: "140px",
                              height: "140px",
                              objectFit: "cover",
                              borderRadius: "12px",
                              border: "1px solid rgba(15, 23, 42, 0.12)",
                            }}
                          />
                        ) : (
                          <div
                            className="border rounded d-flex align-items-center justify-content-center text-muted"
                            style={{ width: "140px", height: "140px" }}
                          >
                            {language === "es" ? "Sin preview" : "No preview"}
                          </div>
                        )}
                        <div className="d-grid gap-2 flex-grow-1">
                          <div>
                            <strong>{image.file_name}</strong>
                            <div className="text-muted small">
                              {image.is_primary
                                ? language === "es"
                                  ? "Foto principal"
                                  : "Primary photo"
                                : language === "es"
                                  ? "Foto secundaria"
                                  : "Secondary photo"}
                            </div>
                            {image.caption ? <div className="small mt-1">{image.caption}</div> : null}
                          </div>
                          <div className="d-flex gap-2 flex-wrap">
                            {!image.is_primary ? (
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                type="button"
                                onClick={() => void handleSetPrimaryImage(image.id)}
                              >
                                {language === "es" ? "Usar como principal" : "Set as primary"}
                              </button>
                            ) : null}
                            <button
                              className="btn btn-outline-danger btn-sm"
                              type="button"
                              onClick={() => void handleDeleteImage(image.id)}
                            >
                              {language === "es" ? "Eliminar foto" : "Delete photo"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted small mt-3">
                  {language === "es"
                    ? "Todavía no hay fotos cargadas para este producto o servicio."
                    : "There are no uploaded photos for this product or service yet."}
                </div>
              )}
            </>
          ) : null}
        </div>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Catálogo activo" : "Active catalog"}
        subtitle={
          language === "es"
            ? "Productos y servicios listos para reutilizarse desde el catálogo central."
            : "Products and services ready to be reused from the central catalog."
        }
        rows={rows}
        columns={[
          {
            key: "name",
            header: language === "es" ? "Nombre" : "Name",
            render: (row) => (
              <div>
                <strong>{row.name}</strong>
                <div className="text-muted small">{row.sku || "—"}</div>
                <div className="text-muted small">
                  {row.images.length > 0
                    ? language === "es"
                      ? `${row.images.length} foto(s)`
                      : `${row.images.length} photo(s)`
                    : language === "es"
                      ? "Sin fotos"
                      : "No photos"}
                </div>
              </div>
            ),
          },
          { key: "type", header: language === "es" ? "Tipo" : "Type", render: (row) => row.product_type },
          { key: "price", header: language === "es" ? "Precio" : "Price", render: (row) => row.unit_price.toLocaleString() },
          {
            key: "characteristics",
            header: language === "es" ? "Características" : "Characteristics",
            render: (row) =>
              row.characteristics.length > 0 || row.images.length > 0 ? (
                <div className="d-flex align-items-start gap-3 flex-wrap">
                  <CatalogRowPreview
                    accessToken={session?.accessToken || null}
                    item={row}
                    language={language}
                    onOpenQuickView={setQuickViewItem}
                  />
                  <div className="crm-chip-list">
                    {row.characteristics.slice(0, 3).map((item) => (
                      <span key={item.id || item.label} className="crm-chip">
                        {item.label}: {item.value}
                      </span>
                    ))}
                    {row.characteristics.length > 3 ? (
                      <span className="crm-chip">+{row.characteristics.length - 3}</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                "—"
              ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (row.is_active ? (language === "es" ? "activo" : "active") : (language === "es" ? "inactivo" : "inactive")),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleToggle(row)}>
                  {row.is_active ? (language === "es" ? "Desactivar" : "Deactivate") : (language === "es" ? "Activar" : "Activate")}
                </button>
                <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDelete(row)}>
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>
            ),
          },
        ]}
      />

      {quickViewItem ? (
        <CatalogQuickViewModal
          accessToken={session?.accessToken || null}
          item={quickViewItem}
          language={language}
          onClose={() => setQuickViewItem(null)}
        />
      ) : null}
    </div>
  );
}

function CatalogRowPreview({
  accessToken,
  item,
  language,
  onOpenQuickView,
}: {
  accessToken: string | null;
  item: ProductCatalogItem;
  language: "es" | "en";
  onOpenQuickView: (item: ProductCatalogItem) => void;
}) {
  const primaryImage = item.images.find((image) => image.is_primary) ?? item.images[0] ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || isVisible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "160px 0px",
        threshold: 0.1,
      }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!accessToken || !primaryImage || !isVisible) {
      setImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const token = accessToken;
    const imageId = primaryImage.id;

    async function loadPreview() {
      try {
        const result = await getProductCatalogImagePreview(token, item.id, imageId);
        objectUrl = result.data_url;
        if (!cancelled) {
          setImageUrl((current) => {
            if (current && current.startsWith("blob:")) {
              URL.revokeObjectURL(current);
            }
            return objectUrl;
          });
        }
      } catch {
        if (!cancelled) {
          setImageUrl((current) => {
            if (current && current.startsWith("blob:")) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
        } else if (objectUrl && objectUrl.startsWith("blob:")) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl && objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, isVisible, item.id, primaryImage?.id]);

  const label = language === "es" ? "Sin foto" : "No photo";
  return (
    <button
      ref={containerRef}
      className="btn btn-link p-0 border-0 text-start"
      type="button"
      onClick={() => onOpenQuickView(item)}
      title={language === "es" ? "Ver ficha rápida" : "Open quick view"}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          width: 72,
          minWidth: 72,
          height: 72,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.2,
              padding: "0 8px",
            }}
          >
            {primaryImage ? "…" : label}
          </span>
        )}
      </div>
    </button>
  );
}

function CatalogQuickViewModal({
  accessToken,
  item,
  language,
  onClose,
}: {
  accessToken: string | null;
  item: ProductCatalogItem;
  language: "es" | "en";
  onClose: () => void;
}) {
  const primaryImage = item.images.find((image) => image.is_primary) ?? item.images[0] ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !primaryImage) {
      setImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const token = accessToken;
    const imageId = primaryImage.id;

    async function loadPreview() {
      try {
        const result = await getProductCatalogImagePreview(token, item.id, imageId);
        objectUrl = result.data_url;
        if (!cancelled) {
          setImageUrl((current) => {
            if (current && current.startsWith("blob:")) {
              URL.revokeObjectURL(current);
            }
            return objectUrl;
          });
        }
      } catch {
        if (!cancelled) {
          setImageUrl((current) => {
            if (current && current.startsWith("blob:")) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
        } else if (objectUrl && objectUrl.startsWith("blob:")) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl && objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, item.id, primaryImage?.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#ffffff",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
          padding: 24,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="text-muted small">
              {language === "es" ? "Vista rápida del catálogo" : "Catalog quick view"}
            </div>
            <h3 className="mb-1" style={{ fontSize: 24 }}>
              {item.name}
            </h3>
            <div className="text-muted small">
              {item.product_type} · {item.unit_price.toLocaleString()} {item.unit_label || ""}
            </div>
          </div>
          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>
            {language === "es" ? "Cerrar" : "Close"}
          </button>
        </div>

        <div className="d-grid gap-4" style={{ gridTemplateColumns: "minmax(260px, 320px) 1fr" }}>
          <div>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <span className="text-muted small">
                  {language === "es" ? "Sin foto disponible" : "No image available"}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex flex-column gap-3">
            {item.description ? (
              <div>
                <strong>{language === "es" ? "Descripción" : "Description"}</strong>
                <div className="small mt-2" style={{ whiteSpace: "pre-wrap" }}>
                  {item.description}
                </div>
              </div>
            ) : null}
            <div>
              <strong>{language === "es" ? "Características" : "Characteristics"}</strong>
              {item.characteristics.length > 0 ? (
                <div className="crm-chip-list mt-2">
                  {item.characteristics.map((characteristic) => (
                    <span key={characteristic.id || characteristic.label} className="crm-chip">
                      {characteristic.label}: {characteristic.value}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-muted small mt-2">—</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function prepareProductCatalogImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  return compressImageFile(file);
}

async function compressImageFile(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
  const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/webp", 0.82);
  });
  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
