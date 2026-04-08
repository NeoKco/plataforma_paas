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
- foco activo: continuidad entre IAs + preparación de salida a producción
- prioridad inmediata: confirmar si ya existe host productivo real antes de abrir trabajo nuevo
- módulo o frente activo: transversal / deploy / handoff

## Último contexto útil

- `finance` quedó cerrado en su alcance actual
- `business-core` y `maintenance` quedaron operativos en su primer corte y alineados al frente transversal
- el backlog residual editorial no bloquea salida a terreno
- el proyecto quedó en estado "listo para salir", pero este workspace no es todavía el host productivo real

## Bloqueo actual

- no existe host productivo confirmado dentro de este workspace
- no existe unidad `platform-paas-backend` en este host
- el `.env` local no representa producción real

## Siguiente acción inmediata

Responder primero esta pregunta:

- ¿ya existe un host productivo real listo para recibir el deploy?

Si la respuesta es `sí`:

- ir a preflight backend
- preflight frontend
- cutover
- smoke corto de terreno

Si la respuesta es `no`:

- no simular producción desde este workspace
- preparar paquete operativo para el host real
- o retomar backlog residual explícito

## Archivos a leer justo después de este

1. `PROMPT_MAESTRO_MODULO.md`
2. `ESTADO_ACTUAL.md`
3. `SIGUIENTE_PASO.md`
4. `HANDOFF_STATE.json`

## Última verificación útil conocida

- baseline backend: OK
- build frontend: OK
- preflight frontend local: OK
- preflight backend local: bloqueado por entorno no productivo
