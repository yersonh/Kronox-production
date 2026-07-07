# ─── Stage 1: Build frontend assets ────────────────────────────────────────────
FROM node:22-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: PHP application ───────────────────────────────────────────────────
# serversideup/php ships with all extensions pre-compiled (bcmath, mbstring,
# pdo_pgsql, pdo_sqlite, zip, gd, intl, etc.) and Composer included.
# No source compilation — build takes seconds instead of minutes.
FROM serversideup/php:8.4-cli

WORKDIR /var/www/html

USER root

COPY . .
COPY --from=node-builder /app/public/build ./public/build

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod +x start.sh

COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

EXPOSE 8000

CMD ["bash", "start.sh"]
