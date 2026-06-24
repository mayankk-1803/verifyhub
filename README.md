# ⚡ VerifyHub — Verification API Marketplace SaaS

VerifyHub is a production-ready, multi-tenant API aggregator and billing marketplace designed for Indian KYC verification APIs (PAN, GSTIN, Bank Accounts, UPI VPAs, Aadhaar, etc.).

It acts as an API gateway that handles client credentials, whitelists, rate limits, pay-per-use wallet deductions, dynamic vendor hot-swapping, and postback webhooks in the background.

---

## 📁 Project Structure

```
verifyhub/
├── client/          # Vite + React (Claymorphism UI, R3F Scene, Recharts)
├── server/          # Node.js + Express (Sequelize, MySQL, BullMQ, Redis)
├── docker/          # Compose settings, Nginx configurations
├── docs/            # OpenAPI specs
├── .env.example     # Template settings
└── README.md        # Documentation
```

---

## 🚀 Quick Start Instructions

VerifyHub is built for dual deployment options: **Local Server Execution** or **Docker Containers**.

### Prerequisite Checklist
1. **Node.js** (v18+ recommended)
2. **MySQL Database Server** (running locally on port `3306`)
3. **Redis Server** (running locally on port `6379`)

---

### Option A: Local Dev Boot-up (Recommended for Evaluation)

#### Step 1: Initialize Backend Server
1. Open a terminal and navigate to `server/`:
   ```bash
   cd server
   ```
2. Copy the `.env` settings:
   ```bash
   cp .env.example .env
   ```
   *(Note: Ensure the local MySQL credentials match: `DB_USER=root`, `DB_PASSWORD=Mayank@1803`)*
3. Start the server (which automatically runs Sequelize migrations and database seeding):
   ```bash
   npm run start
   ```
   *The Express server will start listening on http://localhost:5000.*

#### Step 2: Initialize Frontend Client
1. Open a new terminal and navigate to `client/`:
   ```bash
   cd client
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The UI portal will boot up on http://localhost:5173.*

---

### Option B: Docker Container Deployment

To boot up all components (Frontend React on Nginx, Backend Express server, MySQL, and Redis) as container services:

1. Open a terminal in the root directory:
   ```bash
   cd docker
   ```
2. Trigger docker compose:
   ```bash
   docker-compose up --build
   ```
3. Once built, open the client dashboard on http://localhost, and access backend logs on port `5000`.

---

## ⚙️ Core Architecture & Features

### 1. API Gateway Verification Flow
- **Security Checkpoints**: Validates header API Keys `vh_live_...`, checks whitelist IPs, and enforces sliding window rate-limiting via Redis.
- **Pay-Per-Use Balance Deductions**: Pulls cost per service from the pricing engine and debits the user's wallet.
- **Provider Adapter Routing**: Dispatches tasks to the active vendor adapter.
- **Failover Resolution**: If the primary vendor (e.g. `Surepass`) fails, the gateway hot-swaps to the backup (e.g. `Signzy`). If both fail, it issues an auto-reversal refund.

### 2. BullMQ Webhooks
- Leverages Redis to process webhook postbacks in the background. Payloads are signed using HMAC-SHA256 and sent to client servers.

### 3. Claymorphic Design System
- Features a premium organic glass/clay theme using custom inset shadows, micro-interactions, Recharts analytics displays, and a React Three Fiber floating hero orb.

### 4. Seeded Sandbox Logins (For Evaluation)
- **Client User Profile**:
  - Email: `client@verifyhub.com`
  - Password: `Client@123`
  - *Seeded with ₹0.00 sandbox wallet balance.*
- **Super Admin Profile**:
  - Email: `admin@dizipay.in`
  - Password: `Admin@11200`
