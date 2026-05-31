"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface Column<T> {
  accessor: string;
  header: string;
  render?: (val: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKey,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((c) => c.accessor)
  );

  // 1. Search Filter
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter((item) => {
      const val = item[searchKey];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchKey]);

  // 2. Sort Filter
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // 3. Paginated Data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const toggleColumn = (accessor: string) => {
    if (visibleColumns.includes(accessor)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((c) => c !== accessor));
      }
    } else {
      setVisibleColumns([...visibleColumns, accessor]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & View Config Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        {searchKey && (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500"
            />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
          {/* Column Toggle Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 ml-auto"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Columns</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle className="text-slate-200">Toggle Columns</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                {columns.map((col) => (
                  <div key={col.accessor} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`col-${col.accessor}`}
                      checked={visibleColumns.includes(col.accessor)}
                      onChange={() => toggleColumn(col.accessor)}
                      className="rounded bg-slate-850 border-slate-800 text-slate-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-slate-400"
                    />
                    <Label htmlFor={`col-${col.accessor}`} className="text-sm font-medium text-slate-300">
                      {col.header}
                    </Label>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-slate-900 border-b border-slate-800">
            <TableRow>
              {columns
                .filter((c) => visibleColumns.includes(c.accessor))
                .map((col) => (
                  <TableHead key={col.accessor} className="text-slate-300 font-semibold tracking-wide py-3 px-4">
                    {col.sortable !== false ? (
                      <button
                        onClick={() => handleSort(col.accessor)}
                        className="flex items-center gap-1 hover:text-slate-100 transition-colors"
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <TableRow key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/10">
                  {columns
                    .filter((c) => visibleColumns.includes(c.accessor))
                    .map((col) => (
                      <TableCell key={col.accessor} className="py-3 px-4 text-slate-300 font-medium max-w-xs truncate">
                        {col.render
                          ? col.render(row[col.accessor], row)
                          : row[col.accessor] !== null && row[col.accessor] !== undefined
                          ? String(row[col.accessor])
                          : "-"}
                      </TableCell>
                    ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-slate-500 font-medium">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)} to{" "}
            {Math.min(filteredData.length, currentPage * pageSize)} of {filteredData.length} records
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
