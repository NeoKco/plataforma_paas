# Products Changelog

## 2026-04-24

- se abre `products` como módulo tenant independiente para catálogo técnico-comercial
- se publican rutas propias `/tenant/products/*`
- se publica frontend propio con:
  - `Resumen`
  - `Catálogo`
  - `Ingesta`
- `crm` deja de ser dueño público del catálogo y pasa a consumir `products`
- el módulo ya soporta:
  - catálogo reusable
  - extracción por URL
  - corridas batch
  - revisión y aprobación previa a publicación

