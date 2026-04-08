# SIGUIENTE_PASO

## Última actualización

- fecha: 2026-04-07
- prioridad vigente: validar externamente y endurecer la producción ya levantada en `orkestia.ddns.net`

## Objetivo del próximo paso

No abrir más trabajo de producto.

El siguiente paso correcto es mover el proyecto desde estado "desplegado técnicamente" a estado "validado externamente y endurecido para operación real".

## Prioridad inmediata

### 1. Validar acceso externo real

Desde un navegador fuera del shell local:

- abrir `http://orkestia.ddns.net`
- confirmar login `platform_admin`
- confirmar login `tenant_portal`

### 2. Endurecer transporte

Elegir una de estas dos rutas:

- emitir TLS para `orkestia.ddns.net` y mantener single-host
- o separar después `app/api` si ya tienes DNS adicional

### 3. Si cambia el origen público a HTTPS

Reconstruir frontend con la URL pública final:

- `API_BASE_URL=https://orkestia.ddns.net bash deploy/build_frontend.sh`
- `EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh`

### 4. Ejecutar smoke corto de terreno

Seguir:

- `docs/deploy/production-cutover-checklist.md`

## Orden exacto recomendado

1. leer `PROJECT_CONTEXT.md`
2. leer `SESION_ACTIVA.md`
3. leer `PROMPT_MAESTRO_MODULO.md`
4. leer `ESTADO_ACTUAL.md`
5. leer `REGLAS_IMPLEMENTACION.md`
6. verificar desde navegador real `http://orkestia.ddns.net`
7. decidir si se emitirá TLS sobre ese mismo host
8. si cambia a HTTPS, reconstruir frontend con la URL final
9. ejecutar smoke corto de terreno
10. actualizar `ESTADO_ACTUAL.md` con resultado final post-cutover

## Qué debe actualizar la próxima IA al cerrar

Si completa la validación externa / endurecimiento:

- actualizar `ESTADO_ACTUAL.md`
- reescribir este archivo con nuevo siguiente paso post-producción
- dejar evidencia documental del cutover real

Si no completa la validación externa / endurecimiento:

- declarar bloqueo exacto
- actualizar `ESTADO_ACTUAL.md`
- dejar este archivo apuntando al paso siguiente verdadero, no al deseado

## Qué debe hacer otra IA al retomar

Antes de escribir código funcional, debe decidir cuál es la realidad operativa:

- producción ya está publicada técnicamente en `orkestia.ddns.net`
- lo pendiente es validación externa, TLS y cierre de evidencia

## Regla de cierre de la próxima iteración

La próxima iteración debe terminar con una de estas dos salidas claras:

### Salida A

- `orkestia.ddns.net` validado externamente y con siguiente endurecimiento definido

### Salida B

- bloqueo explícito de DNS/TLS/navegador, con estado y runbook actualizados

No cerrar la próxima iteración con un estado intermedio confuso.

## Regla práctica final

Si la próxima IA no sabe en los primeros minutos si debe desplegar o volver al backlog residual, entonces primero debe actualizar el estado antes de tocar código.

Y si una iteración importante cambia el estado real del proyecto, estos archivos raíz también deben actualizarse antes de cerrar esa iteración.

## Señal de que ya se puede reemplazar este archivo

Este archivo debería reescribirse cuando:

- se cierre la validación externa real
- se active TLS definitivo o se separen `app/api`
- el foco pase de cutover a estabilización post-terreno
