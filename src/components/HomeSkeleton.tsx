import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const Pulse = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-muted/30", className)} />
);

const HomeSkeleton = () => (
  <div className="min-h-screen gradient-navy relative overflow-hidden">
    <div className="absolute inset-0 gradient-mesh pointer-events-none" />

    {/* Header skeleton */}
    <div className="relative px-5 pt-14 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Pulse className="w-11 h-11 rounded-2xl" />
        <div className="space-y-2">
          <Pulse className="w-20 h-3" />
          <Pulse className="w-28 h-4" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Pulse className="w-24 h-8 rounded-full" />
        <Pulse className="w-10 h-10 rounded-xl" />
      </div>
    </div>

    <div className="relative px-5 space-y-5 mt-2">
      {/* Wallet card skeleton */}
      <div className="rounded-3xl p-6 overflow-hidden" style={{
        background: "linear-gradient(145deg, hsl(228, 55%, 12%) 0%, hsl(215, 55%, 15%) 40%, hsl(200, 50%, 14%) 70%, hsl(191, 45%, 13%) 100%)",
        border: "1px solid rgba(0, 212, 255, 0.08)",
      }}>
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-primary/30" />
          <Pulse className="w-28 h-3" />
        </div>
        <div className="flex items-center gap-6">
          <div className="w-[148px] h-[148px] rounded-full border-4 border-muted/10 flex items-center justify-center shrink-0">
            <div className="space-y-1 text-center">
              <Pulse className="w-14 h-8 mx-auto" />
              <Pulse className="w-10 h-2 mx-auto" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Pulse className="w-24 h-7" />
              <Pulse className="w-20 h-3" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <Pulse key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Pulse className="w-24 h-4" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2.5">
              <Pulse className="w-14 h-14 rounded-2xl" />
              <Pulse className="w-12 h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Meter card skeleton */}
      <Pulse className="h-32 rounded-2xl" />

      {/* Recent activity skeleton */}
      <div>
        <Pulse className="w-28 h-4 mb-3" />
        <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
          {[0, 1, 2].map(i => (
            <div key={i} className={cn("flex items-center gap-3 px-4 py-3.5", i < 2 && "border-b border-border/10")}>
              <Pulse className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Pulse className="w-24 h-3.5" />
                <Pulse className="w-32 h-2.5" />
              </div>
              <div className="space-y-1.5 text-right">
                <Pulse className="w-14 h-2.5 ml-auto" />
                <Pulse className="w-10 h-2.5 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default HomeSkeleton;
