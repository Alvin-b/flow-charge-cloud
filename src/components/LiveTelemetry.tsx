import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Zap, Thermometer, Gauge, Radio, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface TelemetryData {
  voltage: number;
  current: number;
  power: number;
  frequency: number;
  powerFactor: number;
  energy: number;
}

/** Animated gauge arc */
const GaugeArc = ({ value, max, label, unit, color, size = 80 }: {
  value: number; max: number; label: string; unit: string; color: string; size?: number;
}) => {
  const r = (size / 2) - 8;
  const circ = Math.PI * r; // half circle
  const pct = Math.min(value / max, 1);
  const offset = circ - circ * pct;
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <defs>
          <filter id={`gauge-glow-${label}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none" stroke="hsl(var(--border))" strokeWidth="4" opacity="0.3"
        />
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          filter={`url(#gauge-glow-${label})`}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="text-center -mt-3">
        <span className="text-base font-bold font-mono text-foreground">{value.toFixed(1)}</span>
        <span className="text-[8px] font-mono text-muted-foreground ml-0.5">{unit}</span>
      </div>
      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
};

/** Mini sparkline */
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((v, i) => ({ x: i, v }));
  return (
    <ResponsiveContainer width="100%" height={30}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default function LiveTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    voltage: 232.5, current: 3.2, power: 744, frequency: 50.01, powerFactor: 0.98, energy: 145.7,
  });
  const [history, setHistory] = useState<number[]>(() => Array.from({ length: 20 }, () => 700 + Math.random() * 100));
  const [voltHistory, setVoltHistory] = useState<number[]>(() => Array.from({ length: 20 }, () => 230 + Math.random() * 5));

  // Simulate live updates
  useEffect(() => {
    const iv = setInterval(() => {
      setTelemetry(prev => ({
        voltage: 228 + Math.random() * 8,
        current: 2.5 + Math.random() * 2,
        power: 600 + Math.random() * 300,
        frequency: 49.95 + Math.random() * 0.1,
        powerFactor: 0.95 + Math.random() * 0.04,
        energy: prev.energy + Math.random() * 0.02,
      }));
      setHistory(prev => [...prev.slice(1), 600 + Math.random() * 300]);
      setVoltHistory(prev => [...prev.slice(1), 228 + Math.random() * 8]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const metrics = useMemo(() => [
    { label: "Voltage", value: telemetry.voltage, unit: "V", max: 260, color: "hsl(168, 100%, 50%)", icon: Zap },
    { label: "Current", value: telemetry.current, unit: "A", max: 10, color: "hsl(280, 85%, 65%)", icon: Activity },
    { label: "Power", value: telemetry.power, unit: "W", max: 1200, color: "hsl(35, 95%, 55%)", icon: Gauge },
    { label: "PF", value: telemetry.powerFactor, unit: "", max: 1, color: "hsl(152, 80%, 42%)", icon: TrendingUp },
  ], [telemetry]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-elevated rounded-2xl p-4 hud-corners"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary animate-data-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-foreground">LIVE TELEMETRY</h3>
            <p className="text-[9px] font-mono text-muted-foreground">REAL-TIME GRID DATA</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="text-[9px] font-mono text-primary">LIVE</span>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {metrics.map(({ label, value, unit, max, color }) => (
          <GaugeArc key={label} value={value} max={max} label={label} unit={unit} color={color} size={72} />
        ))}
      </div>

      {/* Sparklines */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-muted-foreground uppercase">Power (W)</span>
            <span className="text-xs font-mono font-bold text-primary">{telemetry.power.toFixed(0)}W</span>
          </div>
          <Sparkline data={history} color="hsl(168, 100%, 50%)" />
        </div>
        <div className="bg-secondary/30 border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-muted-foreground uppercase">Voltage (V)</span>
            <span className="text-xs font-mono font-bold text-accent">{telemetry.voltage.toFixed(1)}V</span>
          </div>
          <Sparkline data={voltHistory} color="hsl(280, 85%, 65%)" />
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
        {[
          { label: "FREQ", val: `${telemetry.frequency.toFixed(2)} Hz`, color: "text-primary" },
          { label: "ENERGY", val: `${telemetry.energy.toFixed(1)} kWh`, color: "text-accent" },
          { label: "TEMP", val: `${(35 + Math.random() * 5).toFixed(1)}°C`, color: "text-amber-500" },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn("text-xs font-mono font-bold", color)}>{val}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
