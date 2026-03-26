# finance_codex_prompt_maestro.md

# Prompt maestro para Codex
## Construcción del módulo `finance` tipo Alzex para `platform_paas`

Quiero que construyas el módulo `finance` de mi plataforma `platform_paas`, replicando de forma lo más completa posible las capacidades funcionales de una app tipo **Alzex Finance Pro**, pero respetando estrictamente la arquitectura real actual de mi proyecto.

Debes trabajar usando como base obligatoria estos dos documentos:

1. `roadmap_modulo_finance_alzex_codex_detallado.md`
2. `finance_codex_tareas_ejecucion.md`

No los contradigas. Úsalos como fuente principal de ejecución.

---

# 1. Contexto del proyecto que debes respetar

Este proyecto **ya existe** y no quiero que inventes una estructura nueva.

## Backend
- Python
- FastAPI
- arquitectura modular
- patrón preferido: `router -> service -> repository`
- base de datos PostgreSQL
- una DB de control global y una DB independiente por tenant
- el módulo `finance` debe vivir dentro de tenant modules

## Frontend
- React
- estructura modular existente
- el módulo debe integrarse al `tenant_portal`

## Arquitectura actual a respetar
Usa estrictamente la estructura actual del proyecto:

```text
backend/app/apps/{installer,platform_control,provisioning,tenant_modules}
backend/app/common
backend/app/bootstrap
frontend/src/apps
```

No inventes otra estructura paralela.

---

# 2. Objetivo funcional del módulo

Quiero un módulo `finance` que replique, en versión web multi-tenant, las capacidades que analizamos de Alzex Finance Pro, incluyendo como mínimo:

- dashboard financiero
- cuentas
- transacciones
- categorías jerárquicas
- beneficiarios
- miembros/personas
- proyectos
- etiquetas
- préstamos
- presupuestos
- plantillas
- planificador/recurrentes
- conciliación
- reportes
- profit & loss
- calendario financiero
- monedas y tipos de cambio
- filtros guardados
- actividad/auditoría
- importación y exportación
- configuración del módulo
- adjuntos en transacciones

La meta es que el módulo quede **muy cercano funcionalmente a Alzex**, pero diseñado correctamente para crecer dentro de un ERP/PaaS multi-tenant.

---

# 3. Regla principal de implementación

No quiero una solución improvisada ni monolítica.

## Debes:
- respetar la arquitectura existente
- trabajar por lotes
- dejar código modular
- dejar pruebas mínimas
- dejar documentación completa
- no romper lo ya existente
- no mover carpetas existentes sin necesidad
- no mezclar lógica de negocio en routers
- no dejar endpoints sin validación
- no dejar migraciones sin documentación

## No debes:
- reestructurar el proyecto completo
- inventar patrones incompatibles con lo existente
- meter lógica crítica en frontend
- duplicar modelos si ya hay convenciones reutilizables
- crear código “temporal” sin marcarlo explícitamente

---

# 4. Orden obligatorio de ejecución

Debes trabajar en este orden exacto:

1. Lote 0 — Preparación
2. Lote 1 — Migraciones base
3. Lote 2 — Schemas y modelos base
4. Lote 3 — API de catálogos
5. Lote 4 — Frontend de catálogos
6. Lote 5 — Tabla de transacciones y relaciones
7. Lote 6 — Servicio de transacciones
8. Lote 7 — API y frontend de transacciones
9. Lote 8 — Adjuntos
10. Lote 9 — Plantillas y favoritos
11. Lote 10 — Planificador / recurrentes
12. Lote 11 — Préstamos
13. Lote 12 — Presupuestos
14. Lote 13 — Reconciliación
15. Lote 14 — Filtros guardados
16. Lote 15 — Dashboard y reportes
17. Lote 16 — Permisos finos
18. Lote 17 — Auditoría
19. Lote 18 — Importación y exportación
20. Lote 19 — Settings del módulo
21. Lote 20 — Documentación obligatoria
22. Lote 21 — Pruebas finales y endurecimiento

No saltes lotes. No cierres un lote a medias.

---

# 5. Estructura de carpetas que debes usar

Usa la estructura exacta definida en `finance_codex_tareas_ejecucion.md`.

## Backend esperado
Dentro de:

```text
backend/app/apps/tenant_modules/finance/
```

debes crear y usar las carpetas:
- `api/`
- `schemas/`
- `models/`
- `repositories/`
- `services/`
- `policies/`
- `utils/`
- `docs/`
- `tests/`

## Frontend esperado
Dentro de:

```text
frontend/src/apps/tenant_portal/modules/finance/
```

debes crear y usar las carpetas:
- `services/`
- `hooks/`
- `components/`
- `pages/`
- `forms/`
- `utils/`
- `styles/`
- `docs/`

---

# 6. Base de datos del módulo

Debes implementar la base de datos del módulo con las tablas objetivo definidas en los documentos base.

## Tablas mínimas esperadas

```text
finance_accounts
finance_categories
finance_beneficiaries
finance_people
finance_projects
finance_tags
finance_currencies
finance_exchange_rates
finance_transactions
finance_transaction_tags
finance_transaction_attachments
finance_transaction_templates
finance_schedules
finance_schedule_runs
finance_loans
finance_loan_payments
finance_budgets
finance_budget_lines
finance_budget_periods
finance_reconciliations
finance_reconciliation_lines
finance_saved_filters
finance_activity_logs
finance_settings
```

