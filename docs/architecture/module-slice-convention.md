# Convencion Modular por Slice

Este documento fija la forma recomendada de abrir nuevos modulos sobre `platform_paas`.

Para el estandar operativo completo de CRUD, modales, maquetacion, validaciones, revisiones y documentacion viva, ver tambien:

- [Estandar de construccion de modulos](./module-build-standard.md)
- [Gobernanza de implementacion](./implementation-governance.md)

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

- `frontend/src/apps/tenant_portal/modules/<modulo>/pages/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/components/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/services/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/styles/` cuando el lenguaje visual del modulo lo requiera
- `utils/` y `types.ts` solo cuando realmente clarifiquen el slice

### Migraciones

- migracion tenant del modulo en `backend/migrations/tenant/`
- o estructura mas especializada por modulo si mas adelante endurecemos mas `Etapa 10`

### Tests

- pruebas backend del modulo
- integracion real cuando el riesgo lo justifique
- validacion funcional o pruebas frontend cuando aporte

### Documentacion

- un directorio canonico en `docs/modules/<modulo>/`
- `README.md`
- `USER_GUIDE.md`
- `DEV_GUIDE.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `API_REFERENCE.md` cuando el modulo exponga endpoints o contratos propios
- runbooks y notas operativas adicionales cuando el modulo introduzca enforcement, seeds o soporte especial

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
- carpeta canonica en `docs/modules/<modulo>/` con los documentos base ya creados

## Regla UX para CRUD

Desde este punto del proyecto, cualquier CRUD nuevo deberia respetar esta regla de captura:

- la lectura principal se muestra primero
- la creacion no queda desplegada por defecto
- el alta se abre solo bajo demanda desde un boton explicito como `Nuevo`, `Crear` o equivalente
- la edicion puede vivir en modal, drawer o vista secundaria segun densidad, pero tampoco deberia invadir la lectura principal sin que el usuario la pida

Traduccion practica:

- no abrir formularios de alta permanentes encima del catalogo
- no mezclar lectura y creacion en la misma columna por defecto
- usar modales de alta en CRUD operativos mientras no exista una razon fuerte para una vista dedicada

La idea es mantener:

- lectura limpia
- menor fatiga visual
- menor riesgo de captura accidental
- consistencia entre `platform_admin`, `tenant_portal` y modulos futuros

## Politica documental oficial

La documentacion modular ya no debe quedar solo dispersa entre backend, frontend y runbooks.

Desde ahora, cada modulo o dominio nuevo debe cumplir esta regla:

1. tener documentacion tecnica detallada donde corresponda
2. tener un punto de entrada unico en `docs/modules/<modulo>/`
3. separar el contenido por tipo de lector

La minima separacion oficial es:

- `README.md`
  indice del modulo y mapa de documentos
- `USER_GUIDE.md`
  lectura para operacion y soporte funcional
- `DEV_GUIDE.md`
  lectura para desarrollo y extension
- `ROADMAP.md`
  estado actual, deuda y siguientes pasos
- `CHANGELOG.md`
  hitos y evolucion
- `API_REFERENCE.md`
  referencia resumida cuando aplique

La regla practica es:

- el contenido detallado puede seguir viviendo en backend/frontend/docs/runbooks
- pero `docs/modules/<modulo>/` pasa a ser la puerta de entrada oficial

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
- primera pantalla moderna de `Transacciones` sobre `finance_transactions`
- balances por cuenta y detalle operacional con auditoria reciente
- compatibilidad legacy de `/entries` para no romper operacion mientras se completa el modulo

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
- usar `docs/modules/finance/` y `docs/modules/platform-core/` como patrón documental canónico
- hacer que los modulos nuevos nazcan ya con esta mentalidad de slice completo
