import {
  LayoutDashboard,
  Users,
  Gauge,
  Receipt,
  Settings,
  Zap,
  Bell,
  Shield,
  Activity,
  ArrowLeft,
  Wallet,
  Send,
  BarChart3,
  Server,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const overviewItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Activity Log", url: "/admin/activity", icon: Activity },
];

const managementItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Wallets", url: "/admin/wallets", icon: Wallet },
  { title: "Meters", url: "/admin/meters", icon: Gauge },
  { title: "Meter Commands", url: "/admin/meter-commands", icon: Server },
];

const financialItems = [
  { title: "Transactions", url: "/admin/transactions", icon: Receipt },
  { title: "Recharges", url: "/admin/recharges", icon: Zap },
  { title: "Transfers", url: "/admin/transfers", icon: Send },
  { title: "KPLC Payments", url: "/admin/kplc", icon: Receipt },
];

const systemItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Security", url: "/admin/security", icon: Shield },
];

function SidebarSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: typeof overviewItems;
  collapsed: boolean;
}) {
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/admin"}
                  className="hover:bg-muted/50 transition-colors"
                  activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
        <SidebarSection label="Overview" items={overviewItems} collapsed={collapsed} />
        <SidebarSection label="Management" items={managementItems} collapsed={collapsed} />
        <SidebarSection label="Financial" items={financialItems} collapsed={collapsed} />
        <SidebarSection label="System" items={systemItems} collapsed={collapsed} />
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/" className="hover:bg-muted/50 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Back to App</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
