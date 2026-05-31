import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const poUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "CONFIRMED", "RECEIVED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;
    const { id } = params;

    const po = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { data: null, error: "Purchase Order not found", meta: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: po, error: null, meta: null });
  } catch (error: any) {
    console.error("GET purchase order by ID error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // MANAGER or ADMIN can update purchase orders status
    const userContext = await requireRole("MANAGER");
    const { orgId } = userContext;
    const { id } = params;

    const body = await req.json().catch(() => ({}));
    const validation = poUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    // Verify PO exists and belongs to organization
    const po = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!po) {
      return NextResponse.json(
        { data: null, error: "Purchase Order not found", meta: null },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };
    if (updateData.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateData.expectedDeliveryDate);
    }
    if (updateData.status === "RECEIVED" && po.status !== "RECEIVED") {
      updateData.receivedDate = new Date();
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: updatedPo,
      error: null,
      meta: { message: "Purchase Order updated successfully" },
    });
  } catch (error: any) {
    console.error("PATCH purchase order error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
