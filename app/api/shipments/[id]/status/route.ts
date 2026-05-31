import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId } = userContext;
    const { id } = params;

    const body = await req.json().catch(() => ({}));
    const validation = statusUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { status } = validation.data;

    // Verify shipment exists
    const shipment = await prisma.shipment.findFirst({
      where: { id, orgId },
    });
    if (!shipment) {
      return NextResponse.json({ data: null, error: "Shipment not found", meta: null }, { status: 404 });
    }

    const updateData: any = { status };
    if (status === "IN_TRANSIT" && !shipment.dispatchDate) {
      updateData.dispatchDate = new Date();
    }
    if ((status === "DELIVERED" || status === "RETURNED") && !shipment.actualArrival) {
      updateData.actualArrival = new Date();
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: updatedShipment,
      error: null,
      meta: { message: "Shipment status updated successfully" },
    });
  } catch (error: any) {
    console.error("PATCH shipment status error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
