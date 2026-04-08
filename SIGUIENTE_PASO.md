# SIGUIENTE_PASO

## Última actualización

- fecha: 2026-04-08
- prioridad vigente: abrir el siguiente frente real del roadmap con `production` estable y `staging` ya devuelto a espejo instalado

## Objetivo del próximo paso

No reabrir el cutover productivo ya cerrado.

El siguiente paso correcto es aprovechar el mini PC con tres carriles separados:

- `dev`
- `staging/test`
- `production`

y usar el staging ya restaurado a espejo como carril previo normal antes de abrir otro frente.

## Prioridad inmediata

### 1. No reabrir el frente central sin motivo

El cutover inicial ya quedó cerrado sobre:

- `https://orkestia.ddns.net`
- backend `systemd`
- frontend `nginx`
- smoke remoto `all` aprobado

### 2. Usar staging como carril previo real

Ya existe un entorno staging separado:

- backend `127.0.0.1:8200`
- frontend `http://192.168.7.42:8081`
- árbol `/opt/platform_paas_staging`
- servicio `platform-paas-backend-staging`

### 3. Elegir el siguiente frente explícito

La próxima iteración debe elegir una sola de estas rutas:

- abrir el backlog transversal recomendado del PaaS
- abrir un nuevo frente funcional explícito con documentación canónica desde el inicio
- endurecer una zona central ya existente si hay una justificación operativa clara
- backlog transversal recomendado del PaaS

## Orden exacto recomendado

1. leer `PROJECT_CONTEXT.md`
2. leer `SESION_ACTIVA.md`
3. leer `PROMPT_MAESTRO_MODULO.md`
4. leer `ESTADO_ACTUAL.md`
5. leer `REGLAS_IMPLEMENTACION.md`
6. confirmar que producción y staging siguen saludables
7. elegir el siguiente frente explícito ahora que `staging` ya volvió a modo espejo
8. actualizar `ESTADO_ACTUAL.md` si cambia la prioridad real

## Qué debe actualizar la próxima IA al cerrar

Si abre un frente nuevo:

- actualizar `ESTADO_ACTUAL.md`
- reescribir este archivo con el nuevo siguiente paso real
- dejar el backlog previo explícitamente cerrado o diferido

## Qué debe hacer otra IA al retomar

Antes de escribir código funcional, debe partir desde esta realidad operativa:

- producción ya está publicada y validada inicialmente con HTTPS en `orkestia.ddns.net`
- staging/test ya existe en el mismo mini PC
- lo pendiente ya no es deploy productivo ni entorno, sino elegir el siguiente frente real del roadmap

## Regla de cierre de la próxima iteración

La próxima iteración debe terminar con una de estas dos salidas claras:

### Salida A

- se abre un frente nuevo explícito con estado y roadmap alineados

### Salida B

- se documenta un bloqueo real de priorización o una razón concreta para no abrir todavía ese frente

No cerrar la próxima iteración con un estado intermedio tipo "ya casi".

## Regla práctica final

Si la próxima IA no sabe en los primeros minutos si debe desplegar o volver al backlog residual, entonces primero debe actualizar el estado antes de tocar código.

Y si una iteración importante cambia el estado real del proyecto, estos archivos raíz también deben actualizarse antes de cerrar esa iteración.

## Señal de que ya se puede reemplazar este archivo

Este archivo debería reescribirse cuando:

- se elija explícitamente el siguiente frente del roadmap
- el proyecto pase desde hardening de entornos a nuevo desarrollo funcional
