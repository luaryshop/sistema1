import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Marketplaces from "./pages/Marketplaces";
import Dashboard from "./pages/Dashboard";
import Orders from "@/pages/Orders";
import Cadastros from "@/pages/Cadastros";
import SalesChannels from "@/pages/SalesChannels";
import Omnichannel from "@/pages/Omnichannel";
import SEOAdvanced from "@/pages/SEOAdvanced";
import Operations from "./pages/Operations";
import Supply from "./pages/Supply";
import SupplySection from "./pages/SupplySection";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard"><DashboardLayout><Dashboard /></DashboardLayout></Route>
      <Route path="/produtos"><DashboardLayout><Products /></DashboardLayout></Route>
      <Route path="/pedidos"><DashboardLayout><Orders /></DashboardLayout></Route>
      <Route path="/marketplaces"><DashboardLayout><Marketplaces /></DashboardLayout></Route>
      <Route path="/cadastros"><DashboardLayout><Cadastros /></DashboardLayout></Route>
      <Route path="/canais"><DashboardLayout><SalesChannels /></DashboardLayout></Route>
      <Route path="/omnichannel"><DashboardLayout><Omnichannel /></DashboardLayout></Route>
      <Route path="/seo-avancado"><DashboardLayout><SEOAdvanced /></DashboardLayout></Route>
      <Route path="/operacoes"><DashboardLayout><Operations /></DashboardLayout></Route>
      <Route path="/supply"><DashboardLayout><Supply /></DashboardLayout></Route>
      <Route path="/supply/:section"><DashboardLayout><SupplySection /></DashboardLayout></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
