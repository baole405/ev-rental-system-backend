# EV Rental System – Backend API

Backend service for the EV rental platform. The current `flowagain` branch implements the BA-approved flows for registration, booking, payments, rentals, handovers, and cron automation.

## Overview
- **Tech**: Node.js 22, Express, MongoDB + Mongoose, JWT auth, Multer uploads, Swagger docs.
- **Docs**: Swagger UI at `http://localhost:4000/docs` (generated from `src/config/swagger.js`).
- **Seeds**: 50 vehicles, 10 brands, 4 stations, demo renters & staff accounts.
- **Status enums** are centralised in `src/constants/statusCodes.js` and mirrored in Swagger/FE docs.

## Getting Started
```bash
npm install
npm run dev # nodemon
# or
npm start    # production mode
```

### Environment
Create `.env` (example):
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/ev-rental
JWT_SECRET=replace_me
FRONTEND_URL=http://localhost:5173
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
```
PayOS fields are optional. When missing, the app serves a fake checkout endpoint (`POST /api/payments/checkout/test`) so flows can be tested without the gateway.

## Core Domain Flow
1. **Register & verify**
   - `POST /api/auth/register` -> user status `pending_documents`.
   - Renter uploads docs via `POST /api/user-documents`.
   - Staff approves (`PUT /api/user-documents/:id`) -> user status becomes `verified` -> renter can book.
2. **Booking lifecycle** (`POST /api/bookings`, `GET /api/bookings`, `PUT /api/bookings/:id/status`)
   - Status path: `CREATED` → `PENDING_APPROVAL` → `APPROVED` → `WAITING_PAYMENT` → `PAID` → `SUCCESS`.
   - Staff filters bookings with query params (`renterId`, `status`, `email`, `phoneNumber`, `bookingCode`).
   - Vehicle assignment triggers a 30-minute reservation hold (see background jobs).
3. **Payment**
   - Fake checkout: `POST /api/payments/checkout/test { bookingId, method }` (requires booking in `WAITING_PAYMENT`).
   - Manual payments: `POST /api/payments` with optional `autoComplete`/`skipBookingUpdate` flags.
   - Real PayOS checkout available via `POST /api/payos/checkout` once credentials are configured.
4. **Rental management** (`GET/PUT /api/rentals`)
   - Auto-created when booking reaches `PAID`. Status path: `CREATED` → `READY_FOR_PICKUP` → `IN_PROGRESS` → `LATE/RETURNED/DAMAGED` → `COMPLETED/CANCELLED`.
   - Vehicle status sync (available/reserved/rented/maintenance) handled within controllers/services.
5. **Handovers** (`POST /api/handovers`, `GET /api/handovers?rentalId=...`)
   - Pickup: uploads inspection photos, sets rental to `IN_PROGRESS`.
   - Return: records drop-off, pushes rental to `RETURNED`/`DAMAGED`, releases vehicle.

## Background Jobs (`src/services/backgroundJobs.js`)
- **Reservation timeout**: every 5 minutes releases vehicles for bookings stuck past hold window.
- **Auto rental creation**: ensures `PAID` bookings create a rental if none exists.
- **Late rental check**: marks rentals overdue and prepares surcharge placeholders.
- Jobs start via `startBackgroundJobs()` when the server boots. Automated tests are not yet in place—run manual checks during QA.

## API Documentation
- Swagger schema: `src/config/swagger.js`.
- FE integration notes: `FRONTEND_API_GUIDE.md`, `PROMPT_FOR_FRONTEND_AGENT.md`, `MESSAGE_FOR_FRONTEND.md`.
- Key routes (non-exhaustive):
  - Auth: `POST /api/auth/login`, `POST /api/auth/register`.
  - Profile: `GET /api/users/me`.
  - Bookings: `POST /api/bookings`, `GET /api/bookings?renterId=...`, `PUT /api/bookings/:id/status`, `PUT /api/bookings/:id/cancel`.
  - Payments: `POST /api/payments/checkout/test`, `POST /api/payments`, `PUT /api/payments/:id`.
  - Rentals: `GET /api/rentals`, `PUT /api/rentals/:id`.
  - Handovers: `POST /api/handovers`, `GET /api/handovers?rentalId=...`.
  - Vehicles/Brands: `GET /api/brands/by-station?stationId=...`, `GET /api/vehicles?stationId=...`.

## Testing & QA
- Manual regression checklist lives in `FRONTEND_API_GUIDE.md` (End-to-End Test Script section).
- Recommended future work: add automated tests for cron jobs and payment/rental transitions.

## Troubleshooting
- **Node crash with PayOS**: check `PAYOS_*` envs; without them use fake checkout.
- **Bookings endpoint returns all data**: ensure `renterId` filter is supplied from FE.
- **Vehicles stuck reserved**: confirm background jobs are running (`Reservation timeout` log) or trigger `npm run dev` restart.

---
Maintained with ❤️ for the EV Rental team.
