# HISTORIAL_ITERACIONES

## 2026-04-11 - Cierre de etapa Provisioning DLQ broker-only

- objetivo:
  - cerrar formalmente `Provisioning/DLQ broker-only` como frente suficientemente endurecido para esta etapa
- cambios principales:
  - se saca DLQ del foco activo del handoff
  - se mueve la prioridad al siguiente bloque central fuera de DLQ
  - se actualizan estado, roadmap y handoff para evitar que otra sesión siga abriendo slices por inercia
- validaciones:
  - se reutiliza la validación funcional del último corte cerrado:
    - repo build OK
    - repo playwright `--list` OK
    - staging smoke `technical` OK
    - production `skipped_non_broker` coherente
- bloqueos:
  - sin bloqueo técnico
  - el motivo del cierre es de priorización: seguir profundizando DLQ ya entra en rendimiento decreciente
- siguiente paso:
  - volver al siguiente bloque central del roadmap fuera de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ technical diagnosis validado

- objetivo:
  - cerrar el slice broker-only `Diagnóstico DLQ / BD visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora clasifica el subconjunto visible entre `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - la UI resume filas visibles, tenants afectados y código dominante por capa técnica
  - la consola expone la acción `Enfocar código dominante`
  - se agrega [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target technical`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos dos detalles reales: `tone` tipado como string genérico y un seed E2E que no garantizaba una capa dominante estable
- siguiente paso:
  - decidir si el próximo corte de `Provisioning/DLQ` será una matriz visible `tenant + capa técnica` o si conviene cerrar pronto este frente y pasar al siguiente bloque del roadmap central

## 2026-04-11 - Provisioning DLQ tenant focus validado

- objetivo:
  - cerrar el slice broker-only `Prioridad por tenant visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora resume tenants visibles por filas, familias y tipos de job
  - la UI recomienda cuándo conviene aislar un tenant visible antes de operar familias
  - se agrega [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target tenant-focus`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - apareció una nulabilidad TypeScript en el render del tenant activo y quedó corregida antes del publish
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ family recommendation validado

- objetivo:
  - cerrar el slice broker-only `Plan operativo sugerido` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora recomienda operativamente cuándo conviene `focus single`, `requeue family`, `family-batch` o limpiar selección
  - se agrega [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target family-recommendation`
  - el smoke se endurece para no exceder el límite real `varchar(100)` de `provisioning_jobs.error_code`
  - el release de `staging` vuelve a quedar alineado con `API_BASE_URL=http://192.168.7.42:8081` después de detectar un publish incorrecto hacia `8100`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos un bug de seed E2E por longitud de `error_code` y un publish erróneo de `staging`
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

## 2026-04-10 - Hotfix visual catálogo Tenants

- objetivo:
  - corregir el overflow visual del catálogo izquierdo en `platform-admin > Tenants`
- cambios principales:
  - [platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css) ahora fuerza contención del grid, `min-width: 0`, ancho máximo del item y wrap seguro para títulos/metadatos largos
  - el catálogo ya no se sale del cuadro central cuando aparecen tenants con slugs extensos
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - `production`: frontend publicado con la corrección
  - `staging`: frontend publicado con la corrección
- bloqueos:
  - sin bloqueo adicional; era un bug visual de layout
- siguiente paso:
  - seguir con el roadmap central sobre `Provisioning/DLQ`
