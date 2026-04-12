# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-11
- foco activo: contrato de módulos tenant y bootstrap financiero por vertical
- prioridad inmediata: abrir el ajuste fino `maintenance -> finance`
- módulo o frente activo: `platform-core` + `finance` + `maintenance`

## Último contexto útil

- `Provisioning/DLQ` ya quedó cerrado para esta etapa; no volver por inercia
- `maintenance` ya es módulo contractual propio en backend y tenant portal
- el bootstrap tenant ya siembra categorías financieras distintas para `empresa` y `condominio/hogar`
- `staging` ya quedó publicado con backend/frontend actualizados
- el smoke tenant-side de sidebar por módulos ya pasó en `staging`
- `production` ya quedó publicado con backend/frontend actualizados
- el smoke tenant-side de sidebar por módulos ya pasó en `production`
- el repo ya quedó validado con unittest backend, build frontend y `playwright --list`

## Bloqueo actual

- no hay bloqueo técnico
- la única deuda visible antes del siguiente slice es la validación visible del bootstrap financiero vertical creando tenants nuevos de prueba

## Siguiente acción inmediata

- abrir el siguiente slice de autollenado entre `maintenance` y `finance`
- dejar como validación complementaria posterior:
  - alta de tenant nuevo `empresa`
  - alta de tenant nuevo `condominio`
  - revisión de categorías sembradas por defecto

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/platform-core/DEV_GUIDE.md`
5. `docs/modules/finance/DEV_GUIDE.md`
