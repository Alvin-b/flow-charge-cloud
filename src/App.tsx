import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Onboarding } from "@/components/Onboarding";
import SplashScreen from "./pages/SplashScreen";

// Eagerly load auth pages (small, critical path)
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import PinSetup from "./pages/auth/PinSetup";
import AdminLogin from "./pages/admin/AdminLogin";

// Lazy load everything else
const Home = lazy(() => import("./pages/Home"));
const Recharge = lazy(() => import("./pages/Recharge"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Transfer = lazy(() => import("./pages/Transfer"));
const Profile = lazy(() => import("./pages/Profile"));
const Meters = lazy(() => import("./pages/Meters"));
const Notifications = lazy(() => import("./pages/Notifications"));
const IoTHub = lazy(() => import("./pages/IoTHub"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPin = lazy(() => import("./pages/auth/ForgotPin"));
const EmailConfirmWait = lazy(() => import("./pages/auth/EmailConfirmWait"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Admin pages — lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMeters = lazy(() => import("./pages/admin/AdminMeters"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminMeterCommands = lazy(() => import("./pages/admin/AdminMeterCommands"));
const AdminKPLC = lazy(() => import("./pages/admin/AdminKPLC"));
const AdminNotificationsManager = lazy(() => import("./pages/admin/AdminNotificationsManager"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // Data fresh for 30s
      gcTime: 5 * 60_000,       // Keep cache 5 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Reduced from 2800ms to 1400ms
    const timer = setTimeout(() => setShowSplash(false), 1400);
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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Auth routes — public */}
                  <Route path="/auth/register" element={<Register />} />
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/pin" element={<PinSetup />} />
                  <Route path="/auth/confirm-email" element={<EmailConfirmWait />} />
                  <Route path="/auth/forgot-pin" element={<ForgotPin />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Protected app routes */}
                  <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
                  <Route path="/iot" element={<AuthGuard><IoTHub /></AuthGuard>} />
                  <Route path="/recharge" element={<AuthGuard><Recharge /></AuthGuard>} />
                  <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
                  <Route path="/transfer" element={<AuthGuard><Transfer /></AuthGuard>} />
                  <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                  <Route path="/meters" element={<AuthGuard><Meters /></AuthGuard>} />
                  <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                  <Route path="/faq" element={<AuthGuard><FAQ /></AuthGuard>} />
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
                  <Route path="/admin/analytics" element={<AdminGuard><AdminAnalytics /></AdminGuard>} />
                  <Route path="/admin/activity" element={<AdminGuard><AdminActivityLog /></AdminGuard>} />
                  <Route path="/admin/wallets" element={<AdminGuard><AdminWallets /></AdminGuard>} />
                  <Route path="/admin/meter-commands" element={<AdminGuard><AdminMeterCommands /></AdminGuard>} />
                  <Route path="/admin/kplc" element={<AdminGuard><AdminKPLC /></AdminGuard>} />
                  <Route path="/admin/notifications" element={<AdminGuard><AdminNotificationsManager /></AdminGuard>} />
                  <Route path="/admin/security" element={<AdminGuard><AdminSecurity /></AdminGuard>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
