import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const now = new Date();

    const [products, overduePos, delayedShipments] = await Promise.all([
      // 1. Fetch products for reorder alerts
      prisma.product.findMany({
        where: { orgId, isActive: true },
        select: {
          id: true,
          sku: true,
          name: true,
          reorderPoint: true,
          inventoryItems: {
            select: { quantityOnHand: true },
          },
        },
      }),

      // 2. Fetch overdue purchase orders
      prisma.purchaseOrder.findMany({
        where: {
          orgId,
          status: { in: ["SENT", "CONFIRMED"] },
          expectedDeliveryDate: { lt: now },
        },
        include: {
          supplier: {
            select: { name: true },
          },
        },
      }),

      // 3. Fetch delayed shipments
      prisma.shipment.findMany({
        where: {
          orgId,
          status: "IN_TRANSIT",
          estimatedArrival: { lt: now },
        },
        include: {
          warehouse: {
            select: { name: true },
          },
        },
      }),
    ]);

    // 1.1 Calculate low stock item lists
    const lowStockAlerts = products
      .map((p) => {
        const totalOnHand = p.inventoryItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          quantityOnHand: totalOnHand,
          reorderPoint: p.reorderPoint,
        };
      })
      .filter((p) => p.quantityOnHand <= p.reorderPoint);

    // 2.1 Format overdue PO alerts
    const poAlerts = overduePos.map((po) => ({
      id: po.id,
      supplierName: po.supplier.name,
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      totalAmount: po.totalAmount,
      status: po.status,
    }));

    // 3.1 Format delayed shipments alerts
    const shipmentAlerts = delayedShipments.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      carrier: s.carrier,
      type: s.type,
      estimatedArrival: s.estimatedArrival,
      destinationAddress: s.destinationAddress,
      warehouseName: s.warehouse?.name || "Global Hub",
    }));

    return NextResponse.json({
      data: {
        lowStock: lowStockAlerts,
        overduePurchaseOrders: poAlerts,
        delayedShipments: shipmentAlerts,
      },
      error: null,
      meta: {
        totalAlerts: lowStockAlerts.length + poAlerts.length + shipmentAlerts.length,
      },
    });
  } catch (error: any) {
    console.error("GET dashboard alerts error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
