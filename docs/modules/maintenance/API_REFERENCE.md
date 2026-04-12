# Maintenance API Reference

Referencia resumida del modulo `maintenance`.

## API fuente auditada en `ieris_app`

Mantenciones:

- `GET /api/mantenciones`
- `GET /api/mantenciones/form-data`
- `POST /api/mantenciones`
- `GET /api/mantenciones/<mantencion_id>`
- `PUT /api/mantenciones/<mantencion_id>`
- `DELETE /api/mantenciones/<mantencion_id>`
- `POST /api/mantenciones/<mantencion_id>/completar`
- `GET /api/mantenciones/cliente/<id_cliente>`
- `GET /api/mantenciones/cliente/<id_cliente>/historicas`

Historico:

- `GET /api/historico-mantenciones`

Instalaciones:

- `GET /api/instalaciones-por-cliente`
- `GET /api/instalaciones-por-cliente/<id_cliente>`
- `GET /api/instalaciones/<id_instalacion>`
- `PUT /api/instalaciones/<id_instalacion>`
- `DELETE /api/instalaciones/<id_instalacion>`
- `POST /api/instalaciones`

Tipos de equipo:

- `GET /api/tipo-equipos`
- `GET /api/tipo-equipos/<id>`
- `POST /api/tipo-equipos`
- `PUT /api/tipo-equipos/<id>`
- `DELETE /api/tipo-equipos/<id>`

Relacion con agenda:

- la fuente usa `calendar_events` y metadata `origin = mantencion`

## API objetivo en PaaS

Catalogos:

- `GET /tenant/maintenance/equipment-types`
- `POST /tenant/maintenance/equipment-types`
- `GET /tenant/maintenance/equipment-types/<id>`
- `PUT /tenant/maintenance/equipment-types/<id>`
- `PATCH /tenant/maintenance/equipment-types/<id>/status`
- `DELETE /tenant/maintenance/equipment-types/<id>`

Instalaciones:

- `GET /tenant/maintenance/installations`
- `POST /tenant/maintenance/installations`
- `GET /tenant/maintenance/installations/<id>`
- `PUT /tenant/maintenance/installations/<id>`
- `PATCH /tenant/maintenance/installations/<id>/status`
- `DELETE /tenant/maintenance/installations/<id>`

Plantillas de costeo de mantención:

- `GET /tenant/maintenance/cost-templates`
- `POST /tenant/maintenance/cost-templates`
- `GET /tenant/maintenance/cost-templates/<id>`
- `PUT /tenant/maintenance/cost-templates/<id>`
- `PATCH /tenant/maintenance/cost-templates/<id>/status`

Notas operativas vigentes:

- la respuesta de `cost-templates` ya incluye `usage_count`
- las programaciones preventivas ahora pueden persistir `cost_template_id` para dejar trazado qué plantilla fue aplicada

Defaults efectivos maintenance -> finance:

- `GET /tenant/maintenance/finance-sync-defaults`

Notas operativas vigentes:

- devuelve el default efectivo de moneda, cuenta y categoría para ingreso/egreso
- prioriza política tenant activa y, si falta contexto, cae a heurísticas seguras del backend:
  - moneda base / `CLP`
  - categorías de mantención
  - cuenta favorita o única compatible por moneda
- este endpoint existe para que `Resumen técnico` y `Costos y cobro` consuman la misma fuente de verdad y no inventen defaults distintos en frontend

Sincronización manual maintenance -> finance:

- `POST /tenant/maintenance/work-orders/<id>/finance-sync`

Campos relevantes del request:

- `transaction_at` opcional para ajustar la fecha contable (si no se envía, se usa `completed_at` o `now()`)
- `income_description` y `expense_description` opcionales para controlar la glosa que llega a Finanzas
- `notes` mantiene la observación operativa asociada al cierre económico

Ordenes de trabajo:

- `GET /tenant/maintenance/work-orders`
- `POST /tenant/maintenance/work-orders`
- `GET /tenant/maintenance/work-orders/<id>`
- `PUT /tenant/maintenance/work-orders/<id>`
- `PATCH /tenant/maintenance/work-orders/<id>/status`
- `DELETE /tenant/maintenance/work-orders/<id>`

Visitas:

- `GET /tenant/maintenance/visits`
- `POST /tenant/maintenance/visits`
- `GET /tenant/maintenance/visits/<id>`
- `PUT /tenant/maintenance/visits/<id>`
- `DELETE /tenant/maintenance/visits/<id>`

Historial:

- `GET /tenant/maintenance/history`
- `GET /tenant/maintenance/history/by-client/<client_id>`
- `GET /tenant/maintenance/work-orders/<id>/status-logs`
- `GET /tenant/maintenance/work-orders/<id>/visits`

Checklist y evidencias:

- `GET /tenant/maintenance/work-orders/<id>/field-report`
- `PUT /tenant/maintenance/work-orders/<id>/field-report`
- `POST /tenant/maintenance/work-orders/<id>/evidences`
- `DELETE /tenant/maintenance/work-orders/<id>/evidences/<evidence_id>`
- `GET /tenant/maintenance/work-orders/<id>/evidences/<evidence_id>/download`

Notas operativas vigentes:

- `field-report` devuelve `closure_notes`, `checklist_items` y `evidences` en una sola lectura técnica
- `evidences` acepta PDF e imágenes (`png`, `jpeg`, `webp`) con storage real del módulo
- `Historial` consume el mismo contrato, pero congelado en modo solo lectura

## Diferencias deseadas frente a la app fuente

- no mover registros a una tabla separada para “historico” como mecanismo principal de cierre
- no depender de `DELETE` para operaciones de negocio frecuentes
- desacoplar mejor la agenda y la orden tecnica
- exponer respuestas mas consistentes para frontend moderno
