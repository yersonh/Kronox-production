#!/bin/bash
php artisan migrate --force
php artisan schedule:work &
php artisan queue:work --tries=1 --timeout=0 &
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
