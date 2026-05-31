"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Package,
  Users,
  ClipboardCheck,
  Truck,
  ArrowRight,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import StatusBadge from "@/components/StatusBadge";
import AlertBanner from "@/components/AlertBanner";
import StockMovementModal from "@/components/StockMovementModal";
import Link from "next/link";

interface DashboardMetrics {
  totalSkus: number;
  lowStockAlerts: number;
  openPos: number;
  shipmentsInTransit: number;
}

interface AlertData {
  lowStock: Array<{ id: string; sku: string; name: string; quantityOnHand: number; reorderPoint: number }>;
  overduePurchaseOrders: Array<{ id: string; supplierName: string; expectedDeliveryDate: string; status: string }>;
  delayedShipments: Array<{ id: string; trackingNumber: string; carrier: string; estimatedArrival: string }>;
}

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSkus: 24,
    lowStockAlerts: 3,
    openPos: 6,
    shipmentsInTransit: 2,
  });

  const [alerts, setAlerts] = useState<AlertData>({
    lowStock: [
      { id: "1", sku: "RAW-STL-002", name: "Grade A Steel Rods", quantityOnHand: 45, reorderPoint: 100 },
      { id: "2", sku: "PKG-BOX-M", name: "Medium Cardboard Boxes", quantityOnHand: 200, reorderPoint: 250 },
    ],
    overduePurchaseOrders: [
      { id: "po-12", supplierName: "Apex Materials Inc.", expectedDeliveryDate: "2026-05-25T12:00:00Z", status: "SENT" },
    ],
    delayedShipments: [
      { id: "s-45", trackingNumber: "TRK-9831-A", carrier: "DHL Express", estimatedArrival: "2026-05-29T18:00:00Z" },
    ],
  });

  const [trendData, setTrendData] = useState<Array<{ date: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for stock movements
  const stockMovements = [
    { id: "m1", sku: "RAW-STL-002", type: "ISSUE", qty: -15, warehouse: "Primary Warehouse", date: "10 mins ago", user: "John Doe" },
    { id: "m2", sku: "PKG-BOX-M", type: "RECEIPT", qty: 500, warehouse: "Primary Warehouse", date: "1 hr ago", user: "Jane Smith" },
    { id: "m3", sku: "FIN-TBL-04", type: "TRANSFER", qty: 25, warehouse: "Secondary Facility", date: "3 hrs ago", user: "Bob Johnson" },
    { id: "m4", sku: "MER-MUG-001", type: "ADJUSTMENT", qty: -2, warehouse: "Primary Warehouse", date: "Yesterday", user: "John Doe" },
    { id: "m5", sku: "RAW-STL-002", type: "RECEIPT", qty: 200, warehouse: "Primary Warehouse", date: "2 days ago", user: "System Auto" },
  ];

  // Mock data for Top Suppliers
  const supplierData = [
    { name: "Apex Materials", value: 45 },
    { name: "Global Box Co", value: 32 },
    { name: "Zenith Parts", value: 28 },
    { name: "LogiShip Logistics", value: 19 },
    { name: "Quantum Steel", value: 14 },
  ];

  const BAR_COLORS = ["#64748b", "#475569", "#334155", "#1e293b", "#0f172a"];

  useEffect(() => {
    // Attempt to load metrics, alerts, and trend from live API routes
    const loadDashboardData = async () => {
      try {
        const [resMet, resAlt, resTrend] = await Promise.all([
          fetch("/api/dashboard/metrics"),
          fetch("/api/dashboard/alerts"),
          fetch("/api/reports/inventory-trend"),
        ]);
        
        const dataMet = await resMet.json();
        if (dataMet.data) setMetrics(dataMet.data);

        const dataAlt = await resAlt.json();
        if (dataAlt.data) setAlerts(dataAlt.data);

        const dataTrend = await resTrend.json();
        if (dataTrend.data) {
          setTrendData(dataTrend.data);
        }
      } catch (err) {
        console.error("Error fetching live dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatCurrency = (val: number) => {
    // Converts lowest denomination integers (cents/paise) back into formatted dollars/rupees
    const dollarVal = val / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(dollarVal);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">SCM Command Center</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time supply chain oversight, replenishment status, and asset valuation.</p>
        </div>
        <div className="flex gap-3">
          <StockMovementModal />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 tracking-wider">TOTAL ACTIVE SKUS</CardTitle>
            <Package className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSkus}</div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Catalog size of active items</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 tracking-wider">LOW STOCK ALERTS</CardTitle>
            <AlertTriangle className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-200">{metrics.lowStockAlerts}</div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Items below safety thresholds</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 tracking-wider">OPEN PURCHASE ORDERS</CardTitle>
            <ClipboardCheck className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openPos}</div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Replenishment orders outstanding</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 tracking-wider">SHIPMENTS IN TRANSIT</CardTitle>
            <Truck className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.shipmentsInTransit}</div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Logistics deliveries moving</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Main Graphs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inventory Value Trend Line Chart */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-850 pb-4">
            <div>
              <CardTitle className="text-base font-semibold tracking-wide">Assets Valuation Trend</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">30-day timeline of total stock valuation in USD</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.length > 0 ? trendData : []}>
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v / 100000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelStyle={{ color: "#f8fafc", fontSize: 11, fontWeight: "bold" }}
                    itemStyle={{ color: "#94a3b8", fontSize: 11 }}
                    formatter={(v: any) => [formatCurrency(v), "Valuation"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Suppliers Bar Chart */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="border-b border-slate-850 pb-4">
            <CardTitle className="text-base font-semibold tracking-wide">Top Suppliers</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">Ranked by volume of purchase orders placed</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierData} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelStyle={{ color: "#f8fafc", fontSize: 10 }}
                    itemStyle={{ color: "#f8fafc", fontSize: 10 }}
                    formatter={(v: any) => [v, "Orders Placed"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                    {supplierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Alert Panels & Stock Stream */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Action Needed Alerts Panel */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="border-b border-slate-850 pb-4">
            <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              <span>Operations Alert Panel</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">Critical points requiring attention or replenishment</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 max-h-[360px] overflow-y-auto pr-2">
            {alerts.lowStock.map((prod) => (
              <AlertBanner
                key={prod.id}
                type="warning"
                title={`Low Stock Warning: ${prod.sku}`}
                message={`Product "${prod.name}" has dropped to ${prod.quantityOnHand} units. (Reorder point: ${prod.reorderPoint})`}
              />
            ))}

            {alerts.overduePurchaseOrders.map((po) => (
              <AlertBanner
                key={po.id}
                type="error"
                title={`Overdue Purchase Order: ${po.id.toUpperCase()}`}
                message={`PO placed with "${po.supplierName}" was expected on ${new Date(
                  po.expectedDeliveryDate
                ).toLocaleDateString()}. Status remains ${po.status}.`}
              />
            ))}

            {alerts.delayedShipments.map((s) => (
              <AlertBanner
                key={s.id}
                type="error"
                title={`Delayed Cargo Transit: ${s.trackingNumber}`}
                message={`Carrier "${s.carrier}" shipment has passed its estimated arrival of ${new Date(
                  s.estimatedArrival
                ).toLocaleDateString()}.`}
              />
            ))}

            {alerts.lowStock.length === 0 &&
              alerts.overduePurchaseOrders.length === 0 &&
              alerts.delayedShipments.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm font-semibold">
                  All systems within nominal margins. No alerts.
                </div>
              )}
          </CardContent>
        </Card>

        {/* Recent Stock Movements Stream */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-850 pb-4">
            <div>
              <CardTitle className="text-base font-semibold tracking-wide">Logistics Ledger</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">Latest 5 inventory transactions logged</CardDescription>
            </div>
            <Link
              href="/inventory"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <span>View ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stockMovements.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-850 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 bg-slate-800 border border-slate-700/60 mt-0.5">
                      <Receipt className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{item.sku}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.warehouse} • {item.date} • {item.user}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold ${item.qty > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {item.qty > 0 ? `+${item.qty}` : item.qty}
                    </span>
                    <StatusBadge status={item.type} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
