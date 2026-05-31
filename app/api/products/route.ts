import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const productCreateSchema = z.object({
  sku: z.string().min(3, "SKU must be at least 3 characters").max(30),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().min(2, "Category must be at least 2 characters"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  costPrice: z.number().int().nonnegative("Cost price must be a non-negative integer"),
  sellingPrice: z.number().int().nonnegative("Selling price must be a non-negative integer"),
  reorderPoint: z.number().int().nonnegative("Reorder point must be non-negative"),
  reorderQty: z.number().int().positive("Reorder quantity must be greater than zero"),
  type: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "MERCHANDISE"]),
  initialWarehouseId: z.string().optional(),
  initialQty: z.number().int().nonnegative().optional(),
});

export async function GET(req: Request) {
  try {
    // Authenticate and fetch orgId
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    // Parse URL parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {
      orgId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          inventoryItems: {
            include: {
              warehouse: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      error: null,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET products error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function POST(req: Request) {
  try {
    // Only WAREHOUSE_STAFF, MANAGER, and ADMIN can create products
    const userContext = await requireRole("WAREHOUSE_STAFF");
    const { orgId, userId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = productCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const valData = validation.data;

    // Check SKU uniqueness inside the organization
    const existingProduct = await prisma.product.findFirst({
      where: {
        orgId,
        sku: valData.sku,
        isActive: true,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { data: null, error: { sku: { _errors: ["SKU already exists in organization"] } }, meta: null },
        { status: 400 }
      );
    }

    // Atomic transaction for product and initial stock seeding
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          orgId,
          sku: valData.sku,
          name: valData.name,
          description: valData.description,
          category: valData.category,
          unitOfMeasure: valData.unitOfMeasure,
          costPrice: valData.costPrice,
          sellingPrice: valData.sellingPrice,
          reorderPoint: valData.reorderPoint,
          reorderQty: valData.reorderQty,
          type: valData.type,
          isActive: true,
        },
      });

      // If initial stock is seeded, create inventory record and movement log
      if (valData.initialWarehouseId && valData.initialQty !== undefined && valData.initialQty > 0) {
        await tx.inventoryItem.create({
          data: {
            warehouseId: valData.initialWarehouseId,
            productId: newProduct.id,
            quantityOnHand: valData.initialQty,
            quantityReserved: 0,
            binLocation: "A-01", // Default entry point bin
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: newProduct.id,
            warehouseId: valData.initialWarehouseId,
            type: "RECEIPT",
            quantity: valData.initialQty,
            referenceId: "INITIAL_SEED",
            referenceType: "MANUAL",
            performedById: userId,
            notes: "Initial inventory setup on product creation",
          },
        });
      }

      return newProduct;
    });

    return NextResponse.json({
      data: product,
      error: null,
      meta: { message: "Product created successfully" },
    });
  } catch (error: any) {
    console.error("POST product error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
