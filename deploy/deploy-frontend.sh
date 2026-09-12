#!/bin/bash
# deploy-frontend.sh — pull, build y publica el frontend de DeioActiva en un solo paso.
#
# Uso (parado en cualquier lado, en la Terminal de cPanel):
#   bash ~/deioactiva-src/deploy/deploy-frontend.sh
#
# Reemplaza la secuencia manual de comandos (git pull / npm run build / cp) por un
# unico comando, para evitar los problemas de pegado multi-linea en la Terminal de
# cPanel (comandos que se unen entre si al pegar varias lineas seguidas).
#
# Tambien limpia los assets viejos del docroot antes de copiar los nuevos: Vite genera
# un hash distinto por build (index-XXXXXXXX.js/css), asi que sin esta limpieza los
# archivos de builds anteriores quedan huerfanos en el servidor ocupando espacio.

set -euo pipefail

REPO_DIR="$HOME/deioactiva-src"
DOCROOT="/home/sistemacbahost/deioactiva.sistemascloud.ar"

echo "== git pull =="
cd "$REPO_DIR"
git pull

echo "== npm ci + build (frontend) =="
cd "$REPO_DIR/frontend"
npm ci
npm run build

echo "== limpiando assets viejos del docroot =="
rm -rf "$DOCROOT/assets"

echo "== copiando build nuevo =="
cp -r dist/* "$DOCROOT/"

echo "== listo =="
echo "index.html publicado:"
grep -o 'assets/index-[A-Za-z0-9_-]*\.\(js\|css\)' "$DOCROOT/index.html"
