"use client";

import React, { useState, useEffect } from "react";
import { Search, Sparkles, Terminal, Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AlertBanner from "@/components/AlertBanner";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // 1. Listen for Cmd+K / Ctrl+K keyboard triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setErrorText(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorText(resJson.error || "Query parsing failed.");
      } else if (resJson.data && resJson.data.answer) {
        setAnswer(resJson.data.answer);
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Visual Indicator Button on Dashboard */}
      <button
        onClick={() => {
          setErrorText(null);
          setAnswer(null);
          setQuery("");
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 shadow-2xl hover:bg-slate-800 hover:text-slate-100 transition-all duration-300 backdrop-blur-md"
      >
        <Keyboard className="h-4 w-4 text-slate-500" />
        <span>Press</span>
        <kbd className="rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
          Ctrl+K
        </kbd>
        <span>to ask AI</span>
      </button>

      {/* Command Palette Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-100 font-semibold tracking-wide flex items-center gap-2">
              <Terminal className="h-5 w-5 text-slate-400" />
              <span>Natural Query Console</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Query inventory ledgers, safety thresholds, and active shipments using plain English.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuery} className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
              <Input
                type="text"
                placeholder='e.g., "Which products will run out this week?"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11 bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:ring-0"
                autoFocus
              />
            </div>

            {errorText && <AlertBanner type="error" title="Auditing Failed" message={errorText} />}

            {/* Answer Display */}
            {answer && (
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-medium shadow-inner whitespace-pre-line">
                {answer}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Powered by Claude Sonnet</span>
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold"
                >
                  {loading ? "Processing..." : "Submit Question"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
