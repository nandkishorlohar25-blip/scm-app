"use client";

import React, { useState, useEffect } from "react";
import { Plus, Eye, Search, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import SupplierRating from "@/components/SupplierRating";
import DataTable, { Column } from "@/components/DataTable";
import AlertBanner from "@/components/AlertBanner";

interface SupplierRow {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  leadTimeDays: number;
  rating: number;
}

export default function SuppliersPage() {
  const [data, setData] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWizard, setOpenWizard] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Supplier Form States
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("United States");
  const [leadTimeDays, setLeadTimeDays] = useState("7");
  const [paymentTerms, setPaymentTerms] = useState("NET-30");
  const [rating, setRating] = useState("5");

  // Fallback seed suppliers if database is empty
  const defaultSuppliers: SupplierRow[] = [
    { id: "sup-1", name: "Apex Materials Inc.", contactName: "Richard Apex", email: "procurement@apexmaterials.com", phone: "+1-555-901-2231", country: "United States", leadTimeDays: 7, rating: 5 },
    { id: "sup-2", name: "Global Box Co", contactName: "Sarah Container", email: "orders@globalbox.com", phone: "+1-555-403-1188", country: "Canada", leadTimeDays: 5, rating: 4 },
    { id: "sup-3", name: "Zenith Parts Ltd", contactName: "Marcus Zenith", email: "sales@zenithparts.co.uk", phone: "+44-20-7946-0958", country: "United Kingdom", leadTimeDays: 14, rating: 3 },
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers");
      const resJson = await res.json();
      if (resJson.data && resJson.data.length > 0) {
        setData(resJson.data);
      } else {
        setData(defaultSuppliers);
      }
    } catch (err) {
      console.error("Error loading suppliers:", err);
      setData(defaultSuppliers);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const ltDays = parseInt(leadTimeDays, 10);
    const starRating = parseInt(rating, 10);

    if (isNaN(ltDays) || isNaN(starRating)) {
      setErrorText("Lead time days and rating must be valid integers.");
      return;
    }

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactName,
          email: email || undefined,
          phone,
          address,
          country,
          leadTimeDays: ltDays,
          paymentTerms,
          rating: starRating,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error || "Failed to create supplier profile.");
      } else {
        setOpenWizard(false);
        fetchSuppliers();
        // Reset states
        setName("");
        setContactName("");
        setEmail("");
        setPhone("");
        setAddress("");
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    }
  };

  const columns: Column<SupplierRow>[] = [
    { accessor: "name", header: "Supplier Name" },
    { accessor: "contactName", header: "Contact Person", render: (val) => val || "-" },
    { accessor: "email", header: "Email Address", render: (val) => val || "-" },
    { accessor: "phone", header: "Telephone Phone", render: (val) => val || "-" },
    { accessor: "country", header: "Country", render: (val) => val || "-" },
    {
      accessor: "rating",
      header: "Reliability Rating",
      render: (val, row) => <SupplierRating rating={val} leadTimeDays={row.leadTimeDays} />,
    },
    {
      accessor: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <Link href={`/suppliers/${row.id}`}>
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Supplier Vendor Directory</h1>
          <p className="text-slate-400 text-sm mt-1">Audit active vendors, supplier reliability scores, and register new supply partner terms.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Supplier Wizard */}
          <Dialog open={openWizard} onOpenChange={setOpenWizard}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 font-semibold shadow-lg">
                <Plus className="h-4 w-4" />
                <span>Onboard Supplier</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
              <DialogHeader className="border-b border-slate-850 pb-3 mb-4">
                <DialogTitle className="text-slate-100 font-semibold tracking-wide flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-slate-400" />
                  <span>Onboard Supply Partner</span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateSupplier} className="space-y-4">
                {errorText && <AlertBanner type="error" title="Onboarding Failed" message={errorText} />}

                {/* Vendor Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="sup-name" className="text-xs font-semibold text-slate-400">Company Legal Name</Label>
                  <Input
                    id="sup-name"
                    placeholder="e.g. Apex Materials Inc."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200"
                    required
                  />
                </div>

                {/* Contact Name & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-contact" className="text-xs font-semibold text-slate-400">Contact Person</Label>
                    <Input
                      id="sup-contact"
                      placeholder="John Doe"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-country" className="text-xs font-semibold text-slate-400">Country</Label>
                    <Input
                      id="sup-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-email" className="text-xs font-semibold text-slate-400">Email Address</Label>
                    <Input
                      id="sup-email"
                      type="email"
                      placeholder="orders@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-phone" className="text-xs font-semibold text-slate-400">Telephone Phone</Label>
                    <Input
                      id="sup-phone"
                      placeholder="+1-555-019-2831"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Lead Time & Payment Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-lead" className="text-xs font-semibold text-slate-400">Lead Time (Days)</Label>
                    <Input
                      id="sup-lead"
                      type="number"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-terms" className="text-xs font-semibold text-slate-400">Payment Terms</Label>
                    <Input
                      id="sup-terms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Rating selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="sup-rating" className="text-xs font-semibold text-slate-400">Base Reliability Rating</Label>
                  <select
                    id="sup-rating"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-200 outline-none"
                  >
                    <option value="5">★★★★★ - Excellent Reliability</option>
                    <option value="4">★★★★☆ - Good Reliability</option>
                    <option value="3">★★★☆☆ - Average Reliability</option>
                    <option value="2">★★☆☆☆ - Low Reliability</option>
                    <option value="1">★☆☆☆☆ - High Risk Vendor</option>
                  </select>
                </div>

                {/* Company Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="sup-address" className="text-xs font-semibold text-slate-400">Company Address</Label>
                  <textarea
                    id="sup-address"
                    rows={2}
                    placeholder="Enter corporate details, billing location or freight shipping yards..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    Enroll Partner
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search suppliers by corporate name..."
      />
    </div>
  );
}
