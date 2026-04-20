# Slice Spec - Tenant Operational Posture

## 1. Identificación

- frente o módulo: `platform-core`
- nombre corto del slice: postura operativa tenant en `Tenants`
- fecha: 2026-04-20
- responsable: Codex
- ambiente objetivo: `repo` primero; promoción posterior a `staging` y `production`

## 2. Problema real

- qué problema se quiere resolver:
  `Tenants` ya mostraba política de acceso, provisioning, esquema y credenciales, pero en bloques separados. Faltaba una lectura corta que diferenciara rápido entre bloqueo esperado, provisioning incompleto, drift de schema y drift de credenciales técnicas.
- cómo se reproduce hoy:
  al entrar a un tenant con incidencia o con drift, el operador debe interpretar varios paneles antes de decidir si el problema es lifecycle/billing, runtime tenant-local o falta de convergencia.
- impacto operativo:
  aumenta la probabilidad de reabrir slices funcionales ya cerrados o de tratar como bug de módulo lo que en realidad es drift técnico tenant-local.
- riesgo si no se resuelve:
  más diagnósticos lentos, más ruido entre `repo`, `runtime` y tenant, y menos trazabilidad de la causa dominante desde la consola central.

## 3. Alcance

### Entra

- síntesis visual en `platform_admin > Tenants`
- clasificación rápida de postura tenant
- recomendación de siguiente acción operativa
- reutilización de señales existentes: lifecycle/billing, provisioning, schema y credenciales

### No entra

- cambio de contratos backend
- nuevos jobs de convergencia
- nueva persistencia de auditoría
- cambios en `staging` o `production`

## 4. Ownership y dominios afectados

- dominio dueño principal: `platform-core`
- dominios consumidores: `platform_admin`, runbook de incidentes tenant
- entidades / tablas afectadas: ninguna nueva; solo lectura de estado ya existente
- referencia a [Matriz de Ownership de Datos](../../architecture/data-ownership-matrix.md):
  `platform-core` es dueño de tenants, credenciales DB tenant, metadata técnica y política de acceso

## 5. Reglas de negocio

- estados:
  la postura debe distinguir al menos:
  - sano
  - bloqueado por política efectiva
  - provisioning pendiente/en curso/fallido
  - schema desalineado
  - drift de credenciales técnicas
- validaciones:
  no inventar señales nuevas si ya existen en la API o en el estado frontend cargado
- precedencias:
  - primero bloqueo efectivo por lifecycle/billing/maintenance
  - luego credenciales técnicas
  - luego provisioning/DB incompleta
  - luego schema drift
- restricciones:
  el bloque nuevo no reemplaza los paneles detallados existentes
- reglas multi-tenant:
  la lectura es por tenant seleccionado, no una auditoría masiva del ambiente

## 6. Contrato técnico

### Backend

- routers: sin cambios
- services: sin cambios
- repositories: sin cambios
- migraciones: no aplica
- scripts auxiliares: no aplica

### Frontend

- páginas:
  - `frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx`
- componentes:
  - reutiliza `PanelCard`, `AppBadge`, `StatusBadge`, `DetailField`
- servicios:
  - reutiliza lecturas existentes de tenant detail, access policy, schema status, module usage y provisioning
- navegación:
  - sin rutas nuevas

### Integraciones

- módulo origen: `platform-core`
- módulo destino: `platform_admin`
- momento del sync:
  al cargar el workspace del tenant seleccionado
- side effects:
  ninguno; solo lectura y síntesis UI

## 7. Datos, defaults y seeds

- defaults afectados: ninguno
- seeds o backfills requeridos: ninguno
- compatibilidad con tenants existentes: total; consume señales ya existentes
- estrategia de convergencia: no aplica mientras el cambio siga solo en repo

## 8. UX esperada

- flujo principal:
  seleccionar un tenant y obtener una lectura corta de su postura operativa
- estados vacíos:
  si no hay suficiente señal, mostrar postura neutral `en revisión`
- errores visibles:
  el bloque no oculta errores; los paneles existentes siguen mostrando detalle fino
- modales / tablas / formularios afectados:
  agrega acciones rápidas reutilizando confirmaciones ya existentes:
  - abrir provisioning
  - ejecutar/reintentar job
  - reprovisionar
  - sincronizar esquema
  - rotar credenciales técnicas

## 9. Evidencia mínima de cierre

### Tests

- backend: no aplica
- frontend build: pendiente al cerrar iteración de repo
- E2E / smoke: opcional si luego se promueve a runtime

### Runtime

- deploy staging: pendiente
- deploy production: pendiente
- convergencia tenant: pendiente
- auditoría final: pendiente

## 10. Documentación a actualizar

- `docs/modules/platform-core/CHANGELOG.md`
- `docs/modules/platform-core/USER_GUIDE.md`
- `docs/modules/platform-core/DEV_GUIDE.md`
- este spec del slice

## 11. Criterio de salida

El slice solo puede declararse cerrado si:

- la consola distingue correctamente postura sana vs drift técnico vs bloqueo esperado
- el frontend build queda en verde
- si luego se promueve, `staging` y `production` mantienen convergencia y auditoría explícitas
- la documentación viva de módulo queda alineada

## 12. Resultado final

- qué se hizo:
  pendiente
- qué se validó:
  pendiente
- qué quedó fuera:
  deploy, convergencia y auditoría runtime
- qué riesgos residuales quedan:
  mientras siga solo en repo, la consola publicada todavía no reflejará este resumen
- cuál es el siguiente paso correcto:
  validar build, luego decidir promoción por ambiente con convergencia completa
