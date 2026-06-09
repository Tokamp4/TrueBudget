# TrueBudget 💳

> Financial clarity for people living paycheck-to-paycheck.

## Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Recharts
- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Auth**: JWT + bcrypt
- **Banking**: Plaid API (sandbox)

## Project Structure

```
truebudget/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed data
│   └── src/
│       ├── controllers/        # Route handlers
│       ├── routes/             # Express routers
│       ├── middleware/         # Auth, error, validation
│       ├── services/           # Business logic
│       └── lib/                # Prisma client, Plaid client
└── frontend/
    └── src/
        ├── components/         # Reusable UI components
        ├── pages/              # Route-level page components
        ├── store/              # Zustand stores
        ├── hooks/              # Custom React hooks
        ├── lib/                # Axios instance, helpers
        └── types/              # Shared TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Plaid account (free sandbox at https://dashboard.plaid.com)

### Backend Setup
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run db:migrate
npm run db:seed
npm run dev                 # runs on http://localhost:3001
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # runs on http://localhost:5173
```

## Environment Variables

### Backend `.env`
```
DATABASE_URL="postgresql://user:password@localhost:5432/truebudget"
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
PORT=3001
```

### Frontend `.env`
```
VITE_API_URL="http://localhost:3001/api"
VITE_PLAID_ENV="sandbox"
```

## Key Features
- 💰 **Safe-to-Spend** — real spendable money after upcoming bills
- 📋 **Bill Priority Engine** — ranks bills by consequence severity
- 📅 **Paycheck Planner** — timeline of income vs. bills
- 🧮 **Payday Loan Calculator** — true cost comparison tool
- 📊 **Financial Health Score** — 0–100 stability metric
- 🏦 **Plaid Integration** — connect real bank accounts (sandbox)
