import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { smaSeries, type Candle } from "@/lib/analysis";

type Props = {
  candles: Candle[];
  allCloses: number[];
  inputPrice: number;
  compact?: boolean;
};

export function PriceChart({ candles, allCloses, inputPrice, compact = false }: Props) {
  const offset = allCloses.length - candles.length;
  const ma50 = smaSeries(allCloses, 50);
  const ma200 = smaSeries(allCloses, 200);

  const data = candles.map((c, i) => ({
    date: new Date(c.t * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    close: c.c,
    ma50: ma50[offset + i],
    ma200: ma200[offset + i],
  }));

  const values = data.flatMap((d) => [d.close, d.ma50, d.ma200]).filter((v): v is number => v != null);
  const min = Math.min(...values, inputPrice);
  const max = Math.max(...values, inputPrice);
  const pad = (max - min) * 0.08;

  return (
    <div style={{ height: compact ? 150 : 300 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--hairline)" strokeOpacity={0.45} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            minTickGap={compact ? 60 : 36}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            width={compact ? 44 : 58}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => Math.round(v).toLocaleString("en-IN")}
          />
          {!compact && (
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--hairline)",
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value: number | string, name: string) => [
                `₹${Number(value).toFixed(2)}`,
                name === "close" ? "Close" : name === "ma50" ? "50 DMA" : "200 DMA",
              ]}
            />
          )}
          <ReferenceLine
            y={inputPrice}
            stroke="var(--gold)"
            strokeDasharray="4 4"
            strokeWidth={1}
            {...(compact
              ? {}
              : {
                  label: {
                    value: `Your price ₹${inputPrice.toFixed(2)}`,
                    position: "insideTopRight" as const,
                    fill: "var(--gold)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  },
                })}
          />
          <Line type="monotone" dataKey="close" stroke="var(--foreground)" strokeWidth={1.4} dot={false} />
          <Line type="monotone" dataKey="ma50" stroke="var(--gold)" strokeWidth={1.1} dot={false} connectNulls />
          <Line
            type="monotone"
            dataKey="ma200"
            stroke="var(--bronze)"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
