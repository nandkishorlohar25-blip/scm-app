"use client";

import React, { useState, useEffect } from "react";
import { Download, Plus, Filter, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import DataTable, { Column } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StockMovementModal from "@/components/StockMovementModal";
import Link from "next/link";
import AlertBanner from "@/components/AlertBanner";

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouseName: string;
  quantityOnHand: number;
  quantityReserved: number;
  available: number;
  reorderPoint: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Add Product Form States
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("units");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("50");
  const [reorderQty, setReorderQty] = useState("100");
  const [type, setType] = useState<"RAW_MATERIAL" | "FINISHED_GOOD" | "MERCHANDISE">("MERCHANDISE");

  // Fallback seed data if the database is initially empty
  const defaultInventory: InventoryRow[] = [
    { id: "p1", sku: "RAW-STL-002", name: "Grade A Steel Rods", category: "Raw Materials", warehouseName: "Primary Warehouse", quantityOnHand: 45, quantityReserved: 5, available: 40, reorderPoint: 100, status: "LOW_STOCK" },
    { id: "p2", sku: "PKG-BOX-M", name: "Medium Cardboard Boxes", category: "Packaging", warehouseName: "Primary Warehouse", quantityOnHand: 200, quantityReserved: 0, available: 200, reorderPoint: 250, status: "LOW_STOCK" },
    { id: "p3", sku: "FIN-TBL-04", name: "Executive Wooden Desks", category: "Finished Goods", warehouseName: "Secondary Facility", quantityOnHand: 80, quantityReserved: 12, available: 68, reorderPoint: 30, status: "IN_STOCK" },
    { id: "p4", sku: "MER-MUG-001", name: "Ceramic Logo Coffee Mugs", category: "Merchandise", warehouseName: "Primary Warehouse", quantityOnHand: 0, quantityReserved: 0, available: 0, reorderPoint: 10, status: "OUT_OF_STOCK" },
  ];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      const resJson = await res.json();
      
      if (resJson.data && resJson.data.length > 0) {
        // Map Prisma DB response to InventoryRow flat shape
        const mappedData: InventoryRow[] = resJson.data.map((item: any) => {
          const totalStock = item.quantityOnHand;
          const reserved = item.quantityReserved;
          const reorder = item.product.reorderPoint;
          
          let statusStr: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
          if (totalStock === 0) {
            statusStr = "OUT_OF_STOCK";
          } else if (totalStock <= reorder) {
            statusStr = "LOW_STOCK";
          }

          return {
            id: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            category: item.product.category,
            warehouseName: item.warehouse.name,
            quantityOnHand: totalStock,
            quantityReserved: reserved,
            available: Math.max(0, totalStock - reserved),
            reorderPoint: reorder,
            status: statusStr,
          };
        });
        setData(mappedData);
      } else {
        setData(defaultInventory);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
      setData(defaultInventory);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const costCents = Math.round(parseFloat(costPrice) * 100);
    const sellCents = Math.round(parseFloat(sellingPrice) * 100);
    const rPoint = parseInt(reorderPoint, 10);
    const rQty = parseInt(reorderQty, 10);

    if (isNaN(costCents) || isNaN(sellCents) || isNaN(rPoint) || isNaN(rQty)) {
      setErrorText("Prices, reorder point, and quantity must be valid numeric values.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          description,
          category,
          unitOfMeasure,
          costPrice: costCents,
          sellingPrice: sellCents,
          reorderPoint: rPoint,
          reorderQty: rQty,
          type,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error?.sku?._errors[0] || resJson.error || "Creation failed");
      } else {
        setOpenDrawer(false);
        fetchInventory();
        // Reset states
        setSku("");
        setName("");
        setDescription("");
        setCategory("");
        setCostPrice("");
        setSellingPrice("");
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    }
  };

  // CSV Export utility
  const exportToCSV = () => {
    const headers = ["SKU", "Name", "Category", "Warehouse", "On Hand", "Reserved", "Available", "Reorder Point", "Status"];
    const rows = filteredData.map((r) => [
      r.sku,
      r.name,
      r.category,
      r.warehouseName,
      r.quantityOnHand,
      r.quantityReserved,
      r.available,
      r.reorderPoint,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SCM_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sidebar Filter Logic
  const filteredData = data.filter((row) => {
    if (selectedWarehouse && row.warehouseName !== selectedWarehouse) return false;
    if (selectedCategory && row.category !== selectedCategory) return false;
    if (selectedStatus && row.status !== selectedStatus) return false;
    return true;
  });

  const columns: Column<InventoryRow>[] = [
    { accessor: "sku", header: "SKU" },
    { accessor: "name", header: "Product Name" },
    { accessor: "category", header: "Category" },
    { accessor: "warehouseName", header: "Warehouse" },
    { accessor: "quantityOnHand", header: "On Hand" },
    { accessor: "quantityReserved", header: "Reserved" },
    { accessor: "available", header: "Available" },
    { accessor: "reorderPoint", header: "Reorder Mark" },
    {
      accessor: "status",
      header: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      accessor: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <Link href={`/inventory/${row.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-200">
            <Eye className="h-4.5 w-4.5" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Stock & Inventory Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">Audit multi-warehouse positions, transfer assets, and register new catalog entries.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            <span>CSV Export</span>
          </Button>

          <StockMovementModal onSuccess={fetchInventory} />

          {/* Add Product Drawer */}
          <Sheet open={openDrawer} onOpenChange={setOpenDrawer}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto w-[420px] max-w-full">
              <SheetHeader className="border-b border-slate-850 pb-4 mb-6">
                <SheetTitle className="text-slate-100 font-semibold tracking-wide">Catalog Onboarding</SheetTitle>
              </SheetHeader>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                {errorText && <AlertBanner type="error" title="Validation Failed" message={errorText} />}

                {/* SKU */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-sku" className="text-xs font-semibold text-slate-400">SKU Code</Label>
                  <Input
                    id="prod-sku"
                    placeholder="e.g. FIN-CHAIR-M1"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-name" className="text-xs font-semibold text-slate-400">Product Name</Label>
                  <Input
                    id="prod-name"
                    placeholder="e.g. Ergonomic Office Chair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>

                {/* Category & Unit of Measure */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-cat" className="text-xs font-semibold text-slate-400">Category</Label>
                    <Input
                      id="prod-cat"
                      placeholder="Finished Goods"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-uom" className="text-xs font-semibold text-slate-400">Unit (UOM)</Label>
                    <Input
                      id="prod-uom"
                      value={unitOfMeasure}
                      onChange={(e) => setUnitOfMeasure(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                </div>

                {/* Cost and Selling Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-cost" className="text-xs font-semibold text-slate-400">Cost Price (USD)</Label>
                    <Input
                      id="prod-cost"
                      type="number"
                      step="0.01"
                      placeholder="12.50"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-sell" className="text-xs font-semibold text-slate-400">Selling Price (USD)</Label>
                    <Input
                      id="prod-sell"
                      type="number"
                      step="0.01"
                      placeholder="29.99"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                </div>

                {/* Reorder Thresholds */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-reorder" className="text-xs font-semibold text-slate-400">Reorder Point</Label>
                    <Input
                      id="prod-reorder"
                      type="number"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-reorder-qty" className="text-xs font-semibold text-slate-400">Reorder Quantity</Label>
                    <Input
                      id="prod-reorder-qty"
                      type="number"
                      value={reorderQty}
                      onChange={(e) => setReorderQty(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                      required
                    />
                  </div>
                </div>

                {/* Product Type select */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-type" className="text-xs font-semibold text-slate-400">Type classification</Label>
                  <select
                    id="prod-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 focus:border-slate-500 focus:ring-0 outline-none"
                  >
                    <option value="MERCHANDISE">Merchandise (Retail)</option>
                    <option value="FINISHED_GOOD">Finished Good</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-desc" className="text-xs font-semibold text-slate-400">Description</Label>
                  <textarea
                    id="prod-desc"
                    rows={3}
                    placeholder="Enter detailed catalog specifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:ring-0 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t border-slate-850">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDrawer(false)}
                    className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold"
                  >
                    Add to Catalog
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Grid of Sidebar Filters + Main DataTable */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Filter Sidebar */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 h-fit lg:col-span-1 shadow-lg">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-850">
            <Filter className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="font-semibold text-sm text-slate-200">Refine Ledger</h3>
          </div>
          <CardContent className="py-4 space-y-4">
            {/* Warehouse Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-400">Location Warehouse</Label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:border-slate-500 focus:ring-0 outline-none"
              >
                <option value="">All Warehouses</option>
                <option value="Primary Warehouse">Primary Warehouse</option>
                <option value="Secondary Facility">Secondary Facility</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-400">Inventory Category</Label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:border-slate-500 focus:ring-0 outline-none"
              >
                <option value="">All Categories</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Packaging">Packaging</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Merchandise">Merchandise</option>
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-400">Stock Availability</Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:border-slate-500 focus:ring-0 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400 text-xs"
              onClick={() => {
                setSelectedWarehouse("");
                setSelectedCategory("");
                setSelectedStatus("");
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Right DataTable Display */}
        <div className="lg:col-span-3">
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey="name"
            searchPlaceholder="Search products by name..."
          />
        </div>
      </div>
    </div>
  );
}
