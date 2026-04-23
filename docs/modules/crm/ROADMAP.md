# CRM Roadmap

Estado del módulo `crm`.

## Estado actual

`crm` ya quedó abierto como primer frente de expansión post-cierre del roadmap base.

El primer slice ya cubre:

- catálogo simple de productos/servicios
- oportunidades base
- cotizaciones base
- overview comercial corto
- integración con clientes de `business-core`

## Cerrado en este primer corte

- módulo tenant backend/frontend creado
- migración tenant `0040_crm_base`
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `crm`
- labels visibles del módulo en `platform_admin`
- regresión mínima de servicios y migración

## Siguiente nivel recomendado

1. notas y actividades CRM
2. estados y trazabilidad comercial más ricos
3. adjuntos/archivos
4. plantillas de cotización
5. render/PDF
6. productos y servicios más ricos
7. scraping asistido

## Deuda visible

- falta E2E específico del módulo
- falta una capa de archivos comerciales
- falta lectura histórica más rica del pipeline
- falta integración posterior con plantillas y PDF

## Criterio de evolución

Lo siguiente sobre `crm` debe tratarse como expansión del módulo, no como corrección del primer scaffold ya abierto.
