import React from "react";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SupplierRatingProps {
  rating: number;
  leadTimeDays?: number;
}

export default function SupplierRating({ rating, leadTimeDays }: SupplierRatingProps) {
  // Clamp rating between 1 and 5
  const activeStars = Math.max(1, Math.min(5, Math.round(rating)));

  return (
    <div className="flex flex-col gap-1.5">
      {/* Stars Grid */}
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < activeStars
                ? "fill-amber-500 text-amber-500"
                : "text-slate-700 fill-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Lead Time Badge */}
      {leadTimeDays !== undefined && (
        <div className="flex items-center">
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] py-0 px-1.5 bg-slate-900/40 text-slate-400 border-slate-800"
          >
            <Clock className="h-3 w-3" />
            <span>{leadTimeDays}d lead time</span>
          </Badge>
        </div>
      )}
    </div>
  );
}
