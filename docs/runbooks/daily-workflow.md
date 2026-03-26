# Flujo Diario de Trabajo

Este runbook deja una rutina corta para trabajar en `platform_paas` sin tener que reconstruir cada vez el orden correcto.

No reemplaza la documentación técnica. Sirve como guía operativa diaria.

## 1. Antes de empezar

Verifica estas tres cosas:

1. backend levantado
2. frontend levantado
3. `GET /health` respondiendo

Si no recuerdas el contexto del producto, empieza por:

- [Guia unica para entender la app](../architecture/app-understanding-guide.md)

## 2. Arranque mínimo

### Backend

```bash
cd /home/felipe/platform_paas/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd /home/felipe/platform_paas/frontend
npm run dev -- --host 0.0.0.0 --port 4173
```

### Verificación rápida

- backend: `http://127.0.0.1:8000/health`
- frontend: `http://127.0.0.1:4173`

Si `installed=false`, el flujo correcto es:

- completar `/install`
- definir la cuenta raiz inicial
- guardar la clave de recuperacion
- volver a `Platform Admin`

Si vas a levantar la app con `APP_ENV=production`, revisa antes:

- `JWT_SECRET_KEY`
- `CONTROL_DB_PASSWORD`
- `POSTGRES_ADMIN_PASSWORD`
- cualquier `TENANT_BOOTSTRAP_DB_PASSWORD_*`

La plataforma ya rechaza en runtime passwords bootstrap tenant de demo o demasiado cortas cuando corre en `production`.

## 3. Baseline de demo recomendado

Si vas a trabajar frontend o pruebas guiadas, deja primero el baseline estable:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.seed_frontend_demo_baseline
```

Eso deja una base más predecible para:

- `Tenants`
- `Provisioning`
- `Billing`
- `tenant_portal`

Referencia:

- [Demo data y seeds de desarrollo](./demo-data.md)

## 4. Orden recomendado de trabajo

Cuando no tengas claro por dónde empezar, usa este orden:

1. entender el comportamiento actual
2. revisar documentación existente
3. tocar backend o frontend
4. validar con build o tests
5. actualizar documentación si el cambio fue relevante

## 5. Qué validar según el tipo de cambio

### Cambio de frontend puro

Mínimo:

```bash
cd /home/felipe/platform_paas/frontend
npm run build
```

### Cambio de backend puro

Mínimo:

```bash
cd /home/felipe/platform_paas/backend
python -m compileall app
```

Si toca reglas o flujo importante:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/run_backend_tests.py --skip-http-smoke
```

Si el cambio cae sobre billing, provisioning o enforcement tenant, conviene correr al menos la suite puntual:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest \
  app.tests.test_platform_flow \
  app.tests.test_tenant_flow
