import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const adjustSchema = z.object({
  productId: z.string().uuid("Invalid Product ID"),
  warehouseId: z.string().uuid("Invalid Warehouse ID"),
  quantity: z.number().int("Quantity must be an integer"), // positive to add, negative to deduct
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Requires WAREHOUSE_STAFF, MANAGER, or ADMIN privileges
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId, userId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = adjustSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { productId, warehouseId, quantity, notes } = validation.data;

    // Verify product exists and belongs to the org
    const product = await prisma.product.findFirst({
      where: { id: productId, orgId, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ data: null, error: "Product not found in organization", meta: null }, { status: 404 });
    }

    // Verify warehouse exists and belongs to the org
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, orgId, isActive: true },
    });
    if (!warehouse) {
      return NextResponse.json({ data: null, error: "Warehouse not found in organization", meta: null }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch or create inventory item
      const invItem = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_productId: { warehouseId, productId },
        },
      });

      const currentQty = invItem ? invItem.quantityOnHand : 0;
      const newQty = currentQty + quantity;

      if (newQty < 0) {
        throw new Error(`Insufficient stock. Current: ${currentQty}, Requested reduction: ${Math.abs(quantity)}`);
      }

      let updatedItem;
      if (invItem) {
        updatedItem = await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantityOnHand: newQty },
        });
      } else {
        updatedItem = await tx.inventoryItem.create({
          data: {
            warehouseId,
            productId,
            quantityOnHand: newQty,
            quantityReserved: 0,
            binLocation: "A-01",
          },
        });
      }

      // 2. Log StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          type: "ADJUSTMENT",
          quantity,
          referenceId: "MANUAL_ADJUST",
          referenceType: "MANUAL",
          performedById: userId,
          notes: notes || "Manual stock adjustment",
        },
      });

      // 3. Reorder alert trigger check
      const isBelowReorder = newQty <= product.reorderPoint;

      return { updatedItem, movement, isBelowReorder };
    });

    return NextResponse.json({
      data: {
        inventoryItem: result.updatedItem,
        stockMovement: result.movement,
      },
      error: null,
      meta: {
        message: "Inventory adjusted successfully",
        reorderAlert: result.isBelowReorder,
        reorderAlertMessage: result.isBelowReorder
          ? `Product "${product.name}" stock is at ${result.updatedItem.quantityOnHand} which is below the reorder point of ${product.reorderPoint}!`
          : null,
      },
    });
  } catch (error: any) {
    console.error("POST inventory adjust error:", error);
    return NextResponse.json(
      { data: null, error: error.message || "Internal server error", meta: null },
      { status: 400 }
    );
  }
}
