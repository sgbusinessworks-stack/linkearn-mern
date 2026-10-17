# LinkEarn · Referral & Affiliate Management (MERN)

A mobile-first referral program management MVP using **MongoDB, Express, React, and Node.js**. The interface is built for a clean, app-like experience on phones and desktop.

## What is included

- Program creation with percentage or fixed commission, eligible event, minimum order value, attribution window, payout threshold, terms, and active / paused / draft status. The UI defaults program currency to INR.
- Product and service offers within each program, with optional destination URLs.
- Affiliate sign-up, program discovery, join applications, manager approval, and automatic item-specific referral code generation.
- Structured codes such as `PRD-WELLNESS-KIT-A1B2C3` and `SVC-NUTRITION-AB12CD`, plus app referral URLs at `/r/:code`.
- Click tracking, conversion recording, commission calculation, eligibility validation, duplicate order protection, and conversion approval / rejection.
- Affiliate earning dashboard and payout requests; managers can approve or decline requests and mark completed transfers as paid.
- An authenticated manager form for test/manual conversions and a secret-protected webhook endpoint for checkout integration.
- Seed data so both manager and affiliate dashboards have something to explore.

## Stack

- Frontend: React 18, Vite, React Router, Lucide icons, custom responsive CSS.
- Backend: Node.js, Express, Mongoose, JWT authentication, bcrypt password hashing.
- Database: MongoDB Community or MongoDB Atlas.

## Requirements

- Node.js 20 or newer recommended.
- npm.
- A running MongoDB instance or a MongoDB Atlas connection string.

## Run locally

### 1. Configure the API

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item backend/.env.example backend/.env`; on macOS/Linux, use `cp backend/.env.example backend/.env`. Edit `backend/.env` and set at least:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/linkearn
JWT_SECRET=use-a-long-random-secret-here
CLIENT_URL=http://localhost:5173
CONVERSION_WEBHOOK_SECRET=use-a-different-random-secret-here
```

If you're using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string. Never commit real secrets to source control.

### 2. Install dependencies

From the project root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. Add demo data (recommended)

```bash
npm run seed
```

Demo sign-ins:

| Role | Email | Password |
|---|---|---|
| Program manager | `manager@linkearn.demo` | `Demo123!` |
| Affiliate | `affiliate@linkearn.demo` | `Demo123!` |

The seed script is idempotent for the demo entities. It does not wipe the database.

### 4. Start the app

From the root folder:

```bash
npm run dev
```

- React app: <http://localhost:5173>
- API health check: <http://localhost:5000/api/health>

You can also start them independently with `npm run dev:api` and `npm run dev:web`.

## Automatic checkout / subscription integration

The referral URL records a click through `GET /api/track/:code`. If an offer has a destination URL, LinkEarn redirects the visitor there and appends `?ref=THE_CODE` (or `&ref=THE_CODE`). The destination site should persist that code for the program's attribution window, such as in a first-party cookie or server-side session. On a successful eligible purchase/subscription/lead, the checkout backend should notify LinkEarn.

### Webhook contract

Send a JSON request to `POST /api/webhooks/conversion` and include the secret header configured in `CONVERSION_WEBHOOK_SECRET`:

```http
Content-Type: application/json
X-Webhook-Secret: your-configured-webhook-secret
```

```json
{
  "code": "PRD-WELLNESS-KIT-A1B2C3",
  "clickId": "CLICK_ID_FROM_THE_REFERRAL_REDIRECT",
  "orderId": "ORDER-12345",
  "amount": 2499.00,
  "eventType": "purchase",
  "customerRef": "customer-248",
  "note": "Optional internal reference"
}
```

`code`, `clickId`, `orderId`, and `amount` are required for a normal checkout event. The click ID is returned by `GET /api/track/:code`, appended to destination URLs as `click_id`, and validated against the code and configured attribution window. `eventType` can be `purchase`, `subscription`, or `lead`, and must match the program's eligibility rule. For a recurring subscription renewal, send `isRenewal: true`, `eventType: "subscription"`, and the stable `customerRef`; recurring commissions must be enabled and there must already be an approved/paid tracked subscription conversion for that same customer reference and item. Commissions are created as **pending** so a manager can review eligibility before they become payable. Duplicate `(orderId, itemId)` conversions are rejected.

Example `curl` call:

