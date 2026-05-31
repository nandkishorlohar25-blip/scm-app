import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const [totalProducts, lowStockProducts, openPos, inTransitShipments] = await Promise.all([
      // 1. Total SKUs count
      prisma.product.count({
        where: { orgId, isActive: true },
      }),

      // 2. Fetch inventory and products to determine low stock count
      prisma.product.findMany({
        where: { orgId, isActive: true },
        select: {
          reorderPoint: true,
          inventoryItems: {
            select: { quantityOnHand: true },
          },
        },
      }),

      // 3. Count open purchase orders (not RECEIVED and not CANCELLED)
      prisma.purchaseOrder.count({
        where: {
          orgId,
          status: { in: ["DRAFT", "SENT", "CONFIRMED"] },
        },
      }),

      // 4. Count shipments in transit
      prisma.shipment.count({
        where: {
          orgId,
          status: "IN_TRANSIT",
        },
      }),
    ]);

    // Calculate how many products are low stock
    const lowStockCount = lowStockProducts.filter((product) => {
      const totalStock = product.inventoryItems.reduce((acc, item) => acc + item.quantityOnHand, 0);
      return totalStock <= product.reorderPoint;
    }).length;

    return NextResponse.json({
      data: {
        totalSkus: totalProducts,
        lowStockAlerts: lowStockCount,
        openPos,
        shipmentsInTransit: inTransitShipments,
      },
      error: null,
      meta: null,
    });
  } catch (error: any) {
    console.error("GET dashboard metrics error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
