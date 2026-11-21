# LaptopStore deployment on Railway

## Services

- **web**: React SPA built with Node.js and served by Caddy on port 8080.
- **api**: Spring Boot API built using `backend/Dockerfile`, running on port 8081.
- **Postgres**: persistent PostgreSQL service, not publicly exposed.
- **uploads**: persistent volume mounted at `/app/uploads` in `api`.

## Networking

The browser uses relative URLs `/api/v1` and `/uploads`. Caddy proxies these routes
to `BACKEND_UPSTREAM` over Railway's private network. Only `web` needs a public
domain for ordinary users. `api` also has a public HTTPS domain only for payment
provider callbacks (VNPay IPN).

## Required service variables

**web**

- `BACKEND_UPSTREAM=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:8081`

**api**

- `PORT=8081`
- `DB_HOST=${{Postgres.PGHOST}}`
- `DB_PORT=${{Postgres.PGPORT}}`
- `DB_NAME=${{Postgres.PGDATABASE}}`
- `DB_USERNAME=${{Postgres.PGUSER}}`
- `DB_PASSWORD=${{Postgres.PGPASSWORD}}`
- `JWT_SECRET`: generated unpredictable secret (keep private)
- `SPRING_PROFILES_ACTIVE=prod`
- `SPRING_JPA_SHOW_SQL=false`
- `AUTH_COOKIE_SECURE=true`
- `CORS_ALLOWED_ORIGIN_PATTERNS=https://${{web.RAILWAY_PUBLIC_DOMAIN}},https://${{api.RAILWAY_PUBLIC_DOMAIN}},http://localhost:5173,http://localhost:3000,http://127.0.0.1:*`
- `UPLOAD_DIR=/app/uploads`
- `AI_ENABLED=false` until an API key is provisioned
- `SWAGGER_ENABLED=true` for demo/review (serves `/swagger-ui.html` and `/v3/api-docs` publicly); set `SWAGGER_ENABLED=false` to disable/lock API docs in production
- `APP_SEED_DEMO_DATA=false` on production, paired with `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` for the initial admin account
- `VNPAY_RETURN_URL=https://<web-domain>/payment/vnpay-return`
- `VNPAY_IPN_URL=https://<api-domain>/api/v1/payments/vnpay/ipn`
- `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET`: enter privately for real sandbox/production payments.

Do not enable real payment until the correct merchant settings and full callback
flow have been tested. Never put secrets in Git.

## Health checks

- web: `/healthz`
- api: `/api/v1/health` (includes a database check)

## Operational notes

- Database migrations are applied by Flyway at API startup. Do not enable demo
  seed migrations in production without deliberate review.
- Refresh-token cookies are Secure over HTTPS in production.
- Back up Postgres and the upload volume before major changes.
- Test login, registration, product images, checkout, callbacks and return flows
  after deployment. A healthy endpoint alone is not full end-to-end verification.
