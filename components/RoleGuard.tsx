"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";

export type Role = "ADMIN" | "MANAGER" | "WAREHOUSE_STAFF" | "VIEWER";

const ROLE_RANKS: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  WAREHOUSE_STAFF: 2,
  VIEWER: 1,
};

interface RoleGuardProps {
  children: React.ReactNode;
  minRole: Role;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  children,
  minRole,
  fallback = null,
}: RoleGuardProps) {
  const { isLoaded, isSignedIn, user } = useUser();

  // Show nothing while Clerk session resolves
  if (!isLoaded) return null;

  // Enforce session check
  if (!isSignedIn || !user) {
    return <>{fallback}</>;
  }

  // Retrieve user role from publicMetadata
  const userRole = (user.publicMetadata?.role as Role) || "VIEWER";
  const userRank = ROLE_RANKS[userRole] || 1;
  const requiredRank = ROLE_RANKS[minRole];

  // If role rank is below requirements, render optional fallback
  if (userRank < requiredRank) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
