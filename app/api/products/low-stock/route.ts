import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    // Retrieve active products in organization
    const products = await prisma.product.findMany({
      where: {
        orgId,
        isActive: true,
      },
      include: {
        inventoryItems: true,
      },
    });

    // Filter products where total stock is below or equal to reorderPoint
    const lowStockProducts = products.filter((product) => {
      const totalOnHand = product.inventoryItems.reduce(
        (acc, item) => acc + item.quantityOnHand,
        0
      );
      return totalOnHand <= product.reorderPoint;
    });

    return NextResponse.json({
      data: lowStockProducts,
      error: null,
      meta: {
        count: lowStockProducts.length,
      },
    });
  } catch (error: any) {
    console.error("GET low stock products error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
