# Convencion Modular por Slice

Este documento fija la forma recomendada de abrir nuevos modulos sobre `platform_paas`.

No obliga a reestructurar hoy todo el repositorio. La idea es dejar una convención clara para que los siguientes modulos no nazcan dispersos.

## Decision vigente

Desde este punto del proyecto:

- `finance` se considera el modulo base del SaaS
- `finance` se toma como modulo piloto para la convencion modular
- los modulos nuevos deben pensarse como una unidad vertical completa, no solo como una pagina o una tabla

## Que significa "slice"

Un modulo por `slice` significa que una misma capacidad de producto se diseña como un bloque vertical que incluye:

- backend
- frontend
- migraciones
- permisos
- pruebas
- documentacion

Pensado simple:

- un modulo no es solo una carpeta `models`
- un modulo no es solo una pagina en `tenant_portal`
- un modulo es una unidad funcional completa

## Estructura ideal futura

La estructura ideal, si mas adelante se quisiera explicitar aun mas los modulos, seria esta:

```text
module_name/
  backend/
    models/
    repositories/
    services/
    schemas.py
    routes.py
    permissions.py
  frontend/
    pages/
    components/
    hooks/
    types.ts
  migrations/
    tenant/
  tests/
    backend/
    frontend/
  docs/
    README.md
    runbook.md
```

No significa que debamos mover hoy el repo a esa forma exacta.

La regla practica actual es:

- mantener la estructura real del proyecto
- pero pensar y construir cada modulo nuevo como si fuera ya un slice completo

## Traduccion a la estructura real del proyecto

Hoy, en este repositorio, un modulo tenant bien cerrado deberia tener al menos:

### Backend

- `backend/app/apps/tenant_modules/<modulo>/models/`
- `backend/app/apps/tenant_modules/<modulo>/repositories/`
- `backend/app/apps/tenant_modules/<modulo>/services/`
- `backend/app/apps/tenant_modules/<modulo>/api/`
- `backend/app/apps/tenant_modules/<modulo>/schemas.py`
- `backend/app/apps/tenant_modules/<modulo>/permissions.py` cuando corresponda

### Frontend

- `frontend/src/apps/tenant_portal/pages/<modulo>/`
- componentes propios del modulo si hacen falta
- uso de `services/`, `types.ts` y helpers comunes solo como soporte

### Migraciones

- migracion tenant del modulo en `backend/migrations/tenant/`
- o estructura mas especializada por modulo si mas adelante endurecemos mas `Etapa 10`

### Tests

- pruebas backend del modulo
- integracion real cuando el riesgo lo justifique
- validacion funcional o pruebas frontend cuando aporte

### Documentacion

- un runbook del modulo
- notas operativas si el modulo introduce enforcement, seeds o soporte especial

## Regla minima por modulo

Antes de considerar un modulo como "real", deberia tener como minimo:

- modelo de datos
- servicio
- rutas API
- permisos
- frontend tenant visible
- migracion tenant
- pruebas backend
- documentacion escrita corta

Si falta una de esas piezas, todavia no deberia presentarse como modulo cerrado.

## Rol de `finance`

`Finance` queda declarado como:

- modulo base del SaaS
- modulo piloto para la convencion modular
- referencia para los siguientes modulos tenant

Arranque real ya completado:

- slice backend propio bajo `tenant_modules/finance`
- slice frontend propio bajo `tenant_portal/modules/finance`
- router agregador del modulo
- placeholders de vistas futuras
- compatibilidad con la vista actual de movimientos para no romper operacion

Eso no significa que `finance` sea necesariamente el dominio final mas importante del producto.

Significa esto:

- el patron correcto de modulo se prueba primero ahi
- los siguientes modulos deberian imitar su cierre tecnico, no su negocio especifico

## Que no conviene hacer con modulos nuevos

No conviene:

- abrir un modulo nuevo con solo frontend
- abrir un modulo nuevo con solo tablas y sin UX minima
- repartir reglas del modulo entre carpetas comunes sin una frontera clara
- copiar pantallas de otro sistema sin definir primero entidades y reglas

## Secuencia recomendada para un modulo nuevo

Cuando se abra el siguiente modulo, el orden correcto deberia ser:

1. definir objetivo y flujo funcional
2. definir entidades y reglas
3. modelar backend
4. crear migracion tenant
5. exponer rutas y permisos
6. montar frontend tenant
7. validar soporte operativo desde `platform_admin` si hace falta
8. documentar

## Politica actual

La politica vigente del proyecto queda asi:

- no migrar masivamente `finance` de carpeta por ahora
- usar `finance` como referencia base del SaaS
- hacer que los modulos nuevos nazcan ya con esta mentalidad de slice completo
