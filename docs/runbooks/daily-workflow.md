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
- volver a `Platform Admin`

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

### Cambio que afecta ambos lados

Mínimo:

1. `npm run build`
2. `python -m compileall app`
3. prueba funcional corta del flujo afectado

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

## 8. Regla para capturas

Cuando una prueba genere capturas útiles:

1. guárdalas en `docs/assets/app-visual-manual/`
2. usa nombres temporales `pending_XX.png`
3. revísalas antes de borrar o renombrar
4. conserva solo las que realmente aportan

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
