# Plantilla Frontend de Plataforma

Este documento define el plano de la plantilla propia para el frontend de `platform_paas`.

No es una maqueta visual final. Es un plano tecnico y de producto para que el frontend de `platform` arranque con una base consistente en vez de crecer pantalla por pantalla sin estructura.

## Objetivo

La plantilla debe servir para:

- operar la plataforma sin `curl`
- reflejar correctamente estados reales del backend
- reutilizar componentes en pantallas administrativas
- evitar hardcodear reglas, estados o cuotas

## Direccion visual

La interfaz de `platform` debe sentirse como una consola de operacion, no como una landing ni como un dashboard SaaS generico.

Direccion recomendada:

- clara
- sobria
- tecnica
- orientada a tablas, estados y acciones operativas
- con jerarquia visual fuerte para alertas, lifecycle y billing

## Bootstrap: como usarlo correctamente

Bootstrap se usara como base estructural, no como identidad visual final.

### Bootstrap SI para:

- grid
- containers
- spacing
- formularios
- tablas
- modals
- offcanvas
- dropdowns
- feedback base
- responsive

### Bootstrap NO como:

- paleta final
- tipografia final
- sistema de estados final
- componentes crudos repetidos sin wrapper

La regla es:

- Bootstrap resuelve infraestructura visual
- la plantilla propia resuelve identidad y semantica

## Capa propia encima de Bootstrap

La plantilla debe envolver Bootstrap con:

- variables CSS propias
- componentes wrapper reutilizables
- convenciones de estados y badges
- layouts de plataforma

## Tokens visuales minimos

### Colores semanticos

Definir al menos:

- `--color-bg-app`
- `--color-bg-surface`
- `--color-bg-elevated`
- `--color-border-subtle`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-primary`
- `--color-info`
- `--color-success`
- `--color-warning`
- `--color-danger`

### Colores por estado real del backend

La plantilla debe traer tonos estables para:

- tenant `active`
- tenant `pending`
- tenant `suspended`
- tenant `error`
- tenant `archived`
- billing `trialing`
- billing `active`
- billing `past_due`
- billing `suspended`
- billing `canceled`
- provisioning `pending`
- provisioning `retry_pending`
- provisioning `running`
- provisioning `completed`
- provisioning `failed`

### Otros tokens

- radios
- sombras
- alturas de topbar
- anchos de sidebar
- espaciado de cards
- densidad de tabla

## Tipografia

No usar Bootstrap puro como look final.

Recomendacion:

- una familia sans clara para UI
- pesos suficientes para jerarquia tecnica
- labels compactos
- tablas con buena legibilidad
- numericos con alineacion estable

## Layout base

La plantilla de `platform_admin` debe partir con este shell:

### 1. `AppShell`

Responsable de:

- sidebar fija en desktop
- topbar
- area principal scrollable
- zonas de feedback global

### 2. `SidebarNav`

Secciones recomendadas:

- `Dashboard`
- `Tenants`
- `Provisioning`
- `Billing`
- `Observability`
- `Settings`

### 3. `Topbar`

Debe traer:

- titulo contextual
- breadcrumbs si hace falta
- estado de sesion
- acciones rapidas

## Componentes base obligatorios

Antes de abrir muchas pantallas, la plantilla deberia traer estos componentes:

### Layout y estructura

- `AppShell`
- `SidebarNav`
- `Topbar`
- `PageHeader`
- `PageSection`
- `PanelCard`

### Feedback y estados

- `StatusBadge`
- `AlertStack`
- `InlineNotice`
- `EmptyState`
- `ErrorState`
- `LoadingBlock`

### Datos operativos

- `MetricCard`
- `DataTableCard`
- `FilterToolbar`
- `KeyValueGrid`
- `TimelineCard`
- `UsageLimitTable`
- `JsonPreviewDrawer`

### Formularios

- `FormCard`
- `ActionModal`
- `ConfirmActionModal`

## Pantallas que la plantilla debe soportar desde el inicio

### 1. Login

Debe soportar:

- formulario limpio
- estados de error auth
- CTA claro

### 2. Dashboard Platform

Debe soportar:

- KPIs
- alertas activas
- accesos rapidos
- resumen general

### 3. Tenants List

Debe soportar:

- tabla filtrable
- badges de `status`
- badges de billing
- acceso al detalle

### 4. Tenant Detail

Debe soportar secciones o tabs para:

- `Resumen`
- `Access Policy`
- `Limits & Usage`
- `Billing`
- `Policy History`

### 5. Provisioning

Debe soportar:

- jobs
- metricas
- alerts
- DLQ

### 6. Billing

Debe soportar:

- events
- summary
- alerts
- reconcile

## Integracion obligatoria con backend

La plantilla no debe inferir reglas principales por su cuenta.

Debe consumir desde temprano:

- `POST /platform/auth/login`
- `POST /platform/auth/refresh`
- `POST /platform/auth/logout`
- `GET /platform/capabilities`

Especialmente, `GET /platform/capabilities` debe alimentar:

- labels y agrupaciones de cuotas
- estados validos
- scopes de mantenimiento
- modos de mantenimiento
- badges y filtros de UI

## Estructura sugerida de carpetas frontend

Como hoy `frontend/src` esta vacio, el arranque recomendado es este:

```text
frontend/src/
├── apps/
│   └── platform_admin/
│       ├── layout/
│       │   ├── AppShell.tsx
│       │   ├── SidebarNav.tsx
│       │   └── Topbar.tsx
│       ├── pages/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── tenants/
│       │   ├── provisioning/
│       │   ├── billing/
│       │   └── settings/
│       └── routes/
├── components/
│   ├── common/
│   ├── feedback/
│   ├── forms/
│   ├── layout/
│   └── data-display/
├── services/
├── store/
├── styles/
│   ├── tokens.css
│   ├── bootstrap-overrides.css
│   └── platform-admin.css
└── utils/
```

## Convenciones visuales recomendadas

### Tablas

- densidad media
- headers pegados en vistas largas
- filtros arriba, no dispersos
- badges y acciones al extremo derecho

### Cards

- pocas variantes
- mucha consistencia
- prioridad al contenido, no a decoracion excesiva

### Estados

- mismo badge para el mismo estado en toda la app
- nada de redefinir colores por pantalla

### Acciones peligrosas

- siempre con confirmacion
- claramente separadas de acciones normales

## Que NO debe hacer la plantilla

- no debe depender de colores Bootstrap por defecto como identidad final
- no debe crear un componente distinto para cada pantalla sin abstraer patrones repetidos
- no debe meter logica de negocio que ya vive en backend
- no debe asumir claves de cuota o estados no descubiertos por API

## Entregable minimo de esta plantilla

Antes de abrir muchas pantallas, la plantilla deberia dejar listos:

1. `AppShell`
2. login
3. sesion y rutas protegidas
4. `StatusBadge`
5. `PanelCard`
6. `DataTableCard`
7. `PageHeader`
8. integracion con `GET /platform/capabilities`

## Resumen ejecutivo

La plantilla recomendada para `platform_paas` es:

- Bootstrap 5 como base estructural
- una capa propia de layout, estados y componentes
- foco en operacion administrativa
- consumo directo de capacidades backend

Eso permite avanzar rapido sin quedar atrapados en un frontend generico o inconsistente.
