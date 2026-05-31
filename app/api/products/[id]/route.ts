import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const productUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().min(2).optional(),
  unitOfMeasure: z.string().min(1).optional(),
  costPrice: z.number().int().nonnegative().optional(),
  sellingPrice: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQty: z.number().int().positive().optional(),
  type: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "MERCHANDISE"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;
    const { id } = params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        orgId,
        isActive: true,
      },
      include: {
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
        bomFinished: {
          include: {
            rawMaterial: true,
          },
        },
        bomMaterials: {
          include: {
            finishedProduct: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { data: null, error: "Product not found", meta: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: product, error: null, meta: null });
  } catch (error: any) {
    console.error("GET product by ID error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // MANAGER or ADMIN can update products
    const userContext = await requireRole("MANAGER");
    const { orgId } = userContext;
    const { id } = params;

    const body = await req.json().catch(() => ({}));
    const validation = productUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    // Verify product exists and belongs to the organization
    const product = await prisma.product.findFirst({
      where: {
        id,
        orgId,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { data: null, error: "Product not found", meta: null },
        { status: 404 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      data: updatedProduct,
      error: null,
      meta: { message: "Product updated successfully" },
    });
  } catch (error: any) {
    console.error("PATCH product by ID error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Only ADMIN can soft-delete products to safeguard critical inventory
    const userContext = await requireRole("ADMIN");
    const { orgId } = userContext;
    const { id } = params;

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: {
        id,
        orgId,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { data: null, error: "Product not found", meta: null },
        { status: 404 }
      );
    }

    // Perform soft-delete
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      data: null,
      error: null,
      meta: { message: "Product soft deleted successfully" },
    });
  } catch (error: any) {
    console.error("DELETE product error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
