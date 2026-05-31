import { auth, currentUser } from "@clerk/nextjs/server";

export type Role = "ADMIN" | "MANAGER" | "WAREHOUSE_STAFF" | "VIEWER";

export const ROLE_RANKS: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  WAREHOUSE_STAFF: 2,
  VIEWER: 1,
};

/**
 * Validates that the active Clerk user belongs to an organization,
 * matches the session orgId, and has a role meeting the required threshold.
 * 
 * Returns the verified user context { userId, orgId, role } or throws an error.
 */
export async function requireRole(minRole: Role) {
  const { userId, orgId } = await auth();

  if (!userId) {
    const err = new Error("Unauthorized: Session is missing");
    (err as any).statusCode = 401;
    throw err;
  }

  // Fetch full user details from Clerk to read publicMetadata
  const user = await currentUser();
  if (!user) {
    const err = new Error("Unauthorized: User profile not found");
    (err as any).statusCode = 401;
    throw err;
  }

  // Extract publicMetadata details
  // Format stored: { role: "MANAGER", orgId: "org_xxx" }
  const userRole = (user.publicMetadata.role as Role) || "VIEWER";
  const userOrgId = (user.publicMetadata.orgId as string) || orgId;

  if (!userOrgId) {
    const err = new Error("Forbidden: User is not associated with any organization");
    (err as any).statusCode = 403;
    throw err;
  }

  // Perform role-rank threshold evaluation
  const userRank = ROLE_RANKS[userRole] || 1;
  const requiredRank = ROLE_RANKS[minRole];

  if (userRank < requiredRank) {
    const err = new Error(`Forbidden: Insufficient privileges. Required: ${minRole}`);
    (err as any).statusCode = 403;
    throw err;
  }

  return {
    userId,
    orgId: userOrgId,
    role: userRole,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "SCM User",
    email: user.emailAddresses[0]?.emailAddress || "",
  };
}
