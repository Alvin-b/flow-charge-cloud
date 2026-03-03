import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Onboarding } from "@/components/Onboarding";
import SplashScreen from "./pages/SplashScreen";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import PinSetup from "./pages/auth/PinSetup";
import Home from "./pages/Home";
import Recharge from "./pages/Recharge";
import Analytics from "./pages/Analytics";
import Transfer from "./pages/Transfer";
import Profile from "./pages/Profile";
import Meters from "./pages/Meters";
import Notifications from "./pages/Notifications";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMeters from "./pages/admin/AdminMeters";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const timer = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="powerflow-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <Onboarding />
            <BrowserRouter>
              <Routes>
                {/* Auth routes — public */}
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/pin" element={<PinSetup />} />

                {/* Protected app routes */}
                <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
                <Route path="/recharge" element={<AuthGuard><Recharge /></AuthGuard>} />
                <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
                <Route path="/transfer" element={<AuthGuard><Transfer /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                <Route path="/meters" element={<AuthGuard><Meters /></AuthGuard>} />
                <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                <Route path="/install" element={<Install />} />

                {/* Admin routes — no auth guard for now */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/meters" element={<AdminMeters />} />
                <Route path="/admin/transactions" element={<AdminTransactions />} />
                <Route path="/admin/recharges" element={<AdminTransactions />} />
                <Route path="/admin/transfers" element={<AdminTransactions />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/analytics" element={<AdminPlaceholder title="Analytics" description="Revenue charts, usage trends, and system metrics" />} />
                <Route path="/admin/activity" element={<AdminPlaceholder title="Activity Log" description="Audit trail of admin and system actions" />} />
                <Route path="/admin/wallets" element={<AdminPlaceholder title="Wallets" description="View and manage all user wallets" />} />
                <Route path="/admin/meter-commands" element={<AdminPlaceholder title="Meter Commands" description="MQTT command history and remote control" />} />
                <Route path="/admin/kplc" element={<AdminPlaceholder title="KPLC Payments" description="B2B payment pool status and history" />} />
                <Route path="/admin/notifications" element={<AdminPlaceholder title="Notifications" description="Send broadcast notifications to users" />} />
                <Route path="/admin/security" element={<AdminPlaceholder title="Security" description="Rate limits, audit logs, and access controls" />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
