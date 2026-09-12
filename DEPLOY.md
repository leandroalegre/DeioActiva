# Deploy de DeioActiva en sistemascloud.ar

Este documento es la guia paso a paso para publicar DeioActiva en el hosting
compartido `sistemascloud.ar` (cPanel + PM2), siguiendo el mismo patron que
ya usan `dnt.sistemascloud.ar` (rrhh-api) y `elecciones.sistemascloud.ar`.

## 0. Ya hecho (no repetir)

- [x] Subdominio `deioactiva.sistemascloud.ar` creado en cPanel
      (raiz: `/home/sistemacbahost/deioactiva.sistemascloud.ar`)
- [x] Base de datos `sistemacbahost_deioactiva` creada
- [x] Usuario `sistemacbahost_deioactiva_api` creado y asignado con todos los
      privilegios sobre esa base
- [x] `backend/.env` completado localmente (no se sube a git — ver `.gitignore`)

## 1. Push del codigo a GitHub

Desde tu maquina (PowerShell o Git Bash en `C:\Programacion\DeioActiva`):

```
git add -A
git commit -m "Preparar deploy: ecosystem.config.js, .htaccess, VITE_API_URL"
git push
```

## 2. Clonar el repo en el servidor

Entrar a **cPanel → Terminal** y ejecutar:

```
cd ~
git clone https://github.com/leandroalegre/DeioActiva.git deioactiva-src
cd deioactiva-src
```

(Si el repo es privado, `git clone` va a pedir usuario/token — usar un
Personal Access Token de GitHub como password.)

## 3. Backend

```
cd ~/deioactiva-src/backend
```

**Subir el `.env`**: como `.env` no viaja por git, hay que llevarlo al
servidor por otra via. La forma mas simple y segura es con el **File Manager**
de cPanel: entrar a `deioactiva-src/backend/`, subir (upload) tu archivo
`.env` local tal cual esta en tu compu. Asi la contraseña nunca se escribe a
mano en la terminal.

Despues, instalar dependencias y preparar la base:

```
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run seed
```

`npm run seed` crea el usuario admin con los datos de
`SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` del `.env`.

Levantar con PM2:

```
pm2 start ecosystem.config.js
pm2 save
pm2 logs deioactiva-api --lines 50
```

Verificar que responda localmente:

```
curl -i http://127.0.0.1:3001/api/health
```

(si no existe un endpoint `/health` todavia, probar `curl -i http://127.0.0.1:3001/api/auth/login`
solo para confirmar que el puerto contesta).

## 4. Frontend

```
cd ~/deioactiva-src/frontend
npm ci
npm run build
```

`npm run build` ya usa `frontend/.env.production` (`VITE_API_URL=/api`), asi
que el build queda apuntando al mismo dominio via el proxy de Apache — no
hace falta tocar nada mas.

Copiar el resultado a la raiz publica del subdominio:

```
cp -r dist/* /home/sistemacbahost/deioactiva.sistemascloud.ar/
```

## 5. .htaccess (proxy + SPA routing)

Copiar la plantilla que ya esta en el repo:

```
cp ~/deioactiva-src/deploy/htaccess-deioactiva.txt \
   /home/sistemacbahost/deioactiva.sistemascloud.ar/.htaccess
```

## 6. Probar

Abrir `https://deioactiva.sistemascloud.ar` en el navegador. Deberia cargar
el login de DeioActiva y poder loguearse con el usuario admin del seed.

Si algo no carga:
- `pm2 status` — confirmar que `deioactiva-api` esta `online`
- `pm2 logs deioactiva-api` — ver errores del backend
- Revisar que el puerto en `ecosystem.config.js`/`.env` (3001) no choque con
  otro proceso (`rrhh-api` usa 8001, los otros dos no se identificaron el
  puerto exacto — si 3001 esta ocupado, cambiar `PORT` en `.env` y en el
  `.htaccess` por otro libre, ej. 3002).

## 7. Redeploys futuros

```
cd ~/deioactiva-src
git pull
cd backend && npm ci && npx prisma migrate deploy && npm run build && pm2 restart deioactiva-api
cd ../frontend && npm ci && npm run build && cp -r dist/* /home/sistemacbahost/deioactiva.sistemascloud.ar/
```

## Pendiente / a decidir

- Activar "Force HTTPS Redirect" para el subdominio en cPanel → Dominios
  (hoy figura "Apagado").
- Evaluar si conviene mover el refresh token de `localStorage` a una cookie
  httpOnly antes de un uso real con usuarios (ver nota en `api-client.ts`).
