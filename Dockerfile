# Stage 1: Build the React frontend production bundle
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend configuration and source code
COPY frontend/ ./

# Build production assets into frontend/dist
RUN npm run build

# Stage 2: Production Python runtime
FROM python:3.12-slim AS runtime
WORKDIR /app

# Ensure unbuffered stdout/stderr logging for Cloud Run logs
ENV PYTHONUNBUFFERED=1 \
    PORT=8080

# Install backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application code and sample datasets
COPY backend/ ./backend/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose default Cloud Run port
EXPOSE 8080

# Start FastAPI application with Uvicorn
CMD exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8080}
