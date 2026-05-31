import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId") || "";
    const productId = searchParams.get("productId") || "";

    const where: any = {
      product: {
        orgId,
        isActive: true,
      },
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (productId) {
      where.productId = productId;
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: [
        { warehouse: { name: "asc" } },
        { product: { name: "asc" } },
      ],
    });

    return NextResponse.json({
      data: inventoryItems,
      error: null,
      meta: {
        count: inventoryItems.length,
      },
    });
  } catch (error: any) {
    console.error("GET inventory error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
