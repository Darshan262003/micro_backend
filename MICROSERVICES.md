# Microservices Structure

## Folders

- `auth-service` (port 4001)
- `user-service` (port 4002)
- `job-service` (port 4003)
- `gateway` (port 4000)

## Cross-service HTTP (axios) example

From `job-service/application.service.js`:

- GET `http://localhost:4002/internal/users/:id` to verify `profileCompleted` before apply.
- POST `http://localhost:4002/internal/users/batch` to fetch worker profile fields for employer application listing.

## Run instructions

In separate terminals:

1. `cd auth-service && npm install && npm run dev`
2. `cd user-service && npm install && npm run dev`
3. `cd job-service && npm install && npm run dev`
4. `cd gateway && npm install && npm run dev`

Then call APIs via gateway `http://localhost:4000`:

- `/auth/*` -> auth-service
- `/user/*` -> user-service
- `/employer/*` and `/worker/*` -> job-service

## Notes

- JWT is verified in each service using the same `JWT_SECRET`.
- Database schemas and field names are preserved.
- Business rules remain unchanged; only service boundaries/communication changed.
