#!/usr/bin/env bash
set -e

python manage.py migrate --noinput

# Use PORT from environment, defaulting to Hugging Face Spaces port.
exec daphne -b 0.0.0.0 -p "${PORT:-7860}" backend.asgi:application
