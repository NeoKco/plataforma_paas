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
- foco activo: producción real en mini PC + cierre de handoff entre IAs
- prioridad inmediata: smoke corto de terreno y validación externa final sobre `https://orkestia.ddns.net`
- módulo o frente activo: transversal / deploy / post-cutover

## Último contexto útil

- `finance` quedó cerrado en su alcance actual
- `business-core` y `maintenance` quedaron operativos en su primer corte y alineados al frente transversal
- el backlog residual editorial no bloquea salida a terreno
- el mini PC ya quedó asumido como host productivo real
- `/opt/platform_paas` ya existe como árbol productivo separado
- `platform-paas-backend` ya quedó instalado en `systemd`
- `nginx` ya publica la SPA y enruta backend por un único dominio HTTPS: `orkestia.ddns.net`

## Bloqueo actual

- no se ha validado todavía el smoke corto final desde navegador real sobre `https://orkestia.ddns.net`
- falta resincronizar `/opt/platform_paas` con los últimos cambios documentales de este cierre HTTPS

## Siguiente acción inmediata

El siguiente movimiento correcto ya no es desplegar.

Es este:

- validar desde navegador real `http://orkestia.ddns.net`
- validar desde navegador real `https://orkestia.ddns.net`
- ejecutar smoke corto de terreno y luego actualizar el estado post-producción

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
