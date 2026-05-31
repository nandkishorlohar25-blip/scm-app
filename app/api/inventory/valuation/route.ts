import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    // Fetch all active products and their inventory items inside this organization
    const products = await prisma.product.findMany({
      where: {
        orgId,
        isActive: true,
      },
      include: {
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    let totalValuation = 0;
    const valuationByCategory: Record<string, number> = {};
    const valuationByWarehouse: Record<string, { name: string; value: number }> = {};

    for (const product of products) {
      for (const item of product.inventoryItems) {
        const costPriceVal = product.costPrice;
        const qtyVal = item.quantityOnHand;
        const lineValuation = qtyVal * costPriceVal;

        totalValuation += lineValuation;

        // Group by category
        const cat = product.category || "Uncategorized";
        valuationByCategory[cat] = (valuationByCategory[cat] || 0) + lineValuation;

        // Group by warehouse
        const wId = item.warehouseId;
        const wName = item.warehouse.name;
        if (!valuationByWarehouse[wId]) {
          valuationByWarehouse[wId] = { name: wName, value: 0 };
        }
        valuationByWarehouse[wId].value += lineValuation;
      }
    }

    return NextResponse.json({
      data: {
        totalValuation, // Value in paise/cents
        valuationByCategory,
        valuationByWarehouse: Object.values(valuationByWarehouse),
      },
      error: null,
      meta: {
        currency: "USD", // Scalable depending on SCM settings
      },
    });
  } catch (error: any) {
    console.error("GET inventory valuation error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
