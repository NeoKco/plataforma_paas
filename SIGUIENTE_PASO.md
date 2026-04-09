# SIGUIENTE_PASO

## Última actualización

- fecha: 2026-04-09
- prioridad vigente: continuar el frente explícito `platform-core hardening + E2E` sobre `Provisioning`, estabilizando el nuevo corte de investigación DLQ antes de subirlo a `production`

## Objetivo del próximo paso

No reabrir frentes ya cerrados:

- `Nuevo tenant`
- `tenant data portability CSV` base
- `acceso tenant más profundo desde Tenants` para abrir `Provisioning`

Esos frentes ya quedaron:

- implementados en repo
- desplegados en `staging`
- desplegados en `production`
- validados visualmente por smoke browser

El siguiente frente explícito ya fue elegido:

- `platform-core hardening + E2E`
- con foco en `Provisioning`
- con foco en DLQ
- con foco restante en recuperación fina, observabilidad visible y filtros DLQ dentro de `Provisioning`
- con un corte ya abierto en `repo + staging`: `Investigar en DLQ` desde `Fallos por código` y `Alertas activas`

## Prioridad inmediata

### 1. Mantener estable lo ya cerrado

- `Nuevo tenant` con admin inicial explícito
- preview de módulos por `plan`
- bloque `Plan y módulos`
- `tenant data portability CSV` ya validado en `staging` y `production`
- `APP_ENV=production` real en el host productivo
- `staging` operando como espejo instalado por defecto
- `provisioning` productivo usando `TENANT_SECRETS_FILE` en vez de depender de escritura sobre `/opt/platform_paas/.env`
- backup PostgreSQL tenant como respaldo técnico canónico

### 2. Usar `staging` como carril previo si el siguiente frente toca UI visible

Ya existe y sigue sano:

- backend `127.0.0.1:8200`
- frontend `http://192.168.7.42:8081`
- árbol `/opt/platform_paas_staging`
- servicio `platform-paas-backend-staging`

### 3. Implementar el siguiente frente explícito ya elegido

La próxima iteración ya no debe volver a decidir el frente.

Debe avanzar sobre:

- hardening operativo y browser de `Provisioning`
- recuperación / requeue / DLQ visibles
- sin reabrir el salto `Tenants -> Provisioning`, que ya quedó validado
- cerrar la estabilización del smoke `platform-admin-provisioning-dlq-investigation`
- solo después promover este corte a `production`

## Orden exacto recomendado

1. leer `PROJECT_CONTEXT.md`
2. leer `SESION_ACTIVA.md`
3. leer `PROMPT_MAESTRO_MODULO.md`
4. leer `ESTADO_ACTUAL.md`
5. leer `REGLAS_IMPLEMENTACION.md`
6. confirmar que producción y staging siguen saludables
7. asumir cerrado el frente `tenant sidebar backend-driven`
8. asumir cerrado el frente `Nuevo tenant admin explícito + módulos por plan`
9. asumir cerrada la Fase 1 de export portable tenant
10. asumir cerrada la Fase 2 mínima de import controlado con `dry_run` y `apply`
11. continuar el frente central sin reabrir portabilidad base ni el salto tenant ya cerrado salvo necesidad explícita

## Qué debe actualizar la próxima IA al cerrar

Si abre un frente nuevo:

- actualizar `ESTADO_ACTUAL.md`
- reescribir este archivo con el nuevo siguiente paso real
- dejar explícito si quedó solo en repo, en `staging` o también en `production`

## Qué debe hacer otra IA al retomar

Antes de escribir código funcional, debe partir desde esta realidad operativa:

- producción ya está publicada y validada inicialmente con HTTPS en `orkestia.ddns.net`
- staging/test ya existe en el mismo mini PC
- el frente de `Nuevo tenant` ya quedó cerrado en entorno real
- el siguiente frente ya quedó elegido y sigue siendo `platform-core hardening + E2E` sobre `Provisioning` y DLQ

## Regla de cierre de la próxima iteración

La próxima iteración debe terminar con una de estas dos salidas claras:

### Salida A

- se avanza y valida un nuevo corte real del frente `platform-core hardening + E2E`

### Salida B

- se documenta un bloqueo real que impide abrir ese frente

No cerrar la próxima iteración con un estado intermedio tipo "ya casi".

## Regla práctica final

Si la próxima IA no sabe en los primeros minutos qué frente abrir, entonces primero debe actualizar el estado antes de tocar código.

Y si una iteración importante cambia el estado real del proyecto, estos archivos raíz también deben actualizarse antes de cerrar esa iteración.

## Señal de que ya se puede reemplazar este archivo

Este archivo debería reescribirse cuando:

- el siguiente corte de `platform-core hardening + E2E` cambie otra vez el foco real del proyecto
