import { supabase } from "@/integrations/supabase/client";

import type { Report } from "./stock.functions";

export type LogRow = {
  id: string;
  created_at: string;
  symbol: string;
  stock_name: string;
  quantity: number;
  input_price: number;
  current_price: number;
  verdict: string;
  outlook_summary: string | null;
  target_pct: number | null;
  timeframe: string | null;
};

export async function saveReport(report: Report): Promise<LogRow | null> {
  const a = report.analysis;
  const { data, error } = await supabase
    .from("query_log")
    .insert({
      symbol: report.symbol,
      stock_name: report.name,
      quantity: report.quantity,
      input_price: report.inputPrice,
      current_price: Number(a.currentPrice.toFixed(2)),
      verdict: a.verdict,
      outlook_summary: a.outlookReasoning,
      target_pct: Number(a.outlookPct.toFixed(2)),
      timeframe: a.outlookTimeframe,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to log query", error);
    return null;
  }
  return data as LogRow;
}

export async function fetchLog(): Promise<LogRow[]> {
  const { data, error } = await supabase
    .from("query_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("Failed to load log", error);
    return [];
  }
  return (data ?? []) as LogRow[];
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: LogRow[]): string {
  const header = [
    "Date",
    "Stock",
    "Symbol",
    "Quantity",
    "Input Price",
    "Current Price",
    "Verdict",
    "Target %",
    "Timeframe",
    "Outlook Summary",
  ];
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toLocaleString("en-IN"),
      r.stock_name,
      r.symbol,
      r.quantity,
      r.input_price,
      r.current_price,
      r.verdict,
      r.target_pct,
      r.timeframe,
      r.outlook_summary,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\n");
}

export function downloadFile(filename: string, content: Blob | string, type = "text/csv;charset=utf-8;") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
