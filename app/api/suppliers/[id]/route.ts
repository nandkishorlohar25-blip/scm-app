import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import * as z from "zod";

const supplierUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  leadTimeDays: z.number().int().positive().optional(),
  paymentTerms: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userContext = await requireRole("MANAGER");
    const { orgId } = userContext;
    const { id } = params;

    const body = await req.json().catch(() => ({}));
    const validation = supplierUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id, orgId, isActive: true },
    });
    if (!supplier) {
      return NextResponse.json({ data: null, error: "Supplier not found", meta: null }, { status: 404 });
    }

    const cleanData = { ...validation.data };
    if (cleanData.email === "") {
      cleanData.email = null;
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: cleanData,
    });

    return NextResponse.json({
      data: updatedSupplier,
      error: null,
      meta: { message: "Supplier updated successfully" },
    });
  } catch (error: any) {
    console.error("PATCH supplier error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
