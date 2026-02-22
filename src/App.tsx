import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
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
