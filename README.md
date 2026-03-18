# Appointment System

This repository contains a full-stack appointment booking application.

- `appointment-backend/` - NestJS backend API (PostgreSQL via TypeORM)
- `frontend/` - Next.js 13 frontend using React and TailwindCSS

## Quick start

1. **PostgreSQL**
   - Ensure PostgreSQL is running locally on port 5432.
   - Create a database named `appointment_db` or change the connection in `appointment-backend/src/app.module.ts`.
   - Default credentials: `postgres` / `1234` (adjust accordingly).

2. **Backend**

   ```bash
   cd appointment-backend
   npm install
   # run migrations / sync (TypeORM `synchronize: true` takes care of schema)
   npm run start:dev   # listens on http://localhost:5000
   ```

   The API exposes the following routes (protected routes require a valid JWT):
   - `POST /auth/register` - register user
   - `POST /auth/login` - login and receive token
   - `GET /users/profile` - current profile
   - `PATCH /users/profile` - update profile
   - `POST /appointments` - create appointment
   - `GET /appointments/my` - list your appointments
   - `GET /appointments` - list all (admin/staff)
   - `PATCH /appointments/:id` - update (status/comment or fields)
   - `DELETE /appointments/:id` - archive
   - `POST /appointments/export` - XLSX export (admin/staff)

3. **Frontend**
   ```bash
   cd frontend
   npm install
   # set API url if needed
   export NEXT_PUBLIC_API_URL=http://localhost:5000
   npm run dev
   ```
   Navigate to http://localhost:3000 and use the UI.

## Environment

The frontend reads `NEXT_PUBLIC_API_URL` for the backend base URL. It defaults to `http://localhost:5000`.

## Notes

- Authentication is handled with JWT; tokens are stored in `localStorage` and attached to requests automatically by the API service.
- The context provider in `frontend/app/providers.js` manages login, registration, logout, user state and roles.
- CORS is enabled on the backend for `http://localhost:3000`.

## Troubleshooting

- If the frontend cannot reach the backend, check the API URL and CORS settings.
- If you encounter database errors, verify the PostgreSQL connection settings.

---

This document provides the basic integration steps so both frontend and backend work together.
