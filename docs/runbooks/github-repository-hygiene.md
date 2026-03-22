# GitHub Repository Hygiene

## Que si debe subirse

- codigo fuente de `backend/`
- codigo fuente de `frontend/`
- `docs/`
- `infra/`
- `deploy/`
- workflows en `.github/`
- ejemplos de configuracion como `/.env.example`
- capturas finales del manual visual en `docs/assets/app-visual-manual/`

## Que no debe subirse

- `/.env`
- `/.platform_installed`
- `platform_paas_venv/`
- `node_modules/`
- `frontend/dist/`
- `__pycache__/`
- caches de tests y coverage
- logs y archivos temporales

## Criterio practico

- si el archivo contiene secretos: no va a GitHub
- si se puede reconstruir con `npm install`, `uv sync` o `python -m ...`: no va a GitHub
- si es evidencia documental util y estable, como capturas finales del manual: si puede ir

## Antes de publicar

1. revisar `git status`
2. confirmar que no aparezcan `.env`, `venv`, `dist`, `node_modules` ni `__pycache__`
3. confirmar que las capturas en `docs/assets/app-visual-manual/` sean solo las finales
4. usar `/.env.example` como base publica y mantener `/.env` solo local
