# Política de Entornos

Esta política define el uso correcto de `development`, `staging` y `production` para `platform_paas`.

## Objetivo

Evitar mezcla de responsabilidades entre entornos y reducir drift entre:

- repo
- runtime
- tenants activos

## Entornos

### Development

Propósito:

- implementar
- probar localmente
- depurar

Permitido:

- cambios rápidos
- datos efímeros
- pruebas locales

No permitido como evidencia final única:

- declarar un slice correcto solo por pasar en local

### Staging

Propósito:

- carril previo real
- validar deploy y runtime publicado
- verificar convergencia tenant antes de promover

Permitido:

- smoke funcional
- validación de runtime
- ensayos de convergencia y recovery

### Production

Propósito:

- operación real
- evidencia final de cambios promovidos

Regla:

- solo se promueve cuando la evidencia de `staging` y el riesgo del cambio lo justifican

## Regla de promoción

Si una mejora se declara correcta para la PaaS:

- debe quedar explícito en qué entornos quedó aplicada
- qué validación se hizo por entorno
- qué tenants se verificaron

## Regla de convergencia

Después de cambios que afecten:

- seeds
- defaults
- migrations
- lógica multi-tenant
- `maintenance`
- `finance`
- provisioning

debe ejecutarse convergencia por ambiente.

## Regla de diagnóstico

Si un bug reaparece:

- primero comprobar runtime publicado
- luego distinguir repo, ambiente, tenant y caché

No asumir que el problema vive en el código sin revisar el entorno.

## Regla de documentación

Todo cambio promovido debe dejar:

- estado por ambiente
- evidencia mínima
- drift abierto si lo hubiera
