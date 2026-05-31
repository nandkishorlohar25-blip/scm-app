import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;
    const { id: supplierId } = params;

    // Verify supplier exists
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, orgId, isActive: true },
    });
    if (!supplier) {
      return NextResponse.json({ data: null, error: "Supplier not found", meta: null }, { status: 404 });
    }

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        orgId,
        supplierId,
      },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({
      data: orders,
      error: null,
      meta: { count: orders.length },
    });
  } catch (error: any) {
    console.error("GET supplier orders error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
