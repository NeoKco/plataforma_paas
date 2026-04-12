# SIGUIENTE_PASO

## Prioridad vigente

- promover a `staging` el subcorte de glosa/fecha contable en `Costos y cobro` y validarlo con smoke

## Decisión previa obligatoria

- no hay decisión nueva pendiente; el subcorte ya está implementado en repo

## Próximo paso correcto

- publicar backend + frontend en `staging`
- ejecutar el smoke `tenant-portal-maintenance-finance-defaults.smoke.spec.ts`
- si queda verde, promover a `production`

## Si el escenario principal falla

- si aparece ambigüedad funcional, cerrar primero reglas de negocio antes de tocar código
- si el nuevo llenado fino rompe el puente actual, preservar el contrato ya validado de defaults efectivos y aislar el cambio nuevo detrás de un corte más pequeño
- si surge inconsistencia contable real, revisar primero `transaction_service.py` y la gobernanza de datos antes de automatizar más campos

## Condición de cierre de la próxima iteración

- subcorte de glosa/fecha contable publicado y validado en `staging`
- promoción a `production` ejecutada si `staging` queda verde
