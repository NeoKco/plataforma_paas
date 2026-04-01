# Backend Debian

Esta guia deja una base minima para operar el backend de `platform_paas` en un servidor Debian usando `systemd` y `nginx`.

No intenta cubrir alta disponibilidad ni orquestacion. El objetivo es dejar un despliegue reproducible y razonable para una primera operacion real.

## Piezas Base

Archivos ejemplo incluidos en el repositorio:

- `infra/env/backend.development.example.env`
- `infra/env/backend.staging.example.env`
- `infra/systemd/platform-paas-backend.service`
- `infra/systemd/platform-paas-certbot-renew.service`
- `infra/systemd/platform-paas-certbot-renew.timer`
- `infra/systemd/platform-paas-provisioning-worker.service`
- `infra/systemd/platform-paas-provisioning-worker.timer`
- `infra/systemd/platform-paas-provisioning-worker@.service`
- `infra/systemd/platform-paas-provisioning-worker@.timer`
- `infra/nginx/platform-paas-backend.conf`
- `infra/nginx/platform-paas-backend-ssl.conf`
- `infra/env/backend.production.example.env`
- `deploy/deploy_backend.sh`
- `deploy/validate_backend_env.sh`
- `deploy/verify_backend_deploy.sh`
- `deploy/deploy_backend_staging.sh`
- `deploy/deploy_backend_production.sh`
- `deploy/rollback_backend.sh`
- `deploy/install_provisioning_worker_profile_units.sh`
- `deploy/run_provisioning_worker_profile.sh`

## Suposiciones

La plantilla asume esta estructura en servidor:

```text
/opt/platform_paas/
├── backend/
├── platform_paas_venv/
└── .env
```

Y asume que el backend corre asi:

- `uvicorn`
- escuchando en `127.0.0.1:8000`
- detras de `nginx`

## 1. Preparar `.env`

Tomar como base:

- `infra/env/backend.production.example.env`

Copiarlo al servidor como:

- `/opt/platform_paas/.env`

Ajustes minimos obligatorios:

- `DEBUG=false`
- `APP_ENV=production`
- `CONTROL_DB_*`
- `POSTGRES_ADMIN_PASSWORD`
- `JWT_SECRET_KEY`

## 2. Instalar unidad `systemd`

Archivo origen:

- `infra/systemd/platform-paas-backend.service`

Destino sugerido:

- `/etc/systemd/system/platform-paas-backend.service`

Campos a revisar antes de habilitar:

- `User`
- `Group`
- `WorkingDirectory`
- `EnvironmentFile`
- `ExecStart`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-backend.service /etc/systemd/system/platform-paas-backend.service
sudo systemctl daemon-reload
sudo systemctl enable platform-paas-backend
sudo systemctl start platform-paas-backend
```

## 3. Instalar `nginx`

Archivo origen:

- `infra/nginx/platform-paas-backend.conf`

Destino sugerido:

- `/etc/nginx/sites-available/platform-paas-backend.conf`

Comandos tipicos:

```bash
sudo cp infra/nginx/platform-paas-backend.conf /etc/nginx/sites-available/platform-paas-backend.conf
sudo ln -s /etc/nginx/sites-available/platform-paas-backend.conf /etc/nginx/sites-enabled/platform-paas-backend.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Migrar y reiniciar

Script base incluido:

- `deploy/deploy_backend.sh`

Ese script:

- instala dependencias backend
- valida variables obligatorias antes de ejecutar
- ejecuta migraciones de control
- corre pruebas backend base sin smoke HTTP ni PostgreSQL
- reinicia el servicio `systemd`
- verifica el healthcheck antes de terminar
- encola auto-sync post-deploy de schema tenant para tenants activos con DB configurada
- recolecta evidencia operativa al cerrar el gate post-deploy, incluso si la verificacion falla

Variables ajustables del script:

- `PROJECT_ROOT`
- `VENV_PYTHON`
- `SERVICE_NAME`
- `ENV_FILE`
- `EXPECTED_APP_ENV`
- `HEALTHCHECK_URL`
- `BACKEND_AUTO_SYNC_POST_DEPLOY`
- `BACKEND_AUTO_SYNC_LIMIT`
- `COLLECT_OPERATIONAL_EVIDENCE`

Ejemplo:

```bash
PROJECT_ROOT=/opt/platform_paas SERVICE_NAME=platform-paas-backend bash deploy/deploy_backend.sh
```

Ejemplo usando archivo de entorno explicito:

```bash
PROJECT_ROOT=/opt/platform_paas ENV_FILE=/opt/platform_paas/.env bash deploy/deploy_backend.sh
```

Ejemplo deshabilitando el auto-sync masivo post-deploy:

```bash
PROJECT_ROOT=/opt/platform_paas \
BACKEND_AUTO_SYNC_POST_DEPLOY=false \
bash deploy/deploy_backend.sh
```

Wrappers por entorno:

```bash
bash deploy/deploy_backend_staging.sh
bash deploy/deploy_backend_production.sh
```

## 5. Validacion Minima

Despues del despliegue, validar al menos:

```bash
curl http://127.0.0.1/health
systemctl status platform-paas-backend --no-pager
sudo journalctl -u platform-paas-backend -n 50 --no-pager
```

## Notas Operativas

- la unidad `systemd` del repo usa valores plantilla; no asumir que sirven sin ajuste
- el script de despliegue esta pensado para actualizaciones manuales asistidas, no como CD completo
- `nginx` ya reenvia `X-Request-ID`, lo que ayuda a conservar trazabilidad en logs y errores
- para HTTPS real, usar la plantilla `infra/nginx/platform-paas-backend-ssl.conf`
- para renovacion de certificados, usar `infra/systemd/platform-paas-certbot-renew.timer`
- para procesar `provisioning_jobs` fuera de HTTP, usar `infra/systemd/platform-paas-provisioning-worker.timer`
- para separar cadencias por perfil de worker, usar `deploy/install_provisioning_worker_profile_units.sh`
- el deploy ahora falla rapido si faltan variables criticas o si el entorno no coincide con el wrapper usado
- el verify post-deploy ahora tambien puede dejar ya encolado el sync de schema tenant sin depender de una corrida manual posterior

## Siguiente Evolucion Natural

- separar backend y frontend si el despliegue empieza a crecer
- reforzar el deploy con pasos mas cercanos a CD real
- agregar pipeline de deploy mas automatizado
- mover secretos fuera de `.env` cuando el entorno lo permita

Guia relacionada:

- `docs/deploy/postgres-backup-and-restore.md`
- `docs/deploy/external-backup-sync.md`
- `docs/deploy/backend-https-nginx.md`
- `docs/deploy/backend-post-deploy-verification.md`
- `docs/deploy/backend-release-and-rollback.md`
- `docs/deploy/environment-strategy.md`
- `docs/deploy/provisioning-worker.md`
