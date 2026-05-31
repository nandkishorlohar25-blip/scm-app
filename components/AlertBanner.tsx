import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AlertBannerProps {
  type: "warning" | "error" | "info";
  title: string;
  message: string;
}

export default function AlertBanner({ type, title, message }: AlertBannerProps) {
  let containerClass = "bg-sky-950/20 border-sky-900/50 text-sky-400";
  let Icon = Info;

  switch (type) {
    case "warning":
      containerClass = "bg-amber-950/20 border-amber-900/50 text-amber-400";
      Icon = AlertTriangle;
      break;
    case "error":
      containerClass = "bg-rose-950/20 border-rose-900/50 text-rose-400";
      Icon = AlertCircle;
      break;
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${containerClass}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold tracking-wide mb-1 text-slate-200">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
