# Data Cleaning and Analysis

A web application for uploading, cleaning, analyzing, and assessing the quality
of Excel, CSV, and JSON data.

## Stack and repository layout

```text
backend/       Python 3.12 + FastAPI
frontend/      React + Vite (runs locally with Node.js)
PostgreSQL     Database, database name DATA_CLEANING
docker-compose.yml
```

## Local database

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Check its status with `docker compose ps`.
4. Stop it with `docker compose down` (data stays in the named volume).

The requested password `123456` is configured for local development only. Do
not expose this database to a network or reuse this password in deployment.
Do not commit `.env`, passwords, uploaded files, or local database files.

Run the frontend locally with `cd frontend`, `npm install`, then `npm run dev`.
Docker Compose is used for PostgreSQL only. Run the FastAPI backend locally
once its application files have been added.
