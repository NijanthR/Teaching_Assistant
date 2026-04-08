FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY . /app

# Hugging Face Spaces expects the app to listen on port 7860 by default.
ENV PORT=7860
EXPOSE 7860

RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
