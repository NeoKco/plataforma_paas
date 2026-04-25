from dataclasses import dataclass


@dataclass(frozen=True)
class ProductsModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


PRODUCTS_MODULE = ProductsModuleDefinition(
    key="products",
    name="Catálogo de productos",
    route_prefix="/tenant/products",
    tenant_portal_base_path="/tenant-portal/products",
    description=(
        "Módulo tenant para catálogo técnico-comercial de productos, ingesta "
        "asistida, scraping y actualización de referencias reutilizables."
    ),
)
