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

Adjuntos y checklist en fase posterior:

- `GET /tenant/maintenance/work-orders/<id>/attachments`
- `POST /tenant/maintenance/work-orders/<id>/attachments`
- `DELETE /tenant/maintenance/work-orders/<id>/attachments/<attachment_id>`
- `GET /tenant/maintenance/work-orders/<id>/checklist`
- `PUT /tenant/maintenance/work-orders/<id>/checklist`

## Diferencias deseadas frente a la app fuente

- no mover registros a una tabla separada para “historico” como mecanismo principal de cierre
- no depender de `DELETE` para operaciones de negocio frecuentes
- desacoplar mejor la agenda y la orden tecnica
- exponer respuestas mas consistentes para frontend moderno
