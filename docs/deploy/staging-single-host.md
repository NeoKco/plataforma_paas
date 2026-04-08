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

## Importante: modo actual del staging

Hoy `staging` esta levantado como espejo instalado del PaaS.

Eso significa:

- existe `/opt/platform_paas_staging/.platform_installed`
- la UI entra al flujo normal del producto
- no esta mostrando por defecto las pantallas iniciales de instalacion/bootstrap

## Cuando usar este staging

Usarlo para:

- regresion funcional previa a produccion
- smoke manual de modulos
- pruebas browser sobre una URL estable del mini PC
- validacion de deploy sin tocar `orkestia.ddns.net`

## Si quieres probar bootstrap inicial desde cero

No conviene reutilizar ciegamente este staging activo.

La ruta correcta es una de estas:

1. reset controlado del staging actual
2. segundo staging efimero solo para bootstrap

Reset controlado implica como minimo:

- detener `platform-paas-backend-staging`
- limpiar o recrear `platform_control_staging`
- remover `/opt/platform_paas_staging/.platform_installed`
- confirmar `PLATFORM_INSTALLED=false` en `.env.staging`
- volver a levantar backend y frontend staging

Ese reset no debe hacerse por sorpresa si el staging se esta usando para regresion funcional.

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