## Reglas de BD
- usar convenciones del proyecto
- PostgreSQL
- tenant DB
- integridad referencial
- índices donde corresponda
- unicidad por tenant donde aplique
- seeds idempotentes
- migraciones ordenadas
- documentación de cada tabla y relación

---

# 7. Reglas funcionales importantes

## Transacciones
Debes soportar:
- gasto
- ingreso
- transferencia

Cada transacción debe poder asociarse a:
- cuenta
- categoría
- beneficiario
- persona/miembro
- proyecto
- etiquetas
- moneda
- adjuntos
- notas
- fecha alternativa
- descuento
- amortización si se implementa

## Reglas de negocio mínimas
- transferencia requiere cuenta origen y destino distintas
- no permitir operaciones inconsistentes con moneda nula
- congelar tipo de cambio en la transacción si aplica
- no eliminar catálogos usados; desactivarlos
- recalcular/respetar saldo según política definida
- auditar operaciones clave
- documentar cada regla implementada

## Presupuestos
- por periodo
- por categoría
- comparación real vs planificado

## Préstamos
- saldo pendiente
- pagos parciales
- progreso

## Planificador
- generación de transacciones recurrentes
- registro de ejecuciones
- prevención de duplicados

## Reconciliación
- marcar transacciones conciliadas
- cierres por cuenta
- diferencias controladas

---

# 8. Permisos

Integra el sistema de permisos tenant existente.

Como mínimo implementa:
- `finance.view`
- `finance.accounts.manage`
- `finance.transactions.view`
- `finance.transactions.create`
- `finance.transactions.update`
- `finance.transactions.delete`
- `finance.categories.manage`
- `finance.loans.manage`
- `finance.budgets.manage`
- `finance.reports.view`
- `finance.settings.manage`
- `finance.import_export.manage`

Debes:
- proteger endpoints
- ocultar acciones UI según permiso
- documentar la matriz de permisos

---

# 9. Documentación obligatoria

Esto es crítico: **debes documentar todo lo que implementes**.

## Documentación para desarrollador
Debes mantener actualizados estos archivos:
- `finance_overview.md`
- `finance_api.md`
- `finance_db.md`
- `finance_permissions.md`
- `finance_business_rules.md`
- `finance_testing.md`
- `finance_frontend_notes.md`

## Documentación para usuario
Debes mantener actualizados:
- `finance_user_manual.md`
- `finance_admin_manual.md`

## Regla
No cierres un lote sin actualizar documentación.

## Cada pantalla debe documentarse con:
- objetivo
- cómo se usa
- campos
- botones
- validaciones
- errores comunes
- permisos necesarios
- ejemplos de uso

---

# 10. Pruebas obligatorias

Cada lote debe incluir pruebas mínimas.

## Backend
- unit tests de servicios críticos
- integration tests de endpoints clave
- smoke tests básicos del módulo

## Frontend
- validación manual guiada mínima
- test de componentes si ya existe framework en el proyecto
- checklist funcional por pantalla

No cierres un lote sin indicar qué se probó.

---

# 11. Formato de entrega por lote

Cuando termines cada lote debes entregar exactamente:

## 1. Resumen del lote
- objetivo cumplido
- decisiones tomadas
- supuestos

## 2. Archivos creados o modificados
Lista clara por ruta.

## 3. Migraciones creadas
Nombre y propósito.

## 4. Endpoints creados o modificados
Método + ruta + finalidad.

## 5. Componentes frontend creados o modificados
Página, formulario, hook o servicio.

## 6. Reglas de negocio implementadas
Resumen concreto.

## 7. Pruebas agregadas o ejecutadas
Qué cubren.

## 8. Documentación agregada o actualizada
Qué archivos se tocaron.

## 9. Pendientes del siguiente lote
Qué falta para seguir.

---

# 12. Criterio de calidad

El código debe quedar:
- legible
- modular
- consistente
- mantenible
- alineado con el proyecto
- sin duplicación innecesaria
- documentado
- fácil de extender

Quiero que el resultado final sea apto para continuar creciendo hacia:
- ERP
- contabilidad más formal
- facturación
- centros de costo
- clientes/proveedores
- reporting más avanzado

---

# 13. Cómo debes empezar

Empieza por:
- Lote 0
- luego Lote 1

No avances más allá de eso hasta dejar ambos correctamente cerrados.

---

# 14. Resultado esperado final

Al terminar, el módulo `finance` debe:
- quedar integrado al tenant portal
- tener backend, frontend, migraciones y documentación
- ser usable por usuarios tenant
- replicar de forma muy cercana la experiencia de Alzex Finance Pro
- quedar listo para futuras ampliaciones tipo ERP

---

# 15. Instrucción final de ejecución

Ahora comienza a implementar el módulo `finance` siguiendo estrictamente:
- `roadmap_modulo_finance_alzex_codex_detallado.md`
- `finance_codex_tareas_ejecucion.md`

Primero ejecuta:
- Lote 0 — Preparación
- Lote 1 — Migraciones base

Y al terminar, entrega el resultado con el formato definido en este archivo.
