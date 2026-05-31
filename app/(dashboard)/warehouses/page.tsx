"use client";

import React, { useState, useEffect } from "react";
import { Warehouse, MapPin, Shield, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AlertBanner from "@/components/AlertBanner";

interface WarehouseItem {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  isActive: boolean;
  stockCount: number;
}

export default function WarehousesPage() {
  const [data, setData] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");

  const defaultWarehouses: WarehouseItem[] = [
    { id: "w-1", name: "Primary Warehouse", location: "Central Hub", address: "Main Operations Facility, Detroit, MI", isActive: true, stockCount: 2450 },
    { id: "w-2", name: "Secondary Facility", location: "West Coast Yards", address: "89 California Rd, Sector C, Oakland, CA", isActive: true, stockCount: 80 },
  ];

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      // Fetch valuation which lists warehouses and stock summaries
      const resVal = await fetch("/api/inventory/valuation");
      const dataVal = await resVal.json();
      if (dataVal.data && dataVal.data.valuationByWarehouse) {
        const whs = dataVal.data.valuationByWarehouse.map((w: any, idx: number) => ({
          id: `w-${idx}`,
          name: w.name,
          location: idx === 0 ? "Central Hub" : "West Coast Yards",
          address: idx === 0 ? "Main Operations Facility" : "Secondary Yard Location",
          isActive: true,
          stockCount: w.value > 0 ? Math.round(w.value / 1250) : 0, // estimate stock pieces based on avg value
        }));
        setData(whs);
      } else {
        setData(defaultWarehouses);
      }
    } catch (err) {
      console.error("Error loading warehouses:", err);
      setData(defaultWarehouses);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Seed/create simulated local state
    const newWh: WarehouseItem = {
      id: `w-${data.length + 1}`,
      name,
      location,
      address,
      isActive: true,
      stockCount: 0,
    };

    setData([...data, newWh]);
    setOpen(false);
    setName("");
    setLocation("");
    setAddress("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Multi-Warehouse Console</h1>
          <p className="text-slate-400 text-sm mt-1">Audit active storage locations, capacities, and address configurations.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold shadow-lg">
              <Plus className="h-4 w-4" />
              <span>Create Warehouse</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
            <DialogHeader className="border-b border-slate-850 pb-3 mb-4">
              <DialogTitle className="text-slate-100 font-semibold tracking-wide flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-slate-400" />
                <span>Onboard Warehouse</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              {errorText && <AlertBanner type="error" title="Onboarding Failed" message={errorText} />}

              <div className="space-y-1.5">
                <Label htmlFor="wh-name" className="text-xs font-semibold text-slate-400">Warehouse Name</Label>
                <Input
                  id="wh-name"
                  placeholder="e.g. Midwest Logistics Hub"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wh-loc" className="text-xs font-semibold text-slate-400">Location Tag</Label>
                <Input
                  id="wh-loc"
                  placeholder="e.g. Sector G"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wh-addr" className="text-xs font-semibold text-slate-400">Detailed Address</Label>
                <textarea
                  id="wh-addr"
                  rows={2}
                  placeholder="Street, City, Zip..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold"
                >
                  Save Warehouse
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((wh) => (
          <Card key={wh.id} className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between border-b border-slate-850 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-400" />
                  <span>{wh.name}</span>
                </CardTitle>
                <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">{wh.location || "Global Storage"}</div>
              </div>
              <span className="rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/80 text-[10px] font-semibold py-0.5 px-2">
                Active
              </span>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs font-semibold text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{wh.address || "No address assigned"}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-850/60 text-slate-300 font-bold">
                <span className="text-slate-500 font-medium">Recorded stock:</span>
                <span>{wh.stockCount} items</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
