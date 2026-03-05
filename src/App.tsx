import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import UnifiedLoginPage from "./pages/UnifiedLoginPage";
import SaasSignupPage from "./pages/SaasSignupPage";
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
import AdminLandingPage from "./pages/admin/AdminLandingPage";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminRouter from "./pages/admin/AdminRouter";
import MinhasAvaliacoes from "./pages/MinhasAvaliacoes";
import QRCodePage from "./pages/QRCodePage";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformTenants from "./pages/platform/PlatformTenants";
import PlatformPlans from "./pages/platform/PlatformPlans";
import PlatformReports from "./pages/platform/PlatformReports";
import PlatformSettings from "./pages/platform/PlatformSettings";
import PlatformUsers from "./pages/platform/PlatformUsers";
import PlatformPayments from "./pages/platform/PlatformPayments";
import PlatformStores from "./pages/platform/PlatformStores";
import AffiliateLayout from "./components/AffiliateLayout";
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";
import AffiliateSales from "./pages/affiliate/AffiliateSales";
import PlatformAffiliates from "./pages/platform/PlatformAffiliates";
import ComprarPage from "./pages/ComprarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Route guard: redirects to /login if not authenticated
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, loading, roleLoading, userRole } = useAuth();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to their correct dashboard
    if (userRole === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
    if (userRole === "affiliate") return <Navigate to="/affiliate/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
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
      <Route path="admin" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/agendamentos" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminAgendamentos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/servicos" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminServicos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/barbeiros" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminBarbeiros /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/produtos" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminProdutos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/relatorios" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminRelatorios /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/config" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminConfig /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/avaliacoes" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminAvaliacoes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/pedidos" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminPedidos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/lembretes" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminLembretes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/galeria" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminGaleria /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/landing" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminLandingPage /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/clientes" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminClientes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/billing" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminLayout><AdminBilling /></AdminLayout></ProtectedRoute>} />
    </Routes>
  </TenantProvider>
);

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<UnifiedLoginPage />} />
    <Route path="/cadastrar" element={<SaasSignupPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/comprar" element={<ComprarPage />} />

    {/* Legacy redirects */}
    <Route path="/entrar" element={<Navigate to="/login" replace />} />
    <Route path="/admin-platform/login" element={<Navigate to="/login" replace />} />

    {/* Admin (tenant admin) — /dashboard resolves tenant and redirects */}
    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin", "barber", "client"]}><AdminRouter /></ProtectedRoute>} />
    <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

    {/* Super Admin */}
    <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformDashboard /></ProtectedRoute>} />
    <Route path="/super-admin/tenants" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformTenants /></ProtectedRoute>} />
    <Route path="/super-admin/stores" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformStores /></ProtectedRoute>} />
    <Route path="/super-admin/planos" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformPlans /></ProtectedRoute>} />
    <Route path="/super-admin/relatorios" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformReports /></ProtectedRoute>} />
    <Route path="/super-admin/configuracoes" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformSettings /></ProtectedRoute>} />
    <Route path="/super-admin/usuarios" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformUsers /></ProtectedRoute>} />
    <Route path="/super-admin/pagamentos" element={<ProtectedRoute allowedRoles={["super_admin"]}><PlatformPayments /></ProtectedRoute>} />
    {/* Legacy super admin redirects */}
    <Route path="/admin-platform" element={<Navigate to="/super-admin/dashboard" replace />} />
    <Route path="/admin-platform/*" element={<Navigate to="/super-admin/dashboard" replace />} />

    {/* Affiliate */}
    <Route path="/affiliate/dashboard" element={<ProtectedRoute allowedRoles={["affiliate"]}><AffiliateLayout><AffiliateDashboard /></AffiliateLayout></ProtectedRoute>} />
    <Route path="/affiliate/sales" element={<ProtectedRoute allowedRoles={["affiliate"]}><AffiliateLayout><AffiliateSales /></AffiliateLayout></ProtectedRoute>} />

    {/* Tenant public routes */}
    <Route path="/t/:slug/*" element={<TenantRoutes />} />

    {/* Catch-all */}
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
