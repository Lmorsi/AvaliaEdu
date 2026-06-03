FROM python:3.12-slim

# System dependencies for OpenCV and pyzbar
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Railway injeta $PORT; fallback para 8000 no desenvolvimento local
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