```

### Cambio que afecta ambos lados

Mínimo:

1. `npm run build`
2. `python -m compileall app`
3. prueba funcional corta del flujo afectado

Si el cambio además toca reglas visibles de negocio:

4. correr `app.tests.test_platform_flow` y/o `app.tests.test_tenant_flow` segun corresponda

Si el cambio cae sobre `Billing` o `Provisioning` como consola operativa:

5. verificar que siga siendo claro:
   - que acciones requieren confirmacion
   - que feedback muestra cada accion
   - que la pantalla permita distinguir deuda operativa real de ruido historico

Si el cambio cae sobre `Actividad`:

5. verificar que siga siendo claro:
   - que `Que revisar ahora` siga siendo breve y accionable
   - que los filtros de cambios tenant por tipo y actor no rompan la lectura general
   - que `support` siga fuera de este bloque tanto en menu como por URL directa

Si el cambio cae sobre secretos, recovery o endurecimiento de entorno:

5. verificar en `Configuracion`:
   - `Instalacion y cuenta raiz`
   - `Postura de secretos y runtime`
6. confirmar que el runtime no quede marcado como listo para produccion si siguen defaults inseguros o passwords bootstrap tenant debiles
7. si la DB tenant ya esta materializada y tocaste secretos tecnicos:
   - validar que `Tenants` siga mostrando `Rotar credenciales tecnicas`
   - validar que la accion no afecte el acceso del portal tenant

Si el cambio toca especificamente el ciclo basico del tenant:

5. correr `app.tests.test_platform_flow`
6. validar al menos una secuencia corta:
   - crear tenant
   - archivar tenant
   - restaurar tenant
7. si la DB tenant ya existe y algo sigue raro:
   - revisar en `Tenants` la lectura de esquema tenant antes de asumir que faltan tablas o que el provisioning no corrió

## 6. Cuándo hacer prueba manual

No conviene hacer exploración manual larga todo el tiempo.

Haz prueba manual cuando:

- abriste una pantalla nueva
- cambiaste enforcement real
- cambiaste login, auth o sesión
- tocaste `Provisioning`, `Billing` o `tenant_portal`
- el cambio necesita capturas para documentación

Si no, prefiere:

- build
- tests
- revisión rápida focalizada

## 7. Regla de documentación

Si el cambio:

- corrige un bug real
- valida una prueba guiada
- cambia UX de una pantalla importante
- agrega una nueva ruta operativa

entonces debe quedar documentado.

Ruta recomendada:

- arquitectura: `docs/architecture/`
- procedimiento o prueba: `docs/runbooks/`
- capturas: `docs/assets/app-visual-manual/`

Prioridad actual:

1. documentacion escrita
2. notas de seguimiento sobre lo visual
3. capturas solo cuando la pantalla ya este estable o cuando la evidencia visual sea realmente necesaria

La regla operativa ahora es simple:

- no detener avance de producto para perseguir capturas si la UI aun esta cambiando
- dejar por escrito que se valido, que falta y que deberia recapturarse mas adelante
- hacer la recaptura visual fuerte solo cuando el bloque ya no este moviendose tanto

## 8. Regla para capturas

Cuando una prueba genere capturas utiles:

1. guárdalas en `docs/assets/app-visual-manual/`
2. usa nombres temporales `pending_XX.png`
3. revísalas antes de borrar o renombrar
4. conserva solo las que realmente aportan

Pero hoy la prioridad no es llenar el repo de imagenes.

Hazlo solo si ocurre una de estas dos cosas:

- la captura documenta un comportamiento importante que no se entiende bien solo con texto
- la pantalla ya esta suficientemente estable y no deberia recapturarse enseguida

Si no, deja solo:

- documentacion escrita
- nota corta de recaptura pendiente
- referencia al flujo validado

## 9. Si algo falla

Orden corto de diagnóstico:

1. `GET /health`
2. revisar si la sesión sigue vigente
3. revisar `request_id` en UI o backend
4. distinguir si es:
   - error real de red
   - error de auth
   - error de negocio
   - error de provisioning o billing

Caso puntual ya conocido:

- si `health` responde y `Settings` igual cae en rojo, revisa `GET /platform/auth/root-recovery/status`
- esa ruta ya debe responder sin sesion porque forma parte del flujo publico de recuperacion raiz
- si esa ruta falla, `Settings` ya no deberia colapsar completa; el warning debe quedar acotado al bloque de cuenta raiz

Apoyos:

- [Onboarding de developers](./developer-onboarding.md)
- [Pruebas backend](./backend-tests.md)
- [Manejo de errores backend](./backend-error-handling.md)

## 10. Cierre del día

Antes de cerrar una sesión de trabajo:

1. deja el cambio validado
2. deja la documentación actualizada si correspondía
3. deja pendientes reales anotados en roadmap o baseline
4. evita dejar capturas `pending_*.png` sueltas si ya fueron procesadas
5. si no hubo captura porque la UI sigue cambiando, deja la nota de recaptura pendiente en la documentacion correspondiente
