import { cn } from "@/lib/utils";

interface AnimatedWaterTankProps {
  level: number; // 0-100
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AnimatedWaterTank({ level, size = "md", className }: AnimatedWaterTankProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const isLow = clampedLevel < 30;
  const isCritical = clampedLevel < 15;

  const dims = {
    sm: { w: 32, h: 40, tank: "w-8 h-10" },
    md: { w: 48, h: 64, tank: "w-12 h-16" },
    lg: { w: 64, h: 80, tank: "w-16 h-20" },
  }[size];

  const waterColor = isCritical
    ? "hsl(var(--destructive))"
    : isLow
    ? "hsl(var(--accent))"
    : "hsl(var(--cyan))";

  const waterColorLight = isCritical
    ? "hsl(var(--destructive) / 0.3)"
    : isLow
    ? "hsl(var(--accent) / 0.3)"
    : "hsl(var(--cyan) / 0.3)";

  return (
    <div className={cn("relative", dims.tank, className)}>
      <svg
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tank outline */}
        <rect
          x="2"
          y="4"
          width={dims.w - 4}
          height={dims.h - 8}
          rx="4"
          ry="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground/30"
        />

        {/* Tank cap */}
        <rect
          x={dims.w / 2 - 6}
          y="0"
          width="12"
          height="6"
          rx="2"
          fill="currentColor"
          className="text-muted-foreground/20"
        />

        {/* Water fill with clip */}
        <defs>
          <clipPath id={`tank-clip-${size}`}>
            <rect
              x="3"
              y="5"
              width={dims.w - 6}
              height={dims.h - 10}
              rx="3"
            />
          </clipPath>
        </defs>

        <g clipPath={`url(#tank-clip-${size})`}>
          {/* Water body */}
          <rect
            x="3"
            y={5 + (dims.h - 10) * (1 - clampedLevel / 100)}
            width={dims.w - 6}
            height={(dims.h - 10) * (clampedLevel / 100)}
            fill={waterColorLight}
            className="transition-all duration-1000 ease-out"
          />

          {/* Animated wave 1 */}
          <g
            style={{
              transform: `translateY(${5 + (dims.h - 10) * (1 - clampedLevel / 100) - 2}px)`,
              transition: "transform 1s ease-out",
            }}
          >
            <path
              d={`M3,4 Q${dims.w * 0.15},0 ${dims.w * 0.3},4 T${dims.w * 0.6},4 T${dims.w - 3},4 L${dims.w - 3},12 L3,12 Z`}
              fill={waterColor}
              opacity="0.4"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0,0; ${dims.w * 0.1},0; 0,0; -${dims.w * 0.05},0; 0,0`}
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
          </g>

          {/* Animated wave 2 */}
          <g
            style={{
              transform: `translateY(${5 + (dims.h - 10) * (1 - clampedLevel / 100) - 1}px)`,
              transition: "transform 1s ease-out",
            }}
          >
            <path
              d={`M3,4 Q${dims.w * 0.25},1 ${dims.w * 0.4},4 T${dims.w * 0.7},4 T${dims.w - 3},4 L${dims.w - 3},12 L3,12 Z`}
              fill={waterColor}
              opacity="0.6"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0,0; -${dims.w * 0.08},0; 0,0; ${dims.w * 0.06},0; 0,0`}
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
          </g>

          {/* Solid water below waves */}
          <rect
            x="3"
            y={5 + (dims.h - 10) * (1 - clampedLevel / 100) + 4}
            width={dims.w - 6}
            height={(dims.h - 10) * (clampedLevel / 100)}
            fill={waterColor}
            opacity="0.5"
            className="transition-all duration-1000 ease-out"
          />
        </g>

        {/* Level markings */}
        {[25, 50, 75].map((mark) => (
          <line
            key={mark}
            x1={dims.w - 7}
            y1={5 + (dims.h - 10) * (1 - mark / 100)}
            x2={dims.w - 4}
            y2={5 + (dims.h - 10) * (1 - mark / 100)}
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground/20"
          />
        ))}
      </svg>

      {/* Percentage overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-bold drop-shadow-sm",
            size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-xs",
            isCritical ? "text-destructive" : isLow ? "text-accent" : "text-foreground"
          )}
        >
          {clampedLevel}%
        </span>
      </div>
    </div>
  );
}
