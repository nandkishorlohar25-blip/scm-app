# 📦 Supply Chain Management (SCM) Web App

A robust, type-safe full-stack Supply Chain Management (SCM) web application built using **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Prisma ORM** (targeting PostgreSQL via Supabase), **Clerk Authentication**, and **Anthropic Claude AI** for demand forecasting and procurement assistance.

This platform is specifically designed to support two distinct types of businesses:
*   **Manufacturing**: raw material procurement, stock tracking, and supplier coordination.
*   **Retail**: multi-location inventory, vendor management, stock replenishment, and transaction ledgers.

---

## 🌟 Key Features

### 📊 Real-Time Operations Command Center (Dashboard)
*   **Actionable KPI Metrics**: Instantly view Total SKUs, low-stock warnings, open purchase orders, and shipments in transit.
*   **Visual Charts**: Beautiful, responsive **Recharts** charts showing 30-day inventory valuation trends and top supplier vendor breakdowns.
*   **Operational Alerts**: Contextual notices highlights low-stock items or delayed supplier deliveries.
*   **Audit Logs**: Live activity feed displaying the latest inventory movements.

### 🛡️ Secure Auth & Granular Role-Based Access Control (RBAC)
*   **Clerk Integration**: Zero-trust session check securing routes using Next.js Middleware.
*   **Hierarchical RBAC Levels**:
    1.  `ADMIN` (Full administrative capabilities and configuration)
    2.  `MANAGER` (Operations setup, inventory transfers, and purchase order drafting)
    3.  `WAREHOUSE_STAFF` (Goods receiving, manual adjustments, and shipment dispatching)
    4.  `VIEWER` (Read-only observation across dashboard panels)
*   **Dynamic UI Scoping**: Navigation elements and buttons automatically hide/show using client-side `RoleGuard` wrapper components.

### 🗄️ Robust Database Schema & Ledger (`prisma/schema.prisma`)
*   **Tenancy Boundaries**: Scoped database queries mapped to individual `Organization` records.
*   **Double-Entry Stock Ledger**: Comprehensive `StockMovement` table registering detailed adjustments, transfers, and receipts.
*   **Minor Denominations Arithmetic**: All currency and cost calculations are handled as integers (paise/cents) to eliminate floating-point drift and guarantee precision.
*   **High Performance**: Indexed foreign keys and search criteria fields for speedy PostgreSQL lookup performance.

### 🤖 Intelligent AI Integrations (Anthropic Claude API)
*   **Demand Forecasting**: Live forecast generator predicting sales velocity and optimal reorder levels.
*   **Supplier Risk Auditor**: Profiles vendors dynamically based on historical lead times and transit delays.
*   **Cmd+K Command Console**: Global keyboard listener enabling operations queries in plain English.

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 14 (App Router, Server Actions ready)
*   **Language**: TypeScript (Strict Mode enabled)
*   **Styling**: Tailwind CSS & Custom CSS variables
*   **UI Components**: shadcn/ui & Base UI primitives
*   **Database**: PostgreSQL & Prisma ORM
*   **Authentication**: Clerk Auth SDK
*   **Intelligence**: Anthropic Claude API SDK
*   **Data Visualization**: Recharts

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
Ensure you have **Node.js 20 LTS** or later and **npm** installed on your development machine.

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo-directory>

# Install packages
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and fill in the actual connection parameters and credentials:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
*   `DATABASE_URL`: PostgreSQL connection URL (e.g., Supabase transaction pooler).
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Client & server keys from your Clerk Dashboard.
*   `ANTHROPIC_API_KEY`: API key from Anthropic Console to power the AI features.

### 4. Database Setup & Sync
Synchronize your Prisma schema with the database and compile the local client:
```bash
# Push schema changes to your database
npx prisma db push

# Generate the type-safe client bindings
npx prisma generate
```

### 5. Running the Application
Launch the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Bundling & Deployment

### Build Compilation
Verify type-safety and compile the optimized production-ready bundle:
```bash
# Type check and build
npx tsc --noEmit
npm run build
```

### Vercel Deployment
This application is pre-configured and fully compatible with **Vercel** deployment pipelines.

1.  Connect your GitHub repository to Vercel.
2.  Configure your **Environment Variables** (`DATABASE_URL`, Clerk keys, and `ANTHROPIC_API_KEY`) within Vercel's Project Settings.
3.  Deploy! Vercel will automatically compile the bundle and launch the serverless App Router endpoints.
