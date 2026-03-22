# Backend HTTPS con Nginx

Esta guia deja una base minima para exponer el backend con HTTPS real usando `nginx` y certificados de Let's Encrypt.

No sustituye una politica completa de edge o WAF. El objetivo es pasar de proxy HTTP basico a una configuracion razonable para produccion inicial.

## Archivo Base

- `infra/nginx/platform-paas-backend-ssl.conf`

## Que Resuelve

- redireccion HTTP `80 -> 443`
- terminacion TLS en `nginx`
- reenvio del trafico a `uvicorn` en `127.0.0.1:8000`
- conservacion de `X-Request-ID`
- headers basicos de hardening

## Ajustes Obligatorios

Antes de usar la plantilla, cambiar:

- `server_name`
- `ssl_certificate`
- `ssl_certificate_key`

La plantilla viene con:

- `example.com`
- `/etc/letsencrypt/live/example.com/fullchain.pem`
- `/etc/letsencrypt/live/example.com/privkey.pem`

## Flujo Sugerido con Certbot

1. apuntar DNS del dominio al servidor
2. instalar `nginx` y `certbot`
3. publicar temporalmente el server block HTTP
4. emitir certificado
5. activar la configuracion HTTPS final

Ejemplo orientativo:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Luego:

```bash
sudo certbot certonly --nginx -d example.com -d www.example.com
```

Despues:

```bash
sudo cp infra/nginx/platform-paas-backend-ssl.conf /etc/nginx/sites-available/platform-paas-backend.conf
sudo ln -sf /etc/nginx/sites-available/platform-paas-backend.conf /etc/nginx/sites-enabled/platform-paas-backend.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Renovacion Automatica

Archivos plantilla:

- `infra/systemd/platform-paas-certbot-renew.service`
- `infra/systemd/platform-paas-certbot-renew.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-certbot-renew.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-certbot-renew.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-certbot-renew.timer
sudo systemctl list-timers | grep platform-paas-certbot-renew
```

Validacion manual:

```bash
sudo certbot renew --dry-run
sudo systemctl status platform-paas-certbot-renew.timer --no-pager
```

## Validacion Minima

```bash
curl -I http://example.com
curl -I https://example.com/health
sudo nginx -t
```

Resultado esperado:

- `http://example.com` redirige a `https://example.com`
- `https://example.com/health` responde `200`

## Notas Operativas

- si usas otro proxy o balanceador delante de `nginx`, revisar `X-Forwarded-*`
- el header `HSTS` se debe mantener solo cuando HTTPS ya es estable
- si frontend y backend luego se separan por dominio, esta configuracion debe dividirse

## Guia Relacionada

- `docs/deploy/backend-debian.md`
