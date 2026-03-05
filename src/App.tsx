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
import SaasLoginPage from "./pages/SaasLoginPage";
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
import PlatformLoginPage from "./pages/platform/PlatformLoginPage";
import PlatformPlans from "./pages/platform/PlatformPlans";
import PlatformReports from "./pages/platform/PlatformReports";
import PlatformSettings from "./pages/platform/PlatformSettings";
import PlatformUsers from "./pages/platform/PlatformUsers";
import PlatformPayments from "./pages/platform/PlatformPayments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, roleLoading, userRole } = useAuth();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (userRole !== "admin" && userRole !== "barber" && userRole !== "client") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, roleLoading, userRole } = useAuth();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
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
      <Route path="admin/landing" element={<ProtectedRoute><AdminLayout><AdminLandingPage /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/clientes" element={<ProtectedRoute><AdminLayout><AdminClientes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/billing" element={<ProtectedRoute><AdminLayout><AdminBilling /></AdminLayout></ProtectedRoute>} />
    </Routes>
  </TenantProvider>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/entrar" element={<SaasLoginPage />} />
    <Route path="/cadastrar" element={<SaasSignupPage />} />
    <Route path="/admin" element={<AdminRouter />} />
    <Route path="/t/:slug/*" element={<TenantRoutes />} />
    <Route path="/admin-platform/login" element={<PlatformLoginPage />} />
    <Route path="/admin-platform" element={<SuperAdminRoute><PlatformDashboard /></SuperAdminRoute>} />
    <Route path="/admin-platform/tenants" element={<SuperAdminRoute><PlatformTenants /></SuperAdminRoute>} />
    <Route path="/admin-platform/planos" element={<SuperAdminRoute><PlatformPlans /></SuperAdminRoute>} />
    <Route path="/admin-platform/relatorios" element={<SuperAdminRoute><PlatformReports /></SuperAdminRoute>} />
    <Route path="/admin-platform/configuracoes" element={<SuperAdminRoute><PlatformSettings /></SuperAdminRoute>} />
    <Route path="/admin-platform/usuarios" element={<SuperAdminRoute><PlatformUsers /></SuperAdminRoute>} />
    <Route path="/admin-platform/pagamentos" element={<SuperAdminRoute><PlatformPayments /></SuperAdminRoute>} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/login" element={<Navigate to="/entrar" replace />} />
    <Route path="/novo-negocio" element={<Navigate to="/admin" replace />} />
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
