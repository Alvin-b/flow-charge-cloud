import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";
import { createElement } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors={false}
      gap={8}
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:py-3 group-[.toaster]:px-4 group-[.toaster]:text-sm group-[.toaster]:gap-2",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs",
          success: "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-500/5",
          error: "group-[.toaster]:border-destructive/20 group-[.toaster]:bg-destructive/5",
          warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-500/5",
          info: "group-[.toaster]:border-primary/20 group-[.toaster]:bg-primary/5",
          loading: "group-[.toaster]:border-primary/20",
        },
      }}
      icons={{
        success: createElement(CheckCircle2, { className: "w-4 h-4 text-emerald-500 shrink-0" }),
        error: createElement(XCircle, { className: "w-4 h-4 text-destructive shrink-0" }),
        warning: createElement(AlertTriangle, { className: "w-4 h-4 text-amber-500 shrink-0" }),
        info: createElement(Info, { className: "w-4 h-4 text-primary shrink-0" }),
        loading: createElement(Loader2, { className: "w-4 h-4 text-primary shrink-0 animate-spin" }),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
