# Frontend Estático con Nginx

Esta guía deja una base mínima para publicar el frontend de `platform_paas` como SPA estática con `nginx`.

La recomendación operativa actual es simple:

- frontend en un host o subdominio web, por ejemplo `https://app.example.com`
- backend API en otro host o subdominio, por ejemplo `https://api.example.com`

Eso evita mezclar la SPA con las rutas backend ya expuestas en `/`, `/platform/*`, `/tenant/*` y `/health`.

## Archivos base

- `deploy/build_frontend.sh`
- `infra/nginx/platform-paas-frontend.conf`
- `infra/nginx/platform-paas-frontend-ssl.conf`
- `frontend/.env.example`

## 1. Construir el frontend

El build debe quedar apuntando a la URL pública real de la API.

Ejemplo:

```bash
cd /opt/platform_paas
API_BASE_URL=https://api.example.com \
bash deploy/build_frontend.sh
```

Ese script:

- instala dependencias si hace falta
- exporta `VITE_API_BASE_URL`
- ejecuta `npm run build`
- valida que exista `frontend/dist/index.html`

## 2. Qué variable importa

La variable crítica del build es:

- `VITE_API_BASE_URL`

Ejemplo típico productivo:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

Si no se define, el frontend intentará deducir una URL tipo `http(s)://<host>:8000`, útil para desarrollo pero no recomendable para producción pública.

## 3. Publicar `dist/` con `nginx`

Plantilla base sin TLS:

- `infra/nginx/platform-paas-frontend.conf`

Plantilla base con TLS:

- `infra/nginx/platform-paas-frontend-ssl.conf`

La plantilla asume:

```text
/opt/platform_paas/frontend/dist
```

Comandos típicos:

```bash
sudo cp infra/nginx/platform-paas-frontend.conf /etc/nginx/sites-available/platform-paas-frontend.conf
sudo ln -s /etc/nginx/sites-available/platform-paas-frontend.conf /etc/nginx/sites-enabled/platform-paas-frontend.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Validación mínima

Después de publicar el build:

- abrir `/`
- recargar una ruta interna de SPA como `/platform-admin/dashboard`
- confirmar que el navegador carga `index.html` y no devuelve `404`
- confirmar login `platform_admin`
- confirmar login `tenant_portal`
- confirmar que el frontend apunta a la API correcta

## 5. Relación con backend

Esta guía publica solo la SPA.

El backend se mantiene por separado con:

- `docs/deploy/backend-debian.md`
- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/backend-release-and-rollback.md`

## 6. Recomendación práctica actual

Para una primera salida a terreno, la separación más simple y segura es:

- `app.example.com` → SPA estática
- `api.example.com` → backend FastAPI detrás de `nginx`

Luego el build del frontend debe salir con:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

## Guías relacionadas

- `docs/deploy/backend-debian.md`
- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/backend-https-nginx.md`
- `docs/deploy/functional-release-checklist.md`