/*
# SCM Database Schema Setup

This migration creates the complete Supply Chain Management database schema including:

1. New Tables:
   - `Organization` - Multi-tenant boundary for companies (MANUFACTURING or RETAIL)
   - `User` - User profiles linked to Clerk auth with role-based access (ADMIN/MANAGER/WAREHOUSE_STAFF/VIEWER)
   - `Supplier` - Vendor profiles with contact info, lead times, and reliability ratings
   - `Product` - Product catalog with SKU, pricing (in cents), reorder thresholds, and type classification
   - `Warehouse` - Storage facility locations with manager assignments
   - `InventoryItem` - Stock positions per warehouse with quantity on hand and reserved
   - `PurchaseOrder` - Procurement orders with supplier, dates, and amounts
   - `PurchaseOrderLine` - Individual line items within purchase orders
   - `Shipment` - Inbound/outbound logistics tracking with carrier and status
   - `StockMovement` - Double-entry ledger for all inventory transactions (RECEIPT/ISSUE/TRANSFER/ADJUSTMENT/RETURN)
   - `BillOfMaterials` - Manufacturing BOM relationships between finished goods and raw materials

2. Security:
   - RLS enabled on all tables but allows anon/authenticated access (auth handled by Clerk at app layer)
   - All tables are org-scoped for multi-tenant data isolation

3. Important Notes:
   - All monetary values stored in lowest denomination (cents/paise) to avoid floating-point errors
   - Organization-scoped queries filter by orgId in application layer
   - Status enums for POs, Shipments, and Stock Movements are explicitly typed
*/

-- Organization table (multi-tenant boundary)
CREATE TABLE IF NOT EXISTS "Organization" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('MANUFACTURING', 'RETAIL')),
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  "fiscalYearStart" TEXT NOT NULL DEFAULT '01-01',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Organization_type_idx" ON "Organization"(type);

-- Enable RLS
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;

-- User table (linked to Clerk)
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY, -- Clerk User ID
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'VIEWER')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "User_orgId_idx" ON "User"("orgId");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"(role);

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Supplier table
CREATE TABLE IF NOT EXISTS "Supplier" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "contactName" TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  country TEXT,
  "leadTimeDays" INTEGER DEFAULT 7,
  "paymentTerms" TEXT,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Supplier_orgId_idx" ON "Supplier"("orgId");
CREATE INDEX IF NOT EXISTS "Supplier_isActive_idx" ON "Supplier"("isActive");

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;

-- Product table
CREATE TABLE IF NOT EXISTS "Product" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  "unitOfMeasure" TEXT NOT NULL,
  "costPrice" INTEGER NOT NULL, -- Stored in cents/paise
  "sellingPrice" INTEGER NOT NULL, -- Stored in cents/paise
  "reorderPoint" INTEGER NOT NULL,
  "reorderQty" INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RAW_MATERIAL', 'FINISHED_GOOD', 'MERCHANDISE')),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Product_orgId_idx" ON "Product"("orgId");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"(category);
CREATE INDEX IF NOT EXISTS "Product_type_idx" ON "Product"(type);
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Warehouse table
CREATE TABLE IF NOT EXISTS "Warehouse" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  "managerId" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Warehouse_orgId_idx" ON "Warehouse"("orgId");
CREATE INDEX IF NOT EXISTS "Warehouse_isActive_idx" ON "Warehouse"("isActive");

ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;

-- InventoryItem table
CREATE TABLE IF NOT EXISTS "InventoryItem" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId" UUID NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "quantityOnHand" INTEGER DEFAULT 0,
  "quantityReserved" INTEGER DEFAULT 0,
  "binLocation" TEXT,
  "lastUpdated" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "InventoryItem_warehouseId_productId_unique" UNIQUE ("warehouseId", "productId")
);

CREATE INDEX IF NOT EXISTS "InventoryItem_warehouseId_idx" ON "InventoryItem"("warehouseId");
CREATE INDEX IF NOT EXISTS "InventoryItem_productId_idx" ON "InventoryItem"("productId");

ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;

-- PurchaseOrder table
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "supplierId" UUID NOT NULL REFERENCES "Supplier"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED')),
  "orderDate" TIMESTAMPTZ DEFAULT now(),
  "expectedDeliveryDate" TIMESTAMPTZ,
  "receivedDate" TIMESTAMPTZ,
  "totalAmount" INTEGER NOT NULL, -- Stored in cents/paise
  notes TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PurchaseOrder_orgId_idx" ON "PurchaseOrder"("orgId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"(status);

ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;

-- PurchaseOrderLine table
CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseOrderId" UUID NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityReceived" INTEGER DEFAULT 0,
  "unitCost" INTEGER NOT NULL, -- Stored in cents/paise
  "totalCost" INTEGER NOT NULL -- Stored in cents/paise
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_productId_idx" ON "PurchaseOrderLine"("productId");

ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;

-- Shipment table
CREATE TABLE IF NOT EXISTS "Shipment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('INBOUND', 'OUTBOUND')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')),
  "trackingNumber" TEXT,
  carrier TEXT,
  "originAddress" TEXT,
  "destinationAddress" TEXT,
  "dispatchDate" TIMESTAMPTZ,
  "estimatedArrival" TIMESTAMPTZ,
  "actualArrival" TIMESTAMPTZ,
  "warehouseId" UUID REFERENCES "Warehouse"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Shipment_orgId_idx" ON "Shipment"("orgId");
CREATE INDEX IF NOT EXISTS "Shipment_status_idx" ON "Shipment"(status);
CREATE INDEX IF NOT EXISTS "Shipment_warehouseId_idx" ON "Shipment"("warehouseId");

ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;

-- StockMovement table (double-entry ledger)
CREATE TABLE IF NOT EXISTS "StockMovement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "warehouseId" UUID NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN')),
  quantity INTEGER NOT NULL,
  "referenceId" TEXT,
  "referenceType" TEXT,
  "performedById" TEXT NOT NULL,
  "movedAt" TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");
CREATE INDEX IF NOT EXISTS "StockMovement_movedAt_idx" ON "StockMovement"("movedAt");

ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;

-- BillOfMaterials table (manufacturing BOM)
CREATE TABLE IF NOT EXISTS "BillOfMaterials" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "finishedProductId" UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "rawMaterialId" UUID NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "quantityRequired" DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "BillOfMaterials_finishedProductId_idx" ON "BillOfMaterials"("finishedProductId");
CREATE INDEX IF NOT EXISTS "BillOfMaterials_rawMaterialId_idx" ON "BillOfMaterials"("rawMaterialId");

ALTER TABLE "BillOfMaterials" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow anon and authenticated access (auth handled by Clerk at app layer)
-- Since Clerk handles authentication, Supabase sees all requests as anon
-- Data isolation is enforced by orgId filtering in the application layer

DO $$
BEGIN
  -- Organization policies
  DROP POLICY IF EXISTS "org_anon_access" ON "Organization";
  CREATE POLICY "org_anon_access" ON "Organization" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- User policies
  DROP POLICY IF EXISTS "user_anon_access" ON "User";
  CREATE POLICY "user_anon_access" ON "User" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- Supplier policies
  DROP POLICY IF EXISTS "supplier_anon_access" ON "Supplier";
  CREATE POLICY "supplier_anon_access" ON "Supplier" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- Product policies
  DROP POLICY IF EXISTS "product_anon_access" ON "Product";
  CREATE POLICY "product_anon_access" ON "Product" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- Warehouse policies
  DROP POLICY IF EXISTS "warehouse_anon_access" ON "Warehouse";
  CREATE POLICY "warehouse_anon_access" ON "Warehouse" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- InventoryItem policies
  DROP POLICY IF EXISTS "inventory_item_anon_access" ON "InventoryItem";
  CREATE POLICY "inventory_item_anon_access" ON "InventoryItem" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- PurchaseOrder policies
  DROP POLICY IF EXISTS "purchase_order_anon_access" ON "PurchaseOrder";
  CREATE POLICY "purchase_order_anon_access" ON "PurchaseOrder" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- PurchaseOrderLine policies
  DROP POLICY IF EXISTS "purchase_order_line_anon_access" ON "PurchaseOrderLine";
  CREATE POLICY "purchase_order_line_anon_access" ON "PurchaseOrderLine" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- Shipment policies
  DROP POLICY IF EXISTS "shipment_anon_access" ON "Shipment";
  CREATE POLICY "shipment_anon_access" ON "Shipment" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- StockMovement policies
  DROP POLICY IF EXISTS "stock_movement_anon_access" ON "StockMovement";
  CREATE POLICY "stock_movement_anon_access" ON "StockMovement" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- BillOfMaterials policies
  DROP POLICY IF EXISTS "bom_anon_access" ON "BillOfMaterials";
  CREATE POLICY "bom_anon_access" ON "BillOfMaterials" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;