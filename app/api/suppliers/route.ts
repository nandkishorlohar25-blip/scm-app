import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const supplierCreateSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  leadTimeDays: z.number().int().positive("Lead time must be positive").default(7),
  paymentTerms: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
});

export async function GET(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {
      orgId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: suppliers,
      error: null,
      meta: { count: suppliers.length },
    });
  } catch (error: any) {
    console.error("GET suppliers error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("MANAGER");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = supplierCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    // Clean up empty email entries
    const cleanData = { ...validation.data };
    if (cleanData.email === "") {
      cleanData.email = null;
    }

    const supplier = await prisma.supplier.create({
      data: {
        orgId,
        ...cleanData,
        isActive: true,
      },
    });

    return NextResponse.json({
      data: supplier,
      error: null,
      meta: { message: "Supplier created successfully" },
    });
  } catch (error: any) {
    console.error("POST supplier error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
