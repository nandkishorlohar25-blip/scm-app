import React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
  let label = status.replace("_", " ");

  switch (status) {
    // Inventory Stock Statuses
    case "IN_STOCK":
      colorClass = "bg-emerald-950/40 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/40";
      label = "In Stock";
      break;
    case "LOW_STOCK":
      colorClass = "bg-amber-950/40 text-amber-400 border-amber-800/80 hover:bg-amber-950/40";
      label = "Low Stock";
      break;
    case "OUT_OF_STOCK":
      colorClass = "bg-rose-950/40 text-rose-400 border-rose-800/80 hover:bg-rose-950/40";
      label = "Out of Stock";
      break;

    // Purchase Order Statuses
    case "DRAFT":
      colorClass = "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800/60";
      break;
    case "SENT":
      colorClass = "bg-sky-950/40 text-sky-400 border-sky-800/80 hover:bg-sky-950/40";
      break;
    case "CONFIRMED":
      colorClass = "bg-violet-950/40 text-violet-400 border-violet-800/80 hover:bg-violet-950/40";
      break;
    case "RECEIVED":
      colorClass = "bg-emerald-950/40 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/40";
      break;
    case "CANCELLED":
      colorClass = "bg-rose-950/40 text-rose-400 border-rose-800/80 hover:bg-rose-950/40";
      break;

    // Shipment Statuses
    case "PENDING":
      colorClass = "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800/60";
      break;
    case "IN_TRANSIT":
      colorClass = "bg-blue-950/40 text-blue-400 border-blue-800/80 hover:bg-blue-950/40";
      label = "In Transit";
      break;
    case "DELIVERED":
      colorClass = "bg-emerald-950/40 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/40";
      break;
    case "RETURNED":
      colorClass = "bg-amber-950/40 text-amber-400 border-amber-800/80 hover:bg-amber-950/40";
      break;
  }

  return (
    <Badge variant="outline" className={`capitalize font-medium tracking-wide ${colorClass}`}>
      {label.toLowerCase()}
    </Badge>
  );
}
