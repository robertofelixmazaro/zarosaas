import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import LandingPage from "./pages/LandingPage";
import TenantSignupPage from "./pages/TenantSignupPage";
import Index from "./pages/Index";
import AgendarPage from "./pages/AgendarPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAgendamentos from "./pages/admin/AdminAgendamentos";
import AdminServicos from "./pages/admin/AdminServicos";
import AdminBarbeiros from "./pages/admin/AdminBarbeiros";
import AdminProdutos from "./pages/admin/AdminProdutos";
import AdminRelatorios from "./pages/admin/AdminRelatorios";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAvaliacoes from "./pages/admin/AdminAvaliacoes";
import AdminPedidos from "./pages/admin/AdminPedidos";
import AdminLembretes from "./pages/admin/AdminLembretes";
import AdminGaleria from "./pages/admin/AdminGaleria";
import MinhasAvaliacoes from "./pages/MinhasAvaliacoes";
import QRCodePage from "./pages/QRCodePage";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformTenants from "./pages/platform/PlatformTenants";
import PlatformLoginPage from "./pages/platform/PlatformLoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (userRole && userRole !== "admin" && userRole !== "barber") return <Navigate to="/" replace />;
  if (!userRole) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/admin-platform/login" replace />;
  if (userRole !== "super_admin") return <Navigate to="/admin-platform/login" replace />;
  return <>{children}</>;
};

const TenantRoutes = () => (
  <TenantProvider>
    <Routes>
      <Route index element={<Index />} />
      <Route path="agendar" element={<AgendarPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="minhas-avaliacoes" element={<MinhasAvaliacoes />} />
      <Route path="qrcode" element={<QRCodePage />} />
      <Route path="admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/agendamentos" element={<ProtectedRoute><AdminLayout><AdminAgendamentos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/servicos" element={<ProtectedRoute><AdminLayout><AdminServicos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/barbeiros" element={<ProtectedRoute><AdminLayout><AdminBarbeiros /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/produtos" element={<ProtectedRoute><AdminLayout><AdminProdutos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/relatorios" element={<ProtectedRoute><AdminLayout><AdminRelatorios /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/config" element={<ProtectedRoute><AdminLayout><AdminConfig /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/avaliacoes" element={<ProtectedRoute><AdminLayout><AdminAvaliacoes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/pedidos" element={<ProtectedRoute><AdminLayout><AdminPedidos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/lembretes" element={<ProtectedRoute><AdminLayout><AdminLembretes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/galeria" element={<ProtectedRoute><AdminLayout><AdminGaleria /></AdminLayout></ProtectedRoute>} />
    </Routes>
  </TenantProvider>
);

// Redirect legacy /admin to /t/:slug/admin
const LegacyAdminRedirect = () => {
  const { user, loading } = useAuth();
  const [redirectSlug, setRedirectSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const findTenant = async () => {
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("tenant_id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (profile && (profile as any).tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants" as any)
          .select("slug")
          .eq("id", (profile as any).tenant_id)
          .maybeSingle();
        if (tenant) setRedirectSlug((tenant as any).slug);
      }
    };
    findTenant();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (redirectSlug) return <Navigate to={`/t/${redirectSlug}/admin`} replace />;
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/novo-negocio" element={<TenantSignupPage />} />
    <Route path="/t/:slug/*" element={<TenantRoutes />} />
    <Route path="/admin/*" element={<LegacyAdminRedirect />} />
    <Route path="/admin-platform/login" element={<PlatformLoginPage />} />
    <Route path="/admin-platform" element={<SuperAdminRoute><PlatformDashboard /></SuperAdminRoute>} />
    <Route path="/admin-platform/tenants" element={<SuperAdminRoute><PlatformTenants /></SuperAdminRoute>} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
