# Arquitectura

Esta seccion agrupa la documentacion de arquitectura del proyecto: estructura del repositorio, organizacion por capas y futuras decisiones tecnicas.

## Documentos

- [Estructura raiz del proyecto](./project-structure.md): mapa general de carpetas y proposito de cada bloque principal.
- [Flujo actual del backend](./backend-current-flow.md): instalacion, `platform_control`, provisionamiento y autenticacion tal como estan hoy.
- [Cierre del backend base](./backend-closure-status.md): decision de que partes del backend ya damos por cerradas antes de pasar a frontend.
- [Matriz de politicas y precedencias del backend](./backend-policy-precedence-matrix.md): orden efectivo de lifecycle, billing, maintenance, modulos y cuotas.
- [Roadmap de frontend](./frontend-roadmap.md): orden recomendado para construir la app `platform` y luego el portal tenant.
- [Baseline de UX para frontend](./frontend-ux-baseline.md): decisiones ya cerradas, huecos UX pendientes y orden sugerido para estabilizar la base visual.
- [Guia unica para entender la app](./app-understanding-guide.md): documento recomendado para comprender el producto, el flujo tenant y el sentido de `Provisioning` sin leer codigo primero.
- [Guia rapida de la app](./app-quick-guide.md): lectura corta para entender la plataforma en pocos minutos antes de entrar al detalle.
- [Guia de comprension de la app](./app-functional-walkthrough.md): recorrido funcional de la plataforma, estados reales y diferencia entre lo que ya existe y lo que aun falta.
- [Manual visual de la app](./app-visual-manual.md): recorrido por pantallas y set recomendado de capturas para entender el producto visualmente.
- [Plantilla frontend de plataforma](./platform-frontend-template.md): plano tecnico de la plantilla propia sobre Bootstrap para `platform_admin`.
- [Convenciones de frontend](./frontend-conventions.md): reglas de consumo de API, sesion, errores y uso de capacidades backend.
- [UX operativa de platform admin](./platform-admin-operational-ux.md): criterios de nombres, estados, tablas, vacios y acciones riesgosas para el panel.
- [Matriz de errores y estados backend](./backend-error-status-matrix.md): lectura consolidada de HTTP codes, lifecycle, billing y access policy.
- [Mapa de permisos](./permission-map.md): roles platform y tenant, con las acciones permitidas hoy.
- [Definicion de MVP](./product-mvp-definition.md): que se considera app usable y que queda fuera del alcance base.
- [Modelo multi-tenant](./multi-tenant-model.md): separacion entre base de control y bases por tenant, ciclo de vida y aislamiento.
- [Autenticacion y autorizacion](./authentication-and-authorization.md): JWT, middleware, roles y estado actual del enforcement.
- [Roadmap de desarrollo](./development-roadmap.md): hoja de ruta completa del proyecto, desde bootstrap hasta modulos, frontend e infraestructura.
- [Convencion modular por slice](./module-slice-convention.md): regla oficial para abrir modulos nuevos tomando `finance` como modulo base del SaaS.
- [Estandar de construccion de modulos](./module-build-standard.md): forma oficial de cerrar dominios y CRUDs con lectura primero, alta bajo demanda, validaciones, modales y documentacion viva.
- [Estandar documental por modulo](./module-slice-convention.md): misma convención, incluyendo la obligación de publicar `README`, `USER_GUIDE`, `DEV_GUIDE`, `ROADMAP` y `CHANGELOG` en `docs/modules/<modulo>/`.
- [Mapa de dominios del PaaS](./domain-map.md): separacion entre `platform-core`, `business-core`, vertical cores y modulos funcionales.

## Alcance Esperado

Aqui deberian vivir, a medida que el proyecto evolucione:

- diagramas de contexto y componentes
- flujo de instalacion y provisionamiento
- modelo multi-tenant
- estrategia de autenticacion y autorizacion
- convenciones de modulos backend y frontend
