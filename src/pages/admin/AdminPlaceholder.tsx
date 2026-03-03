import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  description?: string;
}

export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Construction className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Coming Soon</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              This section is under development. Check back soon for full functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
