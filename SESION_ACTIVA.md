# SESION_ACTIVA

## Propósito

Este archivo es el puntero rápido entre sesiones cuando el proyecto se retoma desde otra cuenta, otra IA o después de agotar cuota.

No reemplaza:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`

Su objetivo es más corto:

- decir en 30 segundos dónde quedó la mano
- qué frente estaba activo
- cuál es el siguiente movimiento inmediato

## Cómo usarlo

Actualizar este archivo cuando cierres una iteración relevante o cuando vayas a cambiar de sesión/cuenta.

Debe permanecer corto, operativo y fácil de escanear.

## Estado rápido vigente

- fecha: 2026-04-07
- foco activo: separación `dev/staging/prod` ya operativa en mini PC
- prioridad inmediata: usar el staging ya reseteado para validar el instalador y luego abrir el siguiente frente real
- módulo o frente activo: transversal / platform-core / staging-test

## Último contexto útil

- `finance` quedó cerrado en su alcance actual
- `business-core` y `maintenance` quedaron operativos en su primer corte y alineados al frente transversal
- el backlog residual editorial no bloquea salida a terreno
- el mini PC ya quedó asumido como host productivo real
- `/opt/platform_paas` ya existe como árbol productivo separado
- `/opt/platform_paas_staging` ya existe como árbol staging separado
- `platform-paas-backend` ya quedó instalado en `systemd`
- `platform-paas-backend-staging` ya quedó instalado en `systemd`
- `nginx` ya publica la SPA y enruta backend por un único dominio HTTPS: `orkestia.ddns.net`
- `nginx` ya publica además el staging local en `http://192.168.7.42:8081`
- el smoke remoto completo contra `https://orkestia.ddns.net` ya pasó con `7/7` checks OK
- el health staging ya responde en `8200` y `8081`
- el staging ya fue reseteado a bootstrap y el backend responde `installed=false`

## Bloqueo actual

- no existe bloqueo productivo
- no existe bloqueo técnico
- la única decisión abierta es si se valida ahora mismo el instalador en browser o si luego se reinstala staging y se abre otro frente

## Siguiente acción inmediata

El siguiente movimiento correcto ya no es desplegar.

Es este:

- mantener producción estable
- usar staging como carril previo real
- validar el instalador en el staging ya reseteado
- elegir después el siguiente frente del roadmap

## Archivos a leer justo después de este

1. `PROMPT_MAESTRO_MODULO.md`
2. `ESTADO_ACTUAL.md`
3. `SIGUIENTE_PASO.md`
4. `HANDOFF_STATE.json`

## Última verificación útil conocida

- backend productivo en `/opt/platform_paas`: desplegado
- `platform-paas-backend`: activo en `systemd`
- `GET http://127.0.0.1:8000/health`: OK
- `GET https://orkestia.ddns.net/health` validado por resolución local: OK
- frontend static preflight en `/opt/platform_paas`: OK
- smoke remoto público `all` en `https://orkestia.ddns.net`: OK (`7/7`)
- backend staging en `/opt/platform_paas_staging`: desplegado
- `platform-paas-backend-staging`: activo en `systemd`
- `GET http://127.0.0.1:8200/health`: OK
- `GET http://127.0.0.1:8081/health`: OK
