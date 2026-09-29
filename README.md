# Qulf ERP Backend (multi-tenant)
Cloned architecture from sibling `ERP/backend`: Express 5 + Sequelize 6 + MySQL, shared-DB `organization_id` tenancy.
## Run
1. `cp .env.example .env` (set DB + JWT secrets)
2. Create DB or let server auto-create: `npm install`
3. Dev: `npm run dev` (auto sync in non-production)
4. Seed demo tenant: `npm run db:seed` -> `admin@qulf.sa / Admin@123`
## APIs (`/api/v1`)
- `POST /auth/register-org` { org_name, name, email, password }
- `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `GET|POST /projects`, `GET|PUT /projects/:id`
- `GET|POST /boqs`, `POST /boqs/:id/items`, `POST /boqs/:id/approve`
- `GET|POST /estimations`, `POST /estimations/:id/items`, `POST /estimations/:id/approve`
Headers: `Authorization: Bearer <token>`, `X-Branch-Id`, `X-Project-Id`.
