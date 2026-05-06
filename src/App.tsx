import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SocProvider } from "@/mock/store";
import SocLayout from "@/components/soc/SocLayout";
import Dashboard from "./pages/soc/Dashboard";
import Alerts from "./pages/soc/Alerts";
import Logs from "./pages/soc/Logs";
import Analytics from "./pages/soc/Analytics";
import Anomalies from "./pages/soc/Anomalies";
import ThreatIntel from "./pages/soc/ThreatIntel";
import Assets from "./pages/soc/Assets";
import Rules from "./pages/soc/Rules";
import Integrations from "./pages/soc/Integrations";
import Settings from "./pages/soc/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SocProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SocLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/anomalies" element={<Anomalies />} />
              <Route path="/threat-intel" element={<ThreatIntel />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SocProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
