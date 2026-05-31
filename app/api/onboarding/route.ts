import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import * as z from "zod";

const onboardingSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  businessType: z.enum(["MANUFACTURING", "RETAIL"]),
  currency: z.string().default("USD"),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized: Missing session", meta: null }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ data: null, error: "Unauthorized: User not found", meta: null }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = onboardingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { organizationName, businessType, currency } = validation.data;

    // Use a transaction to ensure all operations succeed atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          type: businessType,
          currency,
          timezone: "UTC",
          fiscalYearStart: "01-01",
        },
      });

      // 2. Create Default Warehouse
      const warehouse = await tx.warehouse.create({
        data: {
          orgId: org.id,
          name: "Primary Warehouse",
          location: "Central Hub",
          address: "Main Operations Facility",
          managerId: userId,
          isActive: true,
        },
      });

      // 3. Upsert User in DB as ADMIN
      const dbUser = await tx.user.upsert({
        where: { id: userId },
        update: {
          orgId: org.id,
          role: "ADMIN",
          isActive: true,
        },
        create: {
          id: userId,
          orgId: org.id,
          role: "ADMIN",
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "SCM User",
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          isActive: true,
        },
      });

      return { org, warehouse, dbUser };
    });

    // Note: In a production environment, you would also invoke the Clerk Backend SDK
    // to sync publicMetadata:
    // await clerkClient.users.updateUserMetadata(userId, {
    //   publicMetadata: { role: "ADMIN", orgId: result.org.id }
    // });

    return NextResponse.json({
      data: {
        organization: result.org,
        warehouse: result.warehouse,
        user: result.dbUser,
      },
      error: null,
      meta: { message: "Onboarding completed successfully" },
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { data: null, error: error.message || "Internal server error", meta: null },
      { status: 500 }
    );
  }
}
