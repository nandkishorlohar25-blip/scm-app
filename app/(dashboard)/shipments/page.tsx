"use client";

import React, { useState, useEffect } from "react";
import { Truck, Navigation, Calendar, Plus, RefreshCw } from "lucide-react";
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
import StatusBadge from "@/components/StatusBadge";
import DataTable, { Column } from "@/components/DataTable";
import AlertBanner from "@/components/AlertBanner";

interface ShipmentItem {
  id: string;
  type: "INBOUND" | "OUTBOUND";
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "RETURNED";
  trackingNumber: string | null;
  carrier: string | null;
  originAddress: string | null;
  destinationAddress: string | null;
  estimatedArrival: string | null;
}

export default function ShipmentsPage() {
  const [data, setData] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Form States
  const [type, setType] = useState<"INBOUND" | "OUTBOUND">("OUTBOUND");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");

  const defaultShipments: ShipmentItem[] = [
    { id: "s-101", type: "INBOUND", status: "IN_TRANSIT", trackingNumber: "TRK-9831-A", carrier: "DHL Express", originAddress: "Steel Corp Hub, Cleveland, OH", destinationAddress: "Primary Warehouse, Detroit, MI", estimatedArrival: "2026-06-03" },
    { id: "s-102", type: "OUTBOUND", status: "PENDING", trackingNumber: "TRK-2204-B", carrier: "FedEx Freight", originAddress: "Primary Warehouse, Detroit, MI", destinationAddress: "Retail Store #14, Indianapolis, IN", estimatedArrival: "2026-06-05" },
    { id: "s-103", type: "INBOUND", status: "DELIVERED", trackingNumber: "TRK-4512-C", carrier: "UPS Ground", originAddress: "Apex Materials Inc., Gary, IN", destinationAddress: "Primary Warehouse, Detroit, MI", estimatedArrival: "2026-05-29" },
  ];

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shipments");
      const resJson = await res.json();
      if (resJson.data && resJson.data.length > 0) {
        setData(
          resJson.data.map((s: any) => ({
            id: s.id,
            type: s.type,
            status: s.status,
            trackingNumber: s.trackingNumber,
            carrier: s.carrier,
            originAddress: s.originAddress,
            destinationAddress: s.destinationAddress,
            estimatedArrival: s.estimatedArrival ? s.estimatedArrival.slice(0, 10) : null,
          }))
        );
      } else {
        setData(defaultShipments);
      }
    } catch (err) {
      console.error("Error loading shipments:", err);
      setData(defaultShipments);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          status: "PENDING",
          trackingNumber,
          carrier,
          originAddress,
          destinationAddress,
          estimatedArrival: estimatedArrival || undefined,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error || "Failed to create shipment.");
      } else {
        setOpen(false);
        fetchShipments();
        // Reset states
        setTrackingNumber("");
        setCarrier("");
        setOriginAddress("");
        setDestinationAddress("");
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    let nextStatus: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" = "PENDING";
    if (currentStatus === "PENDING") nextStatus = "IN_TRANSIT";
    else if (currentStatus === "IN_TRANSIT") nextStatus = "DELIVERED";
    else return; // Only process main forwards transitions

    try {
      const res = await fetch(`/api/shipments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchShipments();
      }
    } catch (err) {
      console.error("Error changing status:", err);
    }
  };

  const columns: Column<ShipmentItem>[] = [
    { accessor: "trackingNumber", header: "Tracking No", render: (val) => val || "-" },
    { accessor: "type", header: "Direction", render: (val) => <span className="font-semibold tracking-wider">{val}</span> },
    { accessor: "carrier", header: "Carrier" },
    { accessor: "originAddress", header: "Origin Hub", render: (val) => <span className="truncate max-w-[120px] block">{val}</span> },
    { accessor: "destinationAddress", header: "Destination Yard", render: (val) => <span className="truncate max-w-[120px] block">{val}</span> },
    { accessor: "estimatedArrival", header: "Expected Date" },
    {
      accessor: "status",
      header: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      accessor: "actions",
      header: "Logistics Toggle",
      sortable: false,
      render: (_, row) => {
        if (row.status === "DELIVERED" || row.status === "RETURNED") return "-";
        const btnLabel = row.status === "PENDING" ? "Dispatch" : "Deliver";
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpdateStatus(row.id, row.status)}
            className="h-7 text-[10px] py-0 px-2 text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/60"
          >
            {btnLabel}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Logistics & Shipments</h1>
          <p className="text-slate-400 text-sm mt-1">Track inbound supplier materials, outbound store replenishment, and dispatch states.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold shadow-lg">
              <Plus className="h-4 w-4" />
              <span>Create Shipment</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
            <DialogHeader className="border-b border-slate-850 pb-3 mb-4">
              <DialogTitle className="text-slate-100 font-semibold tracking-wide flex items-center gap-2">
                <Truck className="h-5 w-5 text-slate-400" />
                <span>Dispatch Shipment</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateShipment} className="space-y-4">
              {errorText && <AlertBanner type="error" title="Dispatch Failed" message={errorText} />}

              {/* Type Select */}
              <div className="space-y-1.5">
                <Label htmlFor="ship-type" className="text-xs font-semibold text-slate-400">Direction</Label>
                <select
                  id="ship-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 outline-none"
                >
                  <option value="OUTBOUND">OUTBOUND (To stores/clients)</option>
                  <option value="INBOUND">INBOUND (From suppliers)</option>
                </select>
              </div>

              {/* Tracking & Carrier */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ship-trk" className="text-xs font-semibold text-slate-400">Tracking No</Label>
                  <Input
                    id="ship-trk"
                    placeholder="TRK-8829-X"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ship-carrier" className="text-xs font-semibold text-slate-400">Carrier</Label>
                  <Input
                    id="ship-carrier"
                    placeholder="e.g. UPS Ground"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ship-org" className="text-xs font-semibold text-slate-400">Origin Hub</Label>
                  <Input
                    id="ship-org"
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ship-dest" className="text-xs font-semibold text-slate-400">Destination Yard</Label>
                  <Input
                    id="ship-dest"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Expected Date */}
              <div className="space-y-1.5">
                <Label htmlFor="ship-eta" className="text-xs font-semibold text-slate-400">Estimated Arrival</Label>
                <Input
                  id="ship-eta"
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-200"
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
                  Confirm Shipment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shipments Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="trackingNumber"
        searchPlaceholder="Search cargo by tracking number..."
      />
    </div>
  );
}
