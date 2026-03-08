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
import ForgotPin from "./pages/auth/ForgotPin";
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
import AdminLogin from "./pages/admin/AdminLogin";
import AdminGuard from "./components/AdminGuard";
import IoTHub from "./pages/IoTHub";

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
                <Route path="/auth/forgot-pin" element={<ForgotPin />} />

                {/* Protected app routes */}
                <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
                <Route path="/iot" element={<AuthGuard><IoTHub /></AuthGuard>} />
                <Route path="/recharge" element={<AuthGuard><Recharge /></AuthGuard>} />
                <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
                <Route path="/transfer" element={<AuthGuard><Transfer /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                <Route path="/meters" element={<AuthGuard><Meters /></AuthGuard>} />
                <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                <Route path="/install" element={<Install />} />

                {/* Admin auth */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                <Route path="/admin/meters" element={<AdminGuard><AdminMeters /></AdminGuard>} />
                <Route path="/admin/transactions" element={<AdminGuard><AdminTransactions /></AdminGuard>} />
                <Route path="/admin/recharges" element={<AdminGuard><AdminTransactions /></AdminGuard>} />
                <Route path="/admin/transfers" element={<AdminGuard><AdminTransactions /></AdminGuard>} />
                <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
                <Route path="/admin/analytics" element={<AdminGuard><AdminPlaceholder title="Analytics" description="Revenue charts, usage trends, and system metrics" /></AdminGuard>} />
                <Route path="/admin/activity" element={<AdminGuard><AdminPlaceholder title="Activity Log" description="Audit trail of admin and system actions" /></AdminGuard>} />
                <Route path="/admin/wallets" element={<AdminGuard><AdminPlaceholder title="Wallets" description="View and manage all user wallets" /></AdminGuard>} />
                <Route path="/admin/meter-commands" element={<AdminGuard><AdminPlaceholder title="Meter Commands" description="MQTT command history and remote control" /></AdminGuard>} />
                <Route path="/admin/kplc" element={<AdminGuard><AdminPlaceholder title="KPLC Payments" description="B2B payment pool status and history" /></AdminGuard>} />
                <Route path="/admin/notifications" element={<AdminGuard><AdminPlaceholder title="Notifications" description="Send broadcast notifications to users" /></AdminGuard>} />
                <Route path="/admin/security" element={<AdminGuard><AdminPlaceholder title="Security" description="Rate limits, audit logs, and access controls" /></AdminGuard>} />

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
