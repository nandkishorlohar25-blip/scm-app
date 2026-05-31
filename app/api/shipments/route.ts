import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const shipmentCreateSchema = z.object({
  type: z.enum(["INBOUND", "OUTBOUND"]),
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"]).default("PENDING"),
  trackingNumber: z.string().optional().nullable(),
  carrier: z.string().optional().nullable(),
  originAddress: z.string().optional().nullable(),
  destinationAddress: z.string().optional().nullable(),
  dispatchDate: z.string().optional().nullable(),
  estimatedArrival: z.string().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      orgId,
    };

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        warehouse: true,
      },
      orderBy: { estimatedArrival: "asc" },
    });

    return NextResponse.json({
      data: shipments,
      error: null,
      meta: { count: shipments.length },
    });
  } catch (error: any) {
    console.error("GET shipments error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = shipmentCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const valData = validation.data;

    // Check if warehouse is specified and belongs to the org
    if (valData.warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: valData.warehouseId, orgId, isActive: true },
      });
      if (!warehouse) {
        return NextResponse.json({ data: null, error: "Warehouse not found in organization", meta: null }, { status: 404 });
      }
    }

    const shipment = await prisma.shipment.create({
      data: {
        orgId,
        type: valData.type,
        status: valData.status,
        trackingNumber: valData.trackingNumber,
        carrier: valData.carrier,
        originAddress: valData.originAddress,
        destinationAddress: valData.destinationAddress,
        dispatchDate: valData.dispatchDate ? new Date(valData.dispatchDate) : null,
        estimatedArrival: valData.estimatedArrival ? new Date(valData.estimatedArrival) : null,
        warehouseId: valData.warehouseId,
      },
    });

    return NextResponse.json({
      data: shipment,
      error: null,
      meta: { message: "Shipment created successfully" },
    });
  } catch (error: any) {
    console.error("POST shipment error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
