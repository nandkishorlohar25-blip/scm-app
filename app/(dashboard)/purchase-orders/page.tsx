"use client";

import React, { useState, useEffect } from "react";
import { Plus, ToggleLeft, ToggleRight, List, Columns, Eye, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { Column } from "@/components/DataTable";
import AlertBanner from "@/components/AlertBanner";

interface POLine {
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

interface PurchaseOrderRow {
  id: string;
  supplierName: string;
  status: "DRAFT" | "SENT" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDeliveryDate: string | null;
  totalAmount: number;
  linesCount: number;
}

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"KANBAN" | "TABLE">("KANBAN");
  const [openWizard, setOpenWizard] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Supplier Options
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; costPrice: number }>>([]);

  // Wizard Form States
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([{ productId: "", quantityOrdered: 10, unitCost: 1000 }]);

  // Default seed POs if database is empty
  const defaultPOs: PurchaseOrderRow[] = [
    { id: "po-101", supplierName: "Apex Materials Inc.", status: "CONFIRMED", orderDate: "2026-05-28", expectedDeliveryDate: "2026-06-05", totalAmount: 187500, linesCount: 2 },
    { id: "po-102", supplierName: "Global Box Co", status: "RECEIVED", orderDate: "2026-05-24", expectedDeliveryDate: "2026-05-29", totalAmount: 45000, linesCount: 1 },
    { id: "po-103", supplierName: "Zenith Parts Ltd", status: "SENT", orderDate: "2026-05-30", expectedDeliveryDate: "2026-06-08", totalAmount: 120000, linesCount: 3 },
    { id: "po-104", supplierName: "Apex Materials Inc.", status: "DRAFT", orderDate: "2026-05-31", expectedDeliveryDate: "2026-06-07", totalAmount: 62500, linesCount: 1 },
  ];

  useEffect(() => {
    fetchPOs();
    fetchOptions();
  }, []);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/purchase-orders");
      const resJson = await res.json();
      if (resJson.data && resJson.data.length > 0) {
        setData(
          resJson.data.map((po: any) => ({
            id: po.id,
            supplierName: po.supplier.name,
            status: po.status,
            orderDate: po.orderDate.slice(0, 10),
            expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.slice(0, 10) : null,
            totalAmount: po.totalAmount,
            linesCount: po.lines.length,
          }))
        );
      } else {
        setData(defaultPOs);
      }
    } catch (err) {
      console.error("Error loading POs:", err);
      setData(defaultPOs);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [resSup, resProd] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/products?limit=100"),
      ]);
      const dataSup = await resSup.json();
      if (dataSup.data) {
        setSuppliers(dataSup.data);
        if (dataSup.data.length > 0) setSelectedSupplierId(dataSup.data[0].id);
      }
      const dataProd = await resProd.json();
      if (dataProd.data) {
        setProducts(dataProd.data);
        // Pre-fill initial line item
        if (dataProd.data.length > 0) {
          setLines([{ productId: dataProd.data[0].id, quantityOrdered: 50, unitCost: dataProd.data[0].costPrice }]);
        }
      }
    } catch (err) {
      console.error("Error loading wizard options:", err);
    }
  };

  const handleAddLine = () => {
    const defaultProduct = products[0];
    setLines([
      ...lines,
      {
        productId: defaultProduct ? defaultProduct.id : "",
        quantityOrdered: 50,
        unitCost: defaultProduct ? defaultProduct.costPrice : 1000,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const handleLineProductChange = (idx: number, pId: string) => {
    const matched = products.find((p) => p.id === pId);
    const updated = [...lines];
    updated[idx].productId = pId;
    if (matched) {
      updated[idx].unitCost = matched.costPrice;
    }
    setLines(updated);
  };

  const handleLineQtyChange = (idx: number, qty: number) => {
    const updated = [...lines];
    updated[idx].quantityOrdered = qty;
    setLines(updated);
  };

  const handleLineCostChange = (idx: number, costDollars: number) => {
    const updated = [...lines];
    updated[idx].unitCost = Math.round(costDollars * 100);
    setLines(updated);
  };

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Validate lines are filled
    const invalidLine = lines.some((l) => !l.productId || l.quantityOrdered <= 0 || l.unitCost <= 0);
    if (invalidLine) {
      setErrorText("All lines must contain a valid product, positive quantity, and cost.");
      return;
    }

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId || suppliers[0]?.id,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          notes,
          lines,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error || "Failed to submit Purchase Order");
      } else {
        setOpenWizard(false);
        fetchPOs();
        setNotes("");
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val / 100);
  };

  const columns: Column<PurchaseOrderRow>[] = [
    { accessor: "id", header: "Order ID" },
    { accessor: "supplierName", header: "Supplier" },
    {
      accessor: "status",
      header: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    { accessor: "orderDate", header: "Order Date" },
    { accessor: "expectedDeliveryDate", header: "Expected Arrival", render: (val) => val || "Not set" },
    {
      accessor: "totalAmount",
      header: "Total Cost",
      render: (val) => formatCurrency(val),
    },
    { accessor: "linesCount", header: "Lines" },
    {
      accessor: "actions",
      header: "Actions",
      sortable: false,
      render: (_, row) => (
        <Link href={`/purchase-orders/${row.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-200">
            <Eye className="h-4.5 w-4.5" />
          </Button>
        </Link>
      ),
    },
  ];

  // Kanban Columns Mapping
  const KANBAN_STATUSES = ["DRAFT", "SENT", "CONFIRMED", "RECEIVED"];

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Purchase Orders (POs)</h1>
          <p className="text-slate-400 text-sm mt-1">Manage vendor replenishment requests, draft items, and track arriving cargo.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "KANBAN" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Columns className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "TABLE" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Create PO Wizard */}
          <Dialog open={openWizard} onOpenChange={setOpenWizard}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold">
                <Plus className="h-4 w-4" />
                <span>Draft PO</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl overflow-y-auto max-h-[90vh]">
              <DialogHeader className="border-b border-slate-850 pb-3 mb-4">
                <DialogTitle className="text-slate-100 font-semibold tracking-wide flex items-center gap-2">
                  <span>Procurement Wizard</span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitPO} className="space-y-4">
                {errorText && <AlertBanner type="error" title="Drafting Failed" message={errorText} />}

                {/* Supplier selection & Expected Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-supplier" className="text-xs font-semibold text-slate-400">Supplier Vendor</Label>
                    <select
                      id="wiz-supplier"
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 focus:border-slate-500 focus:ring-0 outline-none"
                    >
                      {suppliers.length > 0 ? (
                        suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No suppliers loaded</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-date" className="text-xs font-semibold text-slate-400">Expected Delivery</Label>
                    <Input
                      id="wiz-date"
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Line Items Builder Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <Label className="text-sm font-bold text-slate-200">Line Items</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddLine}
                      className="h-7 text-xs text-slate-400 hover:text-slate-200 border border-slate-800"
                    >
                      Add Item
                    </Button>
                  </div>

                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      {/* Product select */}
                      <div className="flex-1 space-y-1">
                        {idx === 0 && <Label className="text-[10px] text-slate-500 font-semibold">PRODUCT SKU</Label>}
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineProductChange(idx, e.target.value)}
                          className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-24 space-y-1">
                        {idx === 0 && <Label className="text-[10px] text-slate-500 font-semibold">QTY</Label>}
                        <Input
                          type="number"
                          value={line.quantityOrdered}
                          onChange={(e) => handleLineQtyChange(idx, parseInt(e.target.value, 10))}
                          className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                        />
                      </div>

                      {/* Cost */}
                      <div className="w-28 space-y-1">
                        {idx === 0 && <Label className="text-[10px] text-slate-500 font-semibold">COST ($)</Label>}
                        <div className="relative">
                          <DollarSign className="absolute left-1.5 top-2 h-3.5 w-3.5 text-slate-500" />
                          <Input
                            type="number"
                            step="0.01"
                            value={(line.unitCost / 100).toFixed(2)}
                            onChange={(e) => handleLineCostChange(idx, parseFloat(e.target.value))}
                            className="h-8 pl-5 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      {/* Remove button */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="h-8 w-8 text-rose-500 hover:text-rose-300 hover:bg-rose-950/20"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-notes" className="text-xs font-semibold text-slate-400">Order Notes / Terms</Label>
                  <textarea
                    id="wiz-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any custom payment terms, packaging configurations, or freight notes..."
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:ring-0 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenWizard(false)}
                    className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold"
                  >
                    Draft PO Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Layout Display */}
      {viewMode === "KANBAN" ? (
        /* Kanban Status Board Layout */
        <div className="grid gap-4 md:grid-cols-4 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map((colStatus) => {
            const posInCol = data.filter((po) => po.status === colStatus);

            return (
              <div key={colStatus} className="rounded-lg bg-slate-900/40 border border-slate-800/80 p-4 min-w-[240px] flex flex-col h-[520px]">
                {/* Column Header */}
                <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-300 tracking-wider capitalize">
                      {colStatus.toLowerCase()}
                    </span>
                    <span className="rounded-full bg-slate-800 text-[10px] text-slate-400 font-semibold py-0.5 px-2">
                      {posInCol.length}
                    </span>
                  </div>
                </div>

                {/* Column PO Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {posInCol.map((po) => (
                    <Card
                      key={po.id}
                      className="bg-slate-950 border-slate-850 text-slate-200 hover:border-slate-700 transition-all duration-300 shadow-md group relative"
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">{po.id}</span>
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Eye className="h-4 w-4 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-semibold">{po.supplierName}</div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-900/60">
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{po.expectedDeliveryDate || po.orderDate}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-200">{formatCurrency(po.totalAmount)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {posInCol.length === 0 && (
                    <div className="text-center py-12 text-slate-600 text-xs font-medium border border-dashed border-slate-800 rounded-lg">
                      No orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Ledger Table Layout */
        <DataTable
          columns={columns}
          data={data}
          searchKey="supplierName"
          searchPlaceholder="Search POs by supplier..."
        />
      )}
    </div>
  );
}
