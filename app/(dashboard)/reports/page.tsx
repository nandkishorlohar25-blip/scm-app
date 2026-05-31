"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, PieChart, Info, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartPie,
  Pie,
  Cell,
  Legend,
} from "recharts";
import AlertBanner from "@/components/AlertBanner";

interface ValuationReport {
  totalValuation: number;
  valuationByCategory: Record<string, number>;
  valuationByWarehouse: Array<{ name: string; value: number }>;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ValuationReport>({
    totalValuation: 352500, // cents/paise
    valuationByCategory: {
      "Raw Materials": 187500,
      "Finished Goods": 120000,
      "Packaging": 45000,
    },
    valuationByWarehouse: [
      { name: "Primary Warehouse", value: 232500 },
      { name: "Secondary Facility", value: 120000 },
    ],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchValuation = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/inventory/valuation");
        const resJson = await res.json();
        if (resJson.data) {
          setReport(resJson.data);
        }
      } catch (err) {
        console.error("Error loading valuation report:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchValuation();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val / 100);
  };

  // Format data for Recharts category Pie
  const categoryChartData = Object.entries(report.valuationByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#64748b", "#475569", "#334155", "#1e293b", "#0f172a"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Analytics & Valuation Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Audit current SCM inventory assets value, location spreads, and categorical allocations.</p>
      </div>

      {/* Hero Metric Card */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg border-l-4 border-l-slate-400">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 tracking-wider">TOTAL INVENTORY ASSET VALUATION</span>
            <div className="text-4xl font-extrabold text-slate-100 flex items-center gap-1.5 pt-1">
              <DollarSign className="h-9 w-9 text-slate-500 shrink-0" />
              <span>{formatCurrency(report.totalValuation)}</span>
            </div>
          </div>
          <AlertBanner
            type="info"
            title="Accounting Note"
            message="Asset values represent SUM(quantityOnHand * costPrice) in dollar lowest denominations. Excludes reserved allocations."
          />
        </CardContent>
      </Card>

      {/* Grid of charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Split Pie */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="border-b border-slate-850 pb-4">
            <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
              <PieChart className="h-5 w-5 text-slate-400" />
              <span>Categorical Asset Splits</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">Asset shares grouped by product catalog category</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPie>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelStyle={{ color: "#f8fafc", fontSize: 10 }}
                    itemStyle={{ color: "#f8fafc", fontSize: 10 }}
                    formatter={(v: any) => [formatCurrency(v), "Share Value"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </RechartPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Spreads Bar */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="border-b border-slate-850 pb-4">
            <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              <span>Warehouse Stock Spread</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">Asset levels stored in each warehouse facility</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.valuationByWarehouse}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 100000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelStyle={{ color: "#f8fafc", fontSize: 10 }}
                    itemStyle={{ color: "#f8fafc", fontSize: 10 }}
                    formatter={(v: any) => [formatCurrency(v), "Warehouse Share"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                    {report.valuationByWarehouse.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
