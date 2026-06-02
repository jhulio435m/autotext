# Despliegue de Autotext

## Arquitectura

- `autotext` corre como un solo contenedor Node.
- El contenedor sirve:
  - frontend compilado (`dist`)
  - API Express (`/api`)
- Se conecta a:
  - `plane_default` para leer `plane-db`
  - `autoexp_default` para usar `expedientes-db`
- `cloudflared` publica el subdominio `autotext.urriburuleon.com`.

## Levantar el servicio

```bash
cd /home/yeul/autotext
docker compose up -d --build
```

## Verificar localmente

```bash
curl http://127.0.0.1:4010/api/health
curl -I http://127.0.0.1:4010/
```

## Publicación con Cloudflare Tunnel

Se agregó este ingress en `/home/yeul/cloudflared/config.yml`:

```yml
- hostname: autotext.urriburuleon.com
  service: http://autotext:4000
```

Como `autotext` comparte la red `plane_default`, `cloudflared` puede resolver ese contenedor por nombre.

Luego reinicia el tunnel:

```bash
cd /home/yeul/cloudflared
docker compose up -d
```

## Actualizar una nueva versión

```bash
cd /home/yeul/autotext
docker compose up -d --build
```
