# Lager IM Server

Express.js + Prisma + PostgreSQL backend — replacing Base44 BaaS.

## Quick Start

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
# Create database:
createdb lager_im
```

**Docker (alternative):**
```bash
docker-compose up -d postgres
```

**Or use a cloud PostgreSQL** (Railway, Supabase, AWS RDS, etc.)

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

Example for local PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lager_im"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Generate Prisma Client & Migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start the Server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

---

## Data Export from Base44 (Phase 0)

Before migrating, export all data from Base44:

```bash
export BASE44_APP_ID="your-app-id"
export BASE44_API_TOKEN="your-token"
node scripts/exportBase44Data.js
```

This creates JSON files in `data-export/` — one per entity.

---

## Data Analysis

### Analyze Order Statuses (pre-migration)

```bash
# After exporting data:
node scripts/analyzeOrderStatuses.js

# Or specify custom data directory:
node scripts/analyzeOrderStatuses.js --data-dir=/path/to/export
```

This generates a report showing how current `Order.status` values map to the proposed `phase` + `fulfillment_status` model.

---

## Project Structure

```
server/
├── src/
│   ├── index.js              # Express entry point
│   ├── middleware/
│   │   ├── auth.js           # JWT auth middleware
│   │   └── errorHandler.js   # Global error handler
│   ├── routes/
│   │   ├── auth.js           # Login, logout, me, refresh
│   │   ├── entities.js       # Auto-generated CRUD for all 47 entities
│   │   ├── functions.js      # Migrated Base44 functions (173 total)
│   │   └── upload.js         # File upload (replaces Core.UploadFile)
│   └── functions/            # Individual migrated functions (TODO)
├── prisma/
│   └── schema.prisma         # Auto-generated from Base44 entities
├── scripts/
│   ├── convertSchemas.js     # JSONC → Prisma converter
│   ├── addRelations.js       # Adds @relation fields
│   ├── exportBase44Data.js   # Export data from Base44 API
│   └── analyzeOrderStatuses.js # Data analysis script
├── data-export/              # Exported JSON data (gitignored)
├── uploads/                  # Local file uploads (development)
├── .env.example
└── package.json
```

---

## Migration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Prisma Schema | ✅ Generated | 47 models, 81 enums, 48 relations |
| Express Server | ✅ Scaffolded | Auth, CRUD, upload routes |
| JWT Auth | ✅ Implemented | bcrypt + jose, HTTP-only cookies |
| Entity CRUD | ✅ Auto-generated | All 47 entities have REST endpoints |
| Base44 Data Export | ✅ Script ready | Run with API credentials |
| Order Status Analysis | ✅ Script ready | Standalone, runs on JSON export |
| 173 Functions | ⏳ Pending | Migrate in priority order |
| Frontend SDK | ⏳ Pending | Replace `base44.` with `api.` |
| File Storage | ⏳ Dev ready | Local disk; needs R2/S3 for production |
| Real-time | ⏳ Pending | Socket.io or SSE |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/logout` | Clear auth cookie |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |

### Entities (CRUD)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/entities/:entityName` | List with sorting/filtering |
| GET | `/api/v1/entities/:entityName/:id` | Get by ID |
| POST | `/api/v1/entities/:entityName` | Create |
| PUT | `/api/v1/entities/:entityName/:id` | Update |
| DELETE | `/api/v1/entities/:entityName/:id` | Delete |

### Functions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/functions/:functionName` | Invoke migrated function |

### Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/upload` | Upload file (multipart/form-data) |

---

## Important Notes

### Password Migration
Base44 does not export password hashes. When migrating users:
- Existing users will need a **password reset flow**
- Or implement a one-time migration token sent via email

### Prisma Schema Changes Needed
The auto-generated schema is a starting point. Review and adjust:
1. **Float → Int**: Fields like `module_count`, `stock_qty` should be `Int`, not `Float`
2. **Cascade deletes**: Add `onDelete: Cascade` where appropriate
3. **Indexes**: Add `@@index()` for frequently queried fields
4. **Self-references**: Task→Task, User→User (manager) etc.
5. **Many-to-many**: If any exist in the current data model

### File URLs
During transition, store both old Base44 URLs and new URLs:
- Old URLs continue working until Base44 is decommissioned
- New uploads go to R2/S3
- Consider a background job to migrate old files

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | 256-bit secret for JWT signing |
| `PORT` | ❌ | Server port (default: 3001) |
| `FRONTEND_URL` | ❌ | CORS origin (default: http://localhost:5173) |
| `KIMI_API_KEY` | ❌ | Moonshot AI API key |
| `RESEND_API_KEY` | ❌ | Resend email API key |
| `FORTNOX_CLIENT_ID` | ❌ | Fortnox OAuth client ID |
| `FORTNOX_CLIENT_SECRET` | ❌ | Fortnox OAuth secret |
| `S3_ENDPOINT` | ❌ | R2/S3 endpoint for file storage |
| `S3_ACCESS_KEY_ID` | ❌ | S3 access key |
| `S3_SECRET_ACCESS_KEY` | ❌ | S3 secret key |
| `S3_BUCKET` | ❌ | S3 bucket name |
| `VAPID_PUBLIC_KEY` | ❌ | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | ❌ | Web Push VAPID private key |
