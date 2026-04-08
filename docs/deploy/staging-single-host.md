# Staging Single-Host

Guia operativa del entorno `staging/test` montado en el mismo mini PC que produccion.

## Objetivo

- validar cambios sin tocar `production`
- tener una ruta previa para smoke funcional y E2E manual
- conservar la posibilidad de probar bootstrap inicial en un entorno controlado

## Topologia actual

- arbol staging: `/opt/platform_paas_staging`
- backend staging: `127.0.0.1:8200`
- frontend staging publicado por `nginx`: `http://192.168.7.42:8081`
- servicio `systemd`: `platform-paas-backend-staging`
- sitio `nginx`: `platform-paas-staging-local.conf`

## Validaciones base ya aprobadas

- baseline backend bajo `.env.staging`: `510 tests OK`
- `GET http://127.0.0.1:8200/health`: OK
- `GET http://127.0.0.1:8081/health`: OK
- SPA servida por `nginx` en `8081`: OK
- smoke browser opt-in del instalador en modo bootstrap: `1 passed`

## Modos validos del staging

El staging puede operar en dos modos distintos:

### 1. Espejo instalado

- existe `/opt/platform_paas_staging/.platform_installed`
- la UI entra al flujo normal del producto
- sirve para regresion funcional antes de tocar `production`

### 2. Bootstrap reset

- no existe `.platform_installed`
- `/health` responde con `"installed": false`
- el frontend termina en el flujo `/install`
- sirve para ensayar la instalacion inicial desde cero
- este modo ya quedó validado de punta a punta en backend y browser

## Cuando usar este staging

Usarlo para:

- regresion funcional previa a produccion
- smoke manual de modulos
- pruebas browser sobre una URL estable del mini PC
- validacion de deploy sin tocar `orkestia.ddns.net`

## Si quieres probar bootstrap inicial desde cero

La ruta canonica ya no es manual.

Usar:

- [reset_staging_bootstrap.sh](/home/felipe/platform_paas/deploy/reset_staging_bootstrap.sh)
- [Reset Bootstrap de Staging](./staging-bootstrap-reset.md)

Ese reset no debe dispararse por sorpresa si el staging se esta usando para regresion funcional.

## Relacion con otros entornos del mini PC

- desarrollo:
  - backend `8100`
  - frontend `5173`
- staging:
  - backend `8200`
  - frontend publicado por `nginx` en `8081`
- produccion:
  - backend `8000`
  - publicacion HTTPS en `https://orkestia.ddns.net`

## Regla practica

Mantener dos usos distintos:

- `staging espejo`: para validar la app ya instalada
- `bootstrap reset`: solo cuando haya que ensayar instalacion inicial

Para volver desde bootstrap a espejo:

- [restore_staging_mirror.sh](/home/felipe/platform_paas/deploy/restore_staging_mirror.sh)
- [Restaurar Staging a Espejo](./staging-restore-mirror.md)

Si al terminar una iteracion cambias el modo real del staging, debes actualizar los archivos raíz de continuidad.
