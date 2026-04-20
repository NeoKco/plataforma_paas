# ADR 0002 - Un release correcto exige promoción, convergencia y auditoría

- Estado: `accepted`
- Fecha: `2026-04-20`
- Reemplaza: `n/a`
- Reemplazado por: `n/a`

## Contexto

El proyecto ya vivió incidentes donde:

- el cambio estaba bien en repo pero no en runtime
- `staging` y `production` no estaban alineados
- un tenant funcionaba y otro del mismo ambiente no
- el `healthcheck` era verde, pero seguía existiendo drift tenant-local

Eso demostró que:

- `repo != runtime`
- `deploy != convergencia`
- `healthcheck != cierre completo`

## Decisión

Se declara como decisión arquitectónica y operativa cerrada:

Un cambio no se considera correcto para la PaaS si no queda explícitamente:

- promovido al ambiente afectado
- convergido por tenant
- auditado después de la convergencia
- documentado en memoria viva

Secuencia oficial de cierre:

1. cambio en repo
2. deploy en ambiente afectado
3. convergencia post-deploy
4. auditoría tenant
5. validación runtime proporcional
6. documentación viva

## Consecuencias

- una validación local no basta para cerrar un slice global
- una validación en un solo tenant no basta para cerrar un slice multi-tenant
- el post-deploy gate técnico y el check de memoria viva pasan a ser parte del cierre oficial
- los incidentes tenant deben tratarse como drift de runtime o datos hasta demostrar lo contrario

## Referencias

- [Gobernanza de implementación](../implementation-governance.md)
- [Política de entornos](../environment-policy.md)
- [CHECKLIST_CIERRE_ITERACION](../../../CHECKLIST_CIERRE_ITERACION.md)
- [check_release_governance.sh](../../../deploy/check_release_governance.sh)
