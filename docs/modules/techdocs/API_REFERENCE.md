# TechDocs API Reference

Referencia resumida del módulo `techdocs`.

## Overview

- `GET /tenant/techdocs/overview`
  - métricas del módulo
  - expedientes recientes
  - evidencias recientes

## Dossiers

- `GET /tenant/techdocs/dossiers`
- `POST /tenant/techdocs/dossiers`
- `GET /tenant/techdocs/dossiers/{dossier_id}/detail`
- `PUT /tenant/techdocs/dossiers/{dossier_id}`
- `PATCH /tenant/techdocs/dossiers/{dossier_id}/status`
- `DELETE /tenant/techdocs/dossiers/{dossier_id}`

Notas:

- filtros soportados en listado:
  - `include_inactive`
  - `include_archived`
  - `status`
  - `dossier_type`
  - `client_id`
  - `installation_id`
  - `q`

## Sections

- `POST /tenant/techdocs/dossiers/{dossier_id}/sections`
- `PUT /tenant/techdocs/dossiers/sections/{section_id}`
- `DELETE /tenant/techdocs/dossiers/sections/{section_id}`

## Measurements

- `POST /tenant/techdocs/dossiers/sections/{section_id}/measurements`
- `PUT /tenant/techdocs/dossiers/measurements/{measurement_id}`
- `DELETE /tenant/techdocs/dossiers/measurements/{measurement_id}`

## Evidences

- `POST /tenant/techdocs/dossiers/{dossier_id}/evidences`
- `DELETE /tenant/techdocs/dossiers/{dossier_id}/evidences/{evidence_id}`
- `GET /tenant/techdocs/dossiers/{dossier_id}/evidences/{evidence_id}/download`

Restricciones actuales:

- máximo 12 MB
- content types permitidos:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `text/plain`

## Audit

- `GET /tenant/techdocs/audit`

Notas:

- filtros soportados:
  - `dossier_id`
  - `q`

## Permisos

- lectura:
  - `tenant.techdocs.read`
- escritura:
  - `tenant.techdocs.manage`
