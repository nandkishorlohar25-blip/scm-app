import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const transferSchema = z.object({
  productId: z.string().uuid("Invalid Product ID"),
  fromWarehouseId: z.string().uuid("Invalid Source Warehouse ID"),
  toWarehouseId: z.string().uuid("Invalid Destination Warehouse ID"),
  quantity: z.number().int().positive("Transfer quantity must be greater than zero"),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Requires WAREHOUSE_STAFF, MANAGER, or ADMIN privileges
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId, userId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = transferSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = validation.data;

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { data: null, error: "Source and destination warehouses must be different", meta: null },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to the org
    const product = await prisma.product.findFirst({
      where: { id: productId, orgId, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ data: null, error: "Product not found in organization", meta: null }, { status: 404 });
    }

    // Verify source warehouse
    const fromWarehouse = await prisma.warehouse.findFirst({
      where: { id: fromWarehouseId, orgId, isActive: true },
    });
    if (!fromWarehouse) {
      return NextResponse.json({ data: null, error: "Source warehouse not found in organization", meta: null }, { status: 404 });
    }

    // Verify destination warehouse
    const toWarehouse = await prisma.warehouse.findFirst({
      where: { id: toWarehouseId, orgId, isActive: true },
    });
    if (!toWarehouse) {
      return NextResponse.json({ data: null, error: "Destination warehouse not found in organization", meta: null }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check and deduct from source warehouse
      const sourceItem = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_productId: { warehouseId: fromWarehouseId, productId },
        },
      });

      if (!sourceItem || sourceItem.quantityOnHand < quantity) {
        throw new Error(
          `Insufficient stock at source warehouse "${fromWarehouse.name}". Available: ${
            sourceItem ? sourceItem.quantityOnHand : 0
          }`
        );
      }

      const updatedSourceItem = await tx.inventoryItem.update({
        where: { id: sourceItem.id },
        data: { quantityOnHand: sourceItem.quantityOnHand - quantity },
      });

      // 2. Fetch/create and add to destination warehouse
      const destItem = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_productId: { warehouseId: toWarehouseId, productId },
        },
      });

      let updatedDestItem;
      if (destItem) {
        updatedDestItem = await tx.inventoryItem.update({
          where: { id: destItem.id },
          data: { quantityOnHand: destItem.quantityOnHand + quantity },
        });
      } else {
        updatedDestItem = await tx.inventoryItem.create({
          data: {
            warehouseId: toWarehouseId,
            productId,
            quantityOnHand: quantity,
            quantityReserved: 0,
            binLocation: "A-01",
          },
        });
      }

      // 3. Log Source Deduction Movement
      const sourceMovement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId: fromWarehouseId,
          type: "TRANSFER",
          quantity: -quantity, // Negative for deduction
          referenceId: "TRANSFER_OUT",
          referenceType: "TRANSFER",
          performedById: userId,
          notes: notes || `Transfer out to ${toWarehouse.name}`,
        },
      });

      // 4. Log Destination Addition Movement
      const destMovement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          type: "TRANSFER",
          quantity, // Positive for addition
          referenceId: "TRANSFER_IN",
          referenceType: "TRANSFER",
          performedById: userId,
          notes: notes || `Transfer in from ${fromWarehouse.name}`,
        },
      });

      // 5. Reorder alert trigger check on source warehouse
      const isBelowReorder = updatedSourceItem.quantityOnHand <= product.reorderPoint;

      return { updatedSourceItem, updatedDestItem, sourceMovement, destMovement, isBelowReorder };
    });

    return NextResponse.json({
      data: {
        sourceInventoryItem: result.updatedSourceItem,
        destinationInventoryItem: result.updatedDestItem,
        sourceMovement: result.sourceMovement,
        destinationMovement: result.destMovement,
      },
      error: null,
      meta: {
        message: "Stock transferred successfully",
        reorderAlert: result.isBelowReorder,
        reorderAlertMessage: result.isBelowReorder
          ? `Product "${product.name}" stock in source warehouse "${fromWarehouse.name}" dropped to ${result.updatedSourceItem.quantityOnHand} which is below safety reorder levels.`
          : null,
      },
    });
  } catch (error: any) {
    console.error("POST inventory transfer error:", error);
    return NextResponse.json(
      { data: null, error: error.message || "Internal server error", meta: null },
      { status: 400 }
    );
  }
}
