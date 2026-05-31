import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const poCreateSchema = z.object({
  supplierId: z.string().uuid("Invalid Supplier ID"),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      productId: z.string().uuid("Invalid Product ID"),
      quantityOrdered: z.number().int().positive("Quantity ordered must be a positive integer"),
      unitCost: z.number().int().positive("Unit cost must be a positive integer"),
    })
  ).min(1, "PO must contain at least one line item"),
});

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";

    const where: any = {
      orgId,
    };

    if (status) {
      where.status = status;
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({
      data: purchaseOrders,
      error: null,
      meta: {
        count: purchaseOrders.length,
      },
    });
  } catch (error: any) {
    console.error("GET purchase orders error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function POST(req: Request) {
  try {
    // MANAGER or ADMIN can create purchase orders
    const userContext = await requireRole("MANAGER");
    const { orgId, userId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = poCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { supplierId, expectedDeliveryDate, notes, lines } = validation.data;

    // Verify supplier exists and belongs to the org
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, orgId, isActive: true },
    });
    if (!supplier) {
      return NextResponse.json({ data: null, error: "Supplier not found in organization", meta: null }, { status: 404 });
    }

    // Verify all products belong to the organization
    const productIds = lines.map((l) => l.productId);
    const productsInOrg = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        orgId,
        isActive: true,
      },
    });

    if (productsInOrg.length !== Array.from(new Set(productIds)).length) {
      return NextResponse.json(
        { data: null, error: "One or more products are invalid or not associated with this organization", meta: null },
        { status: 400 }
      );
    }

    // Calculate total sum of the PO lines
    const totalAmount = lines.reduce((sum, line) => sum + line.quantityOrdered * line.unitCost, 0);

    const po = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase Order Header
      const newPo = await tx.purchaseOrder.create({
        data: {
          orgId,
          supplierId,
          status: "DRAFT",
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          totalAmount,
          notes,
          createdById: userId,
        },
      });

      // 2. Create Purchase Order Lines
      const lineData = lines.map((line) => ({
        purchaseOrderId: newPo.id,
        productId: line.productId,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: 0,
        unitCost: line.unitCost,
        totalCost: line.quantityOrdered * line.unitCost,
      }));

      await tx.purchaseOrderLine.createMany({
        data: lineData,
      });

      return tx.purchaseOrder.findUnique({
        where: { id: newPo.id },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });
    });

    return NextResponse.json({
      data: po,
      error: null,
      meta: { message: "Purchase Order drafted successfully" },
    });
  } catch (error: any) {
    console.error("POST purchase order error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
