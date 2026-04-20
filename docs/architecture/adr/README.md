# ADRs de `platform_paas`

Esta carpeta contiene los `Architecture Decision Records` del proyecto.

Su objetivo es dejar por escrito decisiones tecnicas o de producto que:

- afectan a toda la PaaS o a mas de un modulo
- son costosas de revertir
- cambian ownership, contratos, deploy, seguridad o lifecycle
- podrian reabrirse por otra IA si no quedan cerradas

## Cuándo abrir un ADR

Abrir un ADR cuando la decision:

- cambia la frontera entre dominios
- redefine ownership de datos
- introduce o elimina un modulo transversal
- cambia contratos entre `platform-core`, `business-core`, `maintenance`, `finance` o `agenda`
- cambia el modelo de deploy, entorno, seguridad o storage
- cambia la politica de portabilidad, imports o deletes criticos

No abrir ADR para:

- fixes puntuales de bug
- copy o UX residual
- cambios locales sin impacto arquitectonico

## Formato esperado

Usar [TEMPLATE.md](./TEMPLATE.md).

Cada ADR debe declarar:

- estado: `proposed`, `accepted`, `superseded`
- contexto
- decision
- consecuencias
- referencias a specs, changelog o slices relacionados

## Convencion de nombres

- `0001-nombre-corto.md`
- `0002-nombre-corto.md`

Ejemplos:

- `0001-agenda-como-modulo-transversal.md`
- `0002-finance-dueno-del-hecho-economico.md`

## Regla operativa

Si una decision transversal ya fue aceptada en un ADR:

- no reabrirla implicitamente
- si debe cambiarse, crear un ADR nuevo que la reemplace o la marque como `superseded`

## ADRs vigentes

- [0001-domain-data-ownership-and-cross-module-writes.md](./0001-domain-data-ownership-and-cross-module-writes.md): fija ownership de datos por dominio y prohíbe escrituras cruzadas sin contrato explícito.
- [0002-release-requires-promotion-convergence-and-audit.md](./0002-release-requires-promotion-convergence-and-audit.md): declara que un release correcto exige promoción, convergencia tenant, auditoría y documentación viva.
- [0003-agenda-como-modulo-transversal-del-tenant.md](./0003-agenda-como-modulo-transversal-del-tenant.md): consolida `Agenda` como módulo lateral transversal del tenant con fuente inicial en `maintenance`.
