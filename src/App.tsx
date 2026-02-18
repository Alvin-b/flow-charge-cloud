import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import SplashScreen from "./pages/SplashScreen";
import PhoneEntry from "./pages/auth/PhoneEntry";
import OTPVerify from "./pages/auth/OTPVerify";
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
    // Register service worker
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/auth/phone" element={<PhoneEntry />} />
              <Route path="/auth/otp" element={<OTPVerify />} />
              <Route path="/auth/pin" element={<PinSetup />} />
              {/* App */}
              <Route path="/" element={<Home />} />
              <Route path="/recharge" element={<Recharge />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/meters" element={<Meters />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
