# ADR 0003 - Agenda como módulo transversal del tenant

- Estado: `accepted`
- Fecha: `2026-04-20`
- Reemplaza: `n/a`
- Reemplazado por: `n/a`

## Contexto

La agenda operativa existía dentro de `maintenance`, pero la necesidad real del producto es una agenda general tenant-side capaz de recibir eventos de más de un módulo.

Mantenerla anidada permanentemente en `maintenance` habría generado:

- navegación duplicada
- falsa percepción de que la agenda solo pertenece a mantenciones
- más fricción para sumar eventos futuros de otros dominios

## Decisión

`Agenda` pasa a ser un módulo lateral propio del portal tenant.

Reglas actuales:

- ruta propia: `/tenant-portal/agenda`
- entrada propia en la barra lateral
- fuente inicial de datos: calendario operativo de `maintenance`

Regla evolutiva:

- nuevos módulos podrán publicar eventos a la agenda solo mediante contrato explícito
- `agenda` consume eventos; no se vuelve dueño del dato operativo original

## Consecuencias

- la navegación tenant queda preparada para una agenda transversal sin mover de nuevo la UI
- `maintenance` deja de exponer la agenda como subpestaña interna
- cualquier nueva integración con agenda deberá declarar contrato de evento y ownership

## Referencias

- [Mapa de dominios del PaaS](../domain-map.md)
- [Gobernanza de datos](../data-governance.md)
- [Estándar de construcción de módulos](../module-build-standard.md)
