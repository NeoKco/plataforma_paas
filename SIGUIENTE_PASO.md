# SIGUIENTE_PASO

## Última actualización

- fecha: 2026-04-08
- prioridad vigente: desplegar y validar en vivo el endurecimiento de `Nuevo tenant` ahora que ya quedó corregido en código

## Objetivo del próximo paso

Aplicar y validar en entorno real este frente ya implementado en el repo:

- `Nuevo tenant` debe capturar admin inicial explícito
- provisioning ya no debe sembrar un admin bootstrap fijo compartido para tenants nuevos
- `Tenants` debe dejar visible que los módulos se habilitan por `plan`
- el operador debe poder ver el preview de módulos en el alta y en `Plan y módulos`

## Prioridad inmediata

### 1. Desplegar primero a staging

Usar el carril ya existente:

- backend `127.0.0.1:8200`
- frontend `http://192.168.7.42:8081`
- árbol `/opt/platform_paas_staging`
- servicio `platform-paas-backend-staging`

### 2. Validar el flujo real

Comprobar al menos:

- `Nuevo tenant` pide admin inicial explícito
- el alta rechaza dejar vacío nombre/correo/password del admin
- el preview de módulos por plan es visible
- el bloque `Plan y módulos` queda entendible para operación

### 3. Si staging pasa, propagar a producción

Aplicar:

- migración de control `0025_tenant_bootstrap_admin`
- despliegue backend/frontend
- smoke corto de `platform_admin > Tenants`

## Orden exacto recomendado

1. leer `PROJECT_CONTEXT.md`
2. leer `SESION_ACTIVA.md`
3. leer `PROMPT_MAESTRO_MODULO.md`
4. leer `ESTADO_ACTUAL.md`
5. leer `REGLAS_IMPLEMENTACION.md`
6. confirmar que producción y staging siguen saludables
7. asumir cerrado el frente `tenant sidebar backend-driven`
8. desplegar el frente `Nuevo tenant admin explícito + módulos por plan` a `staging`
9. validar el flujo visible
10. si pasa, propagar a `production`
11. actualizar `ESTADO_ACTUAL.md` si cambia la prioridad real

## Qué debe actualizar la próxima IA al cerrar

Si cierra este frente:

- actualizar `ESTADO_ACTUAL.md`
- reescribir este archivo con el nuevo siguiente paso real
- dejar explícito si ya quedó desplegado solo en repo, en `staging` o también en `production`

## Qué debe hacer otra IA al retomar

Antes de escribir código funcional, debe partir desde esta realidad operativa:

- producción ya está publicada y validada inicialmente con HTTPS en `orkestia.ddns.net`
- staging/test ya existe en el mismo mini PC
- el frente activo inmediato ya no es deploy base ni entorno: es cerrar el endurecimiento de `Nuevo tenant` en entorno real

## Regla de cierre de la próxima iteración

La próxima iteración debe terminar con una de estas dos salidas claras:

### Salida A

- el cambio de `Nuevo tenant` queda validado en `staging` o en `production`

### Salida B

- se documenta un bloqueo real de despliegue o validación en vivo

No cerrar la próxima iteración con un estado intermedio tipo "ya casi".

## Regla práctica final

Si la próxima IA no sabe en los primeros minutos si debe desplegar este frente o quedarse solo en repo, entonces primero debe actualizar el estado antes de tocar código.

Y si una iteración importante cambia el estado real del proyecto, estos archivos raíz también deben actualizarse antes de cerrar esa iteración.

## Señal de que ya se puede reemplazar este archivo

Este archivo debería reescribirse cuando:

- el frente `Nuevo tenant admin explícito + módulos por plan` quede validado en vivo
- se elija explícitamente el siguiente frente del roadmap después de eso
