import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const receiveSchema = z.object({
  warehouseId: z.string().uuid("Invalid Warehouse ID"),
  items: z.array(
    z.object({
      productId: z.string().uuid("Invalid Product ID"),
      quantityReceived: z.number().int().positive("Quantity received must be positive"),
    })
  ).min(1, "Must receive at least one item"),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Only WAREHOUSE_STAFF, MANAGER, and ADMIN can receive goods
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId, userId } = userContext;
    const { id: poId } = params;

    const body = await req.json().catch(() => ({}));
    const validation = receiveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { warehouseId, items } = validation.data;

    // Verify warehouse belongs to organization
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, orgId, isActive: true },
    });
    if (!warehouse) {
      return NextResponse.json({ data: null, error: "Warehouse not found in organization", meta: null }, { status: 404 });
    }

    // Verify Purchase Order exists and belongs to organization
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId },
      include: {
        lines: true,
      },
    });
    if (!po) {
      return NextResponse.json({ data: null, error: "Purchase Order not found", meta: null }, { status: 404 });
    }

    if (po.status === "RECEIVED") {
      return NextResponse.json({ data: null, error: "Purchase Order has already been fully received", meta: null }, { status: 400 });
    }

    // Atomic transaction for receiving goods
    const result = await prisma.$transaction(async (tx) => {
      // 1. Process each item receipt
      for (const item of items) {
        const matchingLine = po.lines.find((l) => l.productId === item.productId);
        if (!matchingLine) {
          throw new Error(`Product ${item.productId} is not part of this Purchase Order`);
        }

        const newReceivedQty = matchingLine.quantityReceived + item.quantityReceived;

        if (newReceivedQty > matchingLine.quantityOrdered) {
          throw new Error(
            `Over-receipt blocked. Product ID: ${item.productId}. Ordered: ${matchingLine.quantityOrdered}, Total Received would be: ${newReceivedQty}`
          );
        }

        // 1.1 Update PO line received count
        await tx.purchaseOrderLine.update({
          where: { id: matchingLine.id },
          data: { quantityReceived: newReceivedQty },
        });

        // 1.2 Upsert InventoryItem in destination warehouse
        const invItem = await tx.inventoryItem.findUnique({
          where: {
            warehouseId_productId: { warehouseId, productId: item.productId },
          },
        });

        if (invItem) {
          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { quantityOnHand: invItem.quantityOnHand + item.quantityReceived },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              warehouseId,
              productId: item.productId,
              quantityOnHand: item.quantityReceived,
              quantityReserved: 0,
              binLocation: "A-01",
            },
          });
        }

        // 1.3 Log StockMovement Receipt
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId,
            type: "RECEIPT",
            quantity: item.quantityReceived,
            referenceId: poId,
            referenceType: "PURCHASE_ORDER",
            performedById: userId,
            notes: `Received from PO ID ${poId}`,
          },
        });
      }

      // 2. Evaluate if PO is fully received
      const updatedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: poId },
      });

      const isFullyReceived = updatedLines.every((line) => line.quantityReceived >= line.quantityOrdered);

      // 3. Transition PO status
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: isFullyReceived ? "RECEIVED" : "CONFIRMED", // Partially received remains confirmed
          receivedDate: isFullyReceived ? new Date() : null,
        },
        include: {
          lines: true,
          supplier: true,
        },
      });

      return updatedPo;
    });

    return NextResponse.json({
      data: result,
      error: null,
      meta: { message: "Goods received and recorded in inventory successfully" },
    });
  } catch (error: any) {
    console.error("Receive PO error:", error);
    return NextResponse.json(
      { data: null, error: error.message || "Internal server error", meta: null },
      { status: 400 }
    );
  }
}
