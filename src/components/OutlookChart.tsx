import { Area, AreaChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

type Props = {
  currentPrice: number;
  lowPct: number;
  basePct: number;
  highPct: number;
};

export function OutlookChart({ currentPrice, lowPct, basePct, highPct }: Props) {
  const steps = 6;
  const data = Array.from({ length: steps + 1 }, (_, i) => {
    const f = i / steps;
    const ease = f * f * 0.55 + f * 0.45;
    return {
      label: i === 0 ? "Now" : `M${i}`,
      band: [currentPrice * (1 + (lowPct / 100) * ease), currentPrice * (1 + (highPct / 100) * ease)] as [
        number,
        number,
      ],
      base: currentPrice * (1 + (basePct / 100) * ease),
    };
  });

  const all = data.flatMap((d) => [d.band[0], d.band[1], d.base]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.1;

  return (
    <div className="h-[170px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="outlookBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            width={54}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => Math.round(v).toLocaleString("en-IN")}
          />
          <ReferenceLine y={currentPrice} stroke="var(--hairline)" strokeDasharray="3 3" />
          <Area dataKey="band" stroke="none" fill="url(#outlookBand)" isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="base"
            stroke="var(--gold)"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
