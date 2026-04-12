# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-11
- foco activo: contrato de módulos tenant y bootstrap financiero por vertical
- prioridad inmediata: decidir promoción a `production` de este corte o abrir enseguida el ajuste fino `maintenance -> finance`
- módulo o frente activo: `platform-core` + `finance` + `maintenance`

## Último contexto útil

- `Provisioning/DLQ` ya quedó cerrado para esta etapa; no volver por inercia
- `maintenance` ya es módulo contractual propio en backend y tenant portal
- el bootstrap tenant ya siembra categorías financieras distintas para `empresa` y `condominio/hogar`
- `staging` ya quedó publicado con backend/frontend actualizados
- el smoke tenant-side de sidebar por módulos ya pasó en `staging`
- el repo ya quedó validado con unittest backend, build frontend y `playwright --list`
- `production` todavía no tiene este corte publicado

## Bloqueo actual

- no hay bloqueo técnico
- la única decisión abierta es operativa: promover ahora a `production` o seguir primero con el slice `maintenance -> finance`

## Siguiente acción inmediata

- si se quiere cerrar el rollout, promover este corte a `production` y probar:
  - sidebar tenant con `maintenance` separado
  - alta de tenant nuevo `empresa`
  - alta de tenant nuevo `condominio`
- si no se promueve aún, abrir el siguiente slice de autollenado entre `maintenance` y `finance`

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/platform-core/DEV_GUIDE.md`
5. `docs/modules/finance/DEV_GUIDE.md`
