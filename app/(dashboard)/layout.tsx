"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Package,
  Users,
  ClipboardList,
  Warehouse,
  Truck,
  BarChart3,
  Settings,
  Bell,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CommandPalette from "@/components/CommandPalette";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  const userRole = (user?.publicMetadata?.role as string) || "VIEWER";

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-wider text-slate-200">
          <Warehouse className="h-6 w-6 text-slate-400" />
          <span>SCM SYSTEM</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-800 text-slate-100 border-l-4 border-slate-400"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-slate-300">{user?.fullName || "SCM User"}</span>
            <span className="text-slate-500 capitalize">{userRole.replace("_", " ").toLowerCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-slate-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-slate-400">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r border-slate-800">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Org Switcher Context */}
            <div className="hidden sm:block">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: "text-slate-300 bg-slate-800/40 border border-slate-800 rounded-md py-1 px-3",
                    organizationSwitcherTrigger: "text-slate-300 hover:text-slate-100",
                  },
                }}
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-slate-400"></span>
            </Button>

            <div className="border-l border-slate-800 pl-4 flex items-center">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8 rounded-full border border-slate-800",
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]">
          {children}
          <CommandPalette />
        </main>
      </div>
    </div>
  );
}
