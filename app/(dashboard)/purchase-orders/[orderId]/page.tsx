"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, Clipboard, FileText, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import AlertBanner from "@/components/AlertBanner";
import RoleGuard from "@/components/RoleGuard";

interface PODetail {
  id: string;
  status: "DRAFT" | "SENT" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  totalAmount: number;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  };
  lines: Array<{
    id: string;
    productId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    totalCost: number;
    product: {
      sku: string;
      name: string;
      unitOfMeasure: string;
    };
  }>;
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const { orderId } = params;
  const [po, setPo] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openReceiveDrawer, setOpenReceiveDrawer] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Fallback Mock PO details
  const mockPO: PODetail = {
    id: orderId,
    status: "CONFIRMED",
    orderDate: "2026-05-28T12:00:00Z",
    expectedDeliveryDate: "2026-06-05T12:00:00Z",
    receivedDate: null,
    totalAmount: 187500, // $1,875.00
    notes: "Please deliver via back gate. Standard NET-30 payment terms hold.",
    supplier: {
      id: "sup-1",
      name: "Apex Materials Inc.",
      contactName: "Richard Apex",
      email: "procurement@apexmaterials.com",
      phone: "+1-555-901-2231",
    },
    lines: [
      {
        id: "line-1",
        productId: "p1",
        quantityOrdered: 100,
        quantityReceived: 45,
        unitCost: 1250, // $12.50
        totalCost: 125000,
        product: { sku: "RAW-STL-002", name: "Grade A Steel Rods", unitOfMeasure: "pieces" },
      },
      {
        id: "line-2",
        productId: "p2",
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost: 1250,
        totalCost: 62500,
        product: { sku: "RAW-STL-003", name: "Grade B Carbon Steel Rods", unitOfMeasure: "pieces" },
      },
    ],
  };

  useEffect(() => {
    fetchPODetails();
  }, [orderId]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-orders/${orderId}`);
      const resJson = await res.json();
      if (resJson.data) {
        setPo(resJson.data);
        // Initialize receive quantities
        const qtys: Record<string, string> = {};
        resJson.data.lines.forEach((line: any) => {
          const remaining = line.quantityOrdered - line.quantityReceived;
          qtys[line.productId] = String(remaining);
        });
        setReceiveQty(qtys);
      } else {
        setPo(mockPO);
        // Mock init qtys
        const qtys: Record<string, string> = {};
        mockPO.lines.forEach((line) => {
          qtys[line.productId] = String(line.quantityOrdered - line.quantityReceived);
        });
        setReceiveQty(qtys);
      }
    } catch (err) {
      console.error("Error fetching PO details:", err);
      setPo(mockPO);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (productId: string, val: string) => {
    setReceiveQty({
      ...receiveQty,
      [productId]: val,
    });
  };

  const handleCommitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    // Filter items where quantity received > 0
    const receiptItems = Object.entries(receiveQty)
      .map(([productId, val]) => ({
        productId,
        quantityReceived: parseInt(val, 10),
      }))
      .filter((item) => !isNaN(item.quantityReceived) && item.quantityReceived > 0);

    if (receiptItems.length === 0) {
      setErrorText("At least one product must have a received quantity greater than zero.");
      return;
    }

    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: "Primary Warehouse", // Valuation helper or default organization seeded warehouse
          items: receiptItems,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error || "Failed to commit goods receipt.");
      } else {
        setSuccessText("Goods received successfully and logged in ledger!");
        fetchPODetails();
        setTimeout(() => setOpenReceiveDrawer(false), 1200);
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-500 font-medium">Resolving purchase order details...</div>;
  }

  if (!po) {
    return <div className="text-center py-24 text-rose-400 font-semibold">Purchase Order not found.</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val / 100);
  };

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link href="/purchase-orders" className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to purchase orders board</span>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-100">Order Ref: {po.id.toUpperCase()}</h1>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-slate-500 text-xs mt-1.5 font-medium tracking-wide">
              Placed on {new Date(po.orderDate).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Goods Receipt Drawer Trigger (Requires Role WAREHOUSE_STAFF minimum!) */}
            {po.status !== "RECEIVED" && (
              <RoleGuard minRole="WAREHOUSE_STAFF">
                <Sheet open={openReceiveDrawer} onOpenChange={setOpenReceiveDrawer}>
                  <SheetTrigger asChild>
                    <Button className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold shadow-lg">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Receive Goods</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 w-[440px] max-w-full overflow-y-auto">
                    <SheetHeader className="border-b border-slate-850 pb-3 mb-6">
                      <SheetTitle className="text-slate-100 font-semibold tracking-wide">Log Goods Receipt</SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleCommitReceipt} className="space-y-4">
                      {errorText && <AlertBanner type="error" title="Receipt Failed" message={errorText} />}
                      {successText && <AlertBanner type="info" title="Success" message={successText} />}

                      <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Audit quantities received in this shipment. Checked items will increase warehouse inventory volumes immediately.
                        </p>

                        {po.lines.map((line) => {
                          const remaining = line.quantityOrdered - line.quantityReceived;
                          if (remaining <= 0) return null;

                          return (
                            <div key={line.productId} className="rounded-lg border border-slate-850 bg-slate-950/40 p-3 space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-200">{line.product.sku}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Ordered: {line.quantityOrdered} | Received: {line.quantityReceived}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-semibold truncate">{line.product.name}</p>
                              
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-500">QUANTITY RECEIVED</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={String(remaining)}
                                  value={receiveQty[line.productId] || "0"}
                                  onChange={(e) => handleQtyChange(line.productId, e.target.value)}
                                  className="h-8 bg-slate-900 border-slate-800 text-slate-200 text-xs"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 justify-end pt-6 border-t border-slate-850">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpenReceiveDrawer(false)}
                          className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold"
                        >
                          Commit Goods Receipt
                        </Button>
                      </div>
                    </form>
                  </SheetContent>
                </Sheet>
              </RoleGuard>
            )}
          </div>
        </div>
      </div>

      {/* Grid displays */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Supplier Details & PO Line Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier details card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
                <Clipboard className="h-5 w-5 text-slate-400" />
                <span>Supplier Contact Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-500 tracking-wider">VENDOR NAME</div>
                  <div className="font-semibold text-slate-300">{po.supplier.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-500 tracking-wider">CONTACT PERSON</div>
                  <div className="font-semibold text-slate-300">{po.supplier.contactName || "-"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-500 tracking-wider">EMAIL ADDRESS</div>
                  <div className="font-semibold text-slate-300">{po.supplier.email || "-"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-500 tracking-wider">TELEPHONE PHONE</div>
                  <div className="font-semibold text-slate-300">{po.supplier.phone || "-"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items table */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <span>Purchase Order Line Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border border-slate-850 bg-slate-950/40 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 border-b border-slate-850 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4 text-right">Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Ordered</th>
                      <th className="py-2.5 px-4 text-right">Received</th>
                      <th className="py-2.5 px-4 text-right">Total Line Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                    {po.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-800/10">
                        <td className="py-2.5 px-4 font-bold">{line.product.sku}</td>
                        <td className="py-2.5 px-4">{line.product.name}</td>
                        <td className="py-2.5 px-4 text-right">{formatCurrency(line.unitCost)}</td>
                        <td className="py-2.5 px-4 text-right">{line.quantityOrdered} {line.product.unitOfMeasure}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">{line.quantityReceived}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{formatCurrency(line.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Display */}
              <div className="flex justify-end pt-4 gap-6 text-sm font-bold border-t border-slate-850/60 mt-4">
                <span className="text-slate-400">Grand Procurement Total:</span>
                <span className="text-slate-200">{formatCurrency(po.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: PO Timeline & Terms */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
            <CardHeader className="border-b border-slate-850 pb-4">
              <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-slate-400" />
                <span>Timeline Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs font-semibold text-slate-400">
              <div className="flex gap-3">
                <span className="text-emerald-400">✓</span>
                <div>
                  <div className="text-slate-200 font-bold">PO Request Drafted</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(po.orderDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className={po.status !== "DRAFT" ? "text-emerald-400" : "text-slate-700"}>
                  {po.status !== "DRAFT" ? "✓" : "○"}
                </span>
                <div>
                  <div className={po.status !== "DRAFT" ? "text-slate-200 font-bold" : "text-slate-500 font-medium"}>
                    Approved & Dispatched
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className={po.status === "RECEIVED" ? "text-emerald-400" : "text-slate-700"}>
                  {po.status === "RECEIVED" ? "✓" : "○"}
                </span>
                <div>
                  <div className={po.status === "RECEIVED" ? "text-slate-200 font-bold" : "text-slate-500 font-medium"}>
                    Goods Received
                  </div>
                  {po.receivedDate && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(po.receivedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          {po.notes && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
              <CardHeader className="border-b border-slate-850 pb-4">
                <CardTitle className="text-sm font-semibold tracking-wide">Procurement Terms & Instructions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs leading-relaxed text-slate-400">
                {po.notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
