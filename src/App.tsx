import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import Profile from "./pages/Profile";
import CompanyProfile from "./pages/CompanyProfile";
import DriverTracking from "./pages/DriverTracking";
import CustomerTracking from "./pages/CustomerTracking";
import TrackingPage from "./pages/TrackingPage";
import NotFound from "./pages/NotFound";
import BillingPage from "./pages/Billing";

import DriverLinkRouter from "./pages/DriverLinkRouter";
import SupportWidget from "./components/SupportWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company-dashboard" element={<CompanyDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/company-profile" element={<CompanyProfile />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/driver/:token" element={<DriverTracking />} />
          <Route path="/d/:token" element={<DriverLinkRouter />} />
          <Route path="/track/:token" element={<CustomerTracking />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SupportWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
