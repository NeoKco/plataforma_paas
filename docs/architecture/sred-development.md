# SRED Driven Development

Este documento formaliza el método `SRED` para trabajar en `platform_paas`.

`SRED` significa:

- `S`: Spec
- `R`: Rules and Review
- `E`: Evidence
- `D`: Documentation

La idea no es inventar otra burocracia. La idea es concentrar en una regla corta lo que el proyecto ya exige para cerrar bien una iteración.

## Objetivo

Antes de considerar un slice como cerrado, debe quedar resuelto en cuatro planos:

- especificación funcional clara
- reglas y revisión coherentes
- evidencia ejecutada
- documentación viva al día

Si uno falta, el cambio sigue abierto.

## S. Spec

Antes de tocar código debe quedar claro:

- qué problema real se resuelve
- en qué dominio vive
- qué entidades y estados toca
- qué ownership de datos afecta
- qué parte ya existe y qué parte realmente falta
- qué validación mínima debe ejecutarse

Fuentes canónicas:

- [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)
- [ESTADO_ACTUAL.md](../../ESTADO_ACTUAL.md)
- [SIGUIENTE_PASO.md](../../SIGUIENTE_PASO.md)
- roadmap y changelog del módulo
- [Gobernanza de datos](./data-governance.md)
- [Matriz de ownership de datos](./data-ownership-matrix.md)
- [Plantilla oficial de spec por slice](./slice-spec-template.md)

## R. Rules and Review

El cambio debe respetar:

- arquitectura por módulos
- patrón `router -> service -> repository`
- ownership del dominio
- reglas de UX vigentes
- reglas transversales de implementación

Revisión mínima:

- funcional
- técnica
- UX
- cierre documental

Fuentes canónicas:

- [REGLAS_IMPLEMENTACION.md](../../REGLAS_IMPLEMENTACION.md)
- [Gobernanza de implementacion](./implementation-governance.md)
- [Estandar de construccion de modulos](./module-build-standard.md)

## E. Evidence

No se cierra por intuición.

Debe existir evidencia proporcional al riesgo:

- tests backend focalizados
- `npm run build` si hubo frontend
- smoke E2E nuevo o ajustado si cambió un flujo visible
- validación manual documentada si no existe todavía smoke razonable
- evidencia de deploy/health si hubo publish

La evidencia debe quedar escrita en:

- respuesta de cierre
- `ESTADO_ACTUAL.md`
- `HISTORIAL_ITERACIONES.md`
- changelog del módulo si corresponde

## D. Documentation

Todo cambio relevante debe dejar documentación viva:

- estado raíz
- siguiente paso
- historial
- roadmap del módulo
- changelog del módulo
- runbook si cambió la forma de validar, recuperar o desplegar

Regla práctica:

- si otra IA no puede retomar el trabajo desde el repo, el `D` todavía no está cerrado

## Cuándo aplicar SRED

Siempre.

Pero es especialmente obligatorio cuando el cambio:

- toca datos críticos
- toca contratos entre módulos
- cambia UX visible
- toca seeds, migraciones o portabilidad
- toca deploy, staging o production

No hay excepción por tratarse de:

- hardening técnico
- cambios de infraestructura con impacto en runtime
- convergencia multi-tenant
- reparación de datos
- polish visible de un módulo ya existente

Si el cambio altera comportamiento real o continuidad operativa, entra en `SRED`.

## Artefactos mínimos para ejecutar SRED

Para slices relevantes, `SRED` debe dejar como mínimo:

- ownership explícito en la matriz de datos
- spec mínima por slice
- evidencia proporcional al riesgo
- actualización de memoria viva y documentos canónicos

Sin esos cuatro artefactos, `SRED` queda invocado solo en teoría.

## Preguntas de control rápidas

### Spec

- ¿el alcance real está claro?
- ¿sabemos qué ya existe y qué no?

### Rules and Review

- ¿la regla vive en la capa correcta?
- ¿respeta ownership del dominio?

### Evidence

- ¿hay validación proporcional al riesgo?
- ¿la limitación quedó explícita si no se pudo validar más?

### Documentation

- ¿estado, roadmap y changelog quedaron al día?
- ¿otra IA puede continuar sin el chat?

## Relación con el estándar actual

`SRED` no reemplaza nada.

Solo resume y hace ejecutable lo ya definido en:

- [Gobernanza de implementacion](./implementation-governance.md)
- [Gobernanza de datos](./data-governance.md)
- [CHECKLIST_CIERRE_ITERACION.md](../../CHECKLIST_CIERRE_ITERACION.md)
- [PLANTILLA_ACTUALIZACION_ESTADO.md](../../PLANTILLA_ACTUALIZACION_ESTADO.md)

## Regla final

En `platform_paas`, el estándar de cierre recomendado es:

- primero `Spec`
- luego `Rules`
- después `Evidence`
- y al final `Documentation`

Si el orden se invierte y se programa antes de aclarar lo demás, aumenta la deuda y baja la continuidad entre sesiones.
