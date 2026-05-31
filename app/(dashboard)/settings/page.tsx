"use client";

import React, { useState, useEffect } from "react";
import { Settings, ShieldAlert, Globe, Coins, BadgeAlert, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import AlertBanner from "@/components/AlertBanner";

export default function SettingsPage() {
  const { user } = useUser();
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [orgName, setOrgName] = useState("Antigravity SCM");
  const [success, setSuccess] = useState(false);

  const activeRole = (user?.publicMetadata?.role as string) || "VIEWER";

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Enterprise Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure multi-tenant organization context, fiscal targets, and review access levels.</p>
      </div>

      {success && (
        <AlertBanner type="info" title="Configuration Updated" message="Organization settings have been cleared and saved in registry." />
      )}

      {/* Grid details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Col: Org Configurations */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-400" />
                <span>Organization Parameters</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Configure core values used across reporting ledgers</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="set-org-name" className="text-xs font-semibold text-slate-400">Organization Display Name</Label>
                    <Input
                      id="set-org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-currency" className="text-xs font-semibold text-slate-400">Reporting Currency</Label>
                    <select
                      id="set-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="USD">USD ($) - US Dollars</option>
                      <option value="INR">INR (₹) - Indian Rupees</option>
                      <option value="EUR">EUR (€) - Euros</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-tz" className="text-xs font-semibold text-slate-400">Local Timezone</Label>
                    <select
                      id="set-tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="UTC">UTC - Coordinated Time</option>
                      <option value="IST">IST - Indian Standard Time</option>
                      <option value="PST">PST - Pacific Standard Time</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-850">
                  <Button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold">
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: RBAC Guard details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg border-t-4 border-t-slate-500 overflow-hidden">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                <span>Active Credentials</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs font-semibold text-slate-400">
              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <span className="text-slate-500">Your Assigned Role:</span>
                <span className="rounded-full bg-slate-800 text-slate-300 py-0.5 px-2.5 font-bold uppercase tracking-wider">
                  {activeRole}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-slate-200 font-bold">Role Capabilities Reference:</h4>
                <ul className="space-y-2 text-[11px] text-slate-500 list-disc pl-4 leading-relaxed">
                  <li><strong className="text-slate-400">ADMIN:</strong> Full workspace authorization, database modifications, PO approvals, and global parameters adjustments.</li>
                  <li><strong className="text-slate-400">MANAGER:</strong> Write catalog entries, draft/approve purchase orders, transfer logistics, and audit directories.</li>
                  <li><strong className="text-slate-400">WAREHOUSE_STAFF:</strong> Adjust manual stocks, log goods receipts, transfer stock levels, and dispatch shipments.</li>
                  <li><strong className="text-slate-400">VIEWER:</strong> View-only read configurations. All write, adjust, and approve buttons are dynamically hidden.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