```bash
curl -X POST http://localhost:5000/api/webhooks/conversion \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: your-configured-webhook-secret' \
  -d '{"code":"PRD-WELLNESS-KIT-A1B2C3","clickId":"CLICK_ID_FROM_REDIRECT","orderId":"ORDER-12345","amount":2499,"eventType":"purchase"}'
```

Use a code generated in your database rather than the illustrative code above. Keep the webhook secret only on the checkout server; never expose it in browser code.

**Important integration note:** LinkEarn includes the tracking and webhook endpoint, but it does not integrate with a third-party store, payment gateway, or subscription platform out of the box. Those systems must preserve the incoming referral code and call the webhook after a qualifying event. The API validates the click ID and attribution window for normal webhook conversions. Production integrations still need to preserve the original `ref` + `click_id` through checkout, verify provider webhook signatures / order state, and decide how to handle cancelled/refunded orders and long-lived subscription billing.

## Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Create an affiliate account |
| `POST /api/auth/login` | Sign in and receive a JWT |
| `GET /api/dashboard/overview` | Role-specific workspace statistics |
| `GET /api/programs` | Manager programs or affiliate's joined/discoverable programs |
| `POST /api/programs` | Create a program (manager) |
| `POST /api/programs/:id/items` | Add a product/service offer (manager) |
| `POST /api/programs/:id/join` | Apply to join a program (affiliate) |
| `PATCH /api/programs/:id/members/:affiliateId` | Approve/reject affiliate membership (manager) |
| `GET /api/programs/:id/codes` | View referral links/codes with access rules |
| `GET /api/track/:code` | Register click and return the offer destination |
| `GET /api/conversions` | List role-visible conversions |
| `POST /api/conversions` | Record a conversion manually (manager) |
| `PATCH /api/conversions/:id/status` | Approve/reject conversion (manager) |
| `GET /api/payouts` | List role-visible payout records |
| `POST /api/payouts` | Request payout for available commission (affiliate) |
| `PATCH /api/payouts/:id/status` | Approve/decline/settle a payout (manager) |
| `POST /api/webhooks/conversion` | Secret-protected checkout conversion webhook |

Authenticated endpoints require `Authorization: Bearer <jwt>` except the login/register, tracking redirect and secret-protected webhook routes.

## Data model overview

- `User`: manager or affiliate profile and hashed password.
- `Program`: commission policy, event eligibility and payout rules.
- `Item`: a product or service offer in a program.
- `Membership`: affiliate application and approval status.
- `ReferralCode`: unique code for each affiliate × item × program combination, plus click count.
- `ReferralClick`: a click event tied to a referral code, used to validate the attribution window.
- `Conversion`: attributed event, order value, calculated commission and review status.
- `Payout`: request, allocated conversion IDs, payment state and optional payment reference.

## Security and production checklist

This is a starter MVP, not a fully audited financial system. Before using it for live commission payments:

1. Replace demo secrets and restrict CORS to your deployed origin. Add HTTPS, rate limiting, secure logging, and stronger password reset / account recovery.
2. Add CSRF-safe session strategy if switching from bearer tokens, audit logging, role-aware account administration, and automated tests for all authorization paths.
3. Validate webhook signatures with a replay window, idempotency key, and provider-specific signature algorithm; add retry handling and a queue.
4. Enforce attribution-window timestamps and cookie/session rules in the checkout integration; consider multi-touch attribution, refund / cancellation clawbacks, fraud checks and tax requirements.
5. Add transactions for payout allocation and settlement, especially under concurrent payout requests; review currency conversion and decimal precision for real financial use. Current commission amounts are stored as JavaScript numbers, so production finance workflows should use integer minor units or a decimal type.
6. Configure HTTPS, environment-based secrets, backups, monitoring, dependency scanning, legal terms and privacy notices before launch.

## Project layout

```text
linkearn-mern/
├── backend/
│   ├── src/config/         # Mongo connection
│   ├── src/middleware/     # JWT role/auth checks
│   ├── src/models/         # Mongoose documents
│   ├── src/routes/         # Auth, programs, conversions, payouts, tracking
│   ├── src/utils/          # Shared helpers and code generation
│   └── src/seed.js         # Demo records
└── frontend/
    └── src/
        ├── components/    # Layout and reusable UI
        ├── context/       # Auth provider
        ├── lib/           # API client / formatting
        └── pages/         # Role-specific screens
```

## Build frontend

```bash
npm run build
```

Vite outputs the static frontend into `frontend/dist/`. Deploy the API and frontend separately or configure your hosting provider to serve the static build and proxy `/api` requests to Express.
