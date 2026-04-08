# Deploy Backend to Hugging Face Spaces

This backend is now configured for Docker-based deployment on Hugging Face Spaces.

## What was added

- `Dockerfile` for building/running Django backend
- `start.sh` startup script (runs migrations, then starts Daphne)
- `.dockerignore` to keep image clean
- HF-friendly defaults in `backend/settings.py`:
  - `ALLOWED_HOSTS` includes `.hf.space`
  - `CSRF_TRUSTED_ORIGINS` defaults to `https://*.hf.space`

## Steps

1. Create a new **Docker Space** in Hugging Face.
2. Upload/push the `backend/` folder contents to the Space repository.
3. In Space settings, set required environment variables:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=your-space-name.hf.space`
   - `CORS_ALLOW_ALL_ORIGINS=False`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
   - `CSRF_TRUSTED_ORIGINS=https://your-space-name.hf.space,https://your-frontend-domain.com`
   - Any API keys you use (`OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, etc.)
4. Deploy. The container listens on `PORT` (defaults to `7860` for HF Spaces).

## Notes

- SQLite (`db.sqlite3`) works for testing, but for production you should use PostgreSQL.
- If you later switch to Redis for Channels, set `REDIS_URL`.
