import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { detectTenantSlug } from "@/lib/tenantResolver";
import NotFound from "./pages/NotFound";

// Lazy load all pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const UnifiedLoginPage = lazy(() => import("./pages/UnifiedLoginPage"));
const SaasSignupPage = lazy(() => import("./pages/SaasSignupPage"));
const Index = lazy(() => import("./pages/Index"));
const AgendarPage = lazy(() => import("./pages/AgendarPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAgendamentos = lazy(() => import("./pages/admin/AdminAgendamentos"));
const AdminServicos = lazy(() => import("./pages/admin/AdminServicos"));
const AdminBarbeiros = lazy(() => import("./pages/admin/AdminBarbeiros"));
const AdminProdutos = lazy(() => import("./pages/admin/AdminProdutos"));
const AdminRelatorios = lazy(() => import("./pages/admin/AdminRelatorios"));
const AdminConfig = lazy(() => import("./pages/admin/AdminConfig"));
const AdminAvaliacoes = lazy(() => import("./pages/admin/AdminAvaliacoes"));
const AdminPedidos = lazy(() => import("./pages/admin/AdminPedidos"));
const AdminLembretes = lazy(() => import("./pages/admin/AdminLembretes"));
const AdminGaleria = lazy(() => import("./pages/admin/AdminGaleria"));
const AdminLandingPage = lazy(() => import("./pages/admin/AdminLandingPage"));
const AdminClientes = lazy(() => import("./pages/admin/AdminClientes"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminHorarios = lazy(() => import("./pages/admin/AdminHorarios"));
const AdminSeguranca = lazy(() => import("./pages/admin/AdminSeguranca"));
const AdminRouter = lazy(() => import("./pages/admin/AdminRouter"));
const MinhasAvaliacoes = lazy(() => import("./pages/MinhasAvaliacoes"));
const QRCodePage = lazy(() => import("./pages/QRCodePage"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformTenants = lazy(() => import("./pages/platform/PlatformTenants"));
const PlatformPlans = lazy(() => import("./pages/platform/PlatformPlans"));
const PlatformReports = lazy(() => import("./pages/platform/PlatformReports"));
const PlatformSettings = lazy(() => import("./pages/platform/PlatformSettings"));
const PlatformUsers = lazy(() => import("./pages/platform/PlatformUsers"));
const PlatformUserDetail = lazy(() => import("./pages/platform/PlatformUserDetail"));
const PlatformPayments = lazy(() => import("./pages/platform/PlatformPayments"));
const PlatformStores = lazy(() => import("./pages/platform/PlatformStores"));
const AffiliateLayout = lazy(() => import("./components/AffiliateLayout"));
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));
const AffiliateSales = lazy(() => import("./pages/affiliate/AffiliateSales"));
const AffiliateReferrals = lazy(() => import("./pages/affiliate/AffiliateReferrals"));
const ReferralRedirectPage = lazy(() => import("./pages/ReferralRedirectPage"));
const PlatformAffiliates = lazy(() => import("./pages/platform/PlatformAffiliates"));
const ComprarPage = lazy(() => import("./pages/ComprarPage"));
const ConfirmAppointmentPage = lazy(() => import("./pages/ConfirmAppointmentPage"));
const CancelAppointmentPage = lazy(() => import("./pages/CancelAppointmentPage"));
const PlatformWhatsApp = lazy(() => import("./pages/platform/PlatformWhatsApp"));
const PlatformLandingPage = lazy(() => import("./pages/platform/PlatformLandingPage"));
const PlatformHelpCenter = lazy(() => import("./pages/platform/PlatformHelpCenter"));
const PlatformCommissions = lazy(() => import("./pages/platform/PlatformCommissions"));
const SuperAdminLayout = lazy(() => import("./components/SuperAdminLayout"));
const SuperAdminLoginPage = lazy(() => import("./pages/SuperAdminLoginPage"));
const CompleteRegistrationPage = lazy(() => import("./pages/CompleteRegistrationPage"));
const StaffLayout = lazy(() => import("./components/StaffLayout"));
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const StaffAgenda = lazy(() => import("./pages/staff/StaffAgenda"));
const StaffClientes = lazy(() => import("./pages/staff/StaffClientes"));
const ExploreMarketplace = lazy(() => import("./pages/ExploreMarketplace"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Route guard: redirects to /login if not authenticated
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, loading, roleLoading, userRole } = useAuth();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!userRole || !allowedRoles.includes(userRole)) {
    if (userRole === "super_admin") return <Navigate to="/superadmin/dashboard" replace />;
    if (userRole === "affiliate") return <Navigate to="/affiliate/dashboard" replace />;
    if (userRole === "staff") return <Navigate to="/staff-dashboard/agenda" replace />;
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
      <Route path="admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/agendamentos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminAgendamentos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/servicos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminServicos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/barbeiros" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminBarbeiros /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/produtos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminProdutos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/relatorios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminRelatorios /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/config" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminConfig /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/avaliacoes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminAvaliacoes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/pedidos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminPedidos /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/lembretes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminLembretes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/galeria" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminGaleria /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/landing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminLandingPage /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/clientes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminClientes /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminBilling /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/horarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminHorarios /></AdminLayout></ProtectedRoute>} />
      <Route path="admin/seguranca" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminSeguranca /></AdminLayout></ProtectedRoute>} />
    </Routes>
  </TenantProvider>
);

// Detect subdomain tenant once
const subdomainDetection = detectTenantSlug();
const isSubdomainAccess = subdomainDetection.slug !== null;

/**
 * When accessed via subdomain (e.g. vcclimatizacao.usaruistemas.com.br),
 * all root routes become tenant routes automatically.
 */
const SubdomainTenantRoutes = () => (
  <TenantProvider>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Tenant public pages at root */}
        <Route index element={<Index />} />
        <Route path="agendar" element={<AgendarPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="minhas-avaliacoes" element={<MinhasAvaliacoes />} />
        <Route path="qrcode" element={<QRCodePage />} />
        <Route path="comprar" element={<ComprarPage />} />

        {/* Tenant admin routes */}
        <Route path="admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/agendamentos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminAgendamentos /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/servicos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminServicos /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/barbeiros" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminBarbeiros /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/produtos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminProdutos /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/relatorios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminRelatorios /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/config" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminConfig /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/avaliacoes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminAvaliacoes /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/pedidos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminPedidos /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/lembretes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminLembretes /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/galeria" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminGaleria /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/landing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminLandingPage /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/clientes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminClientes /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminBilling /></AdminLayout></ProtectedRoute>} />
        <Route path="admin/horarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><AdminHorarios /></AdminLayout></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </TenantProvider>
);

const AppRoutes = () => {
  // If accessed via subdomain, render tenant routes at root level
  if (isSubdomainAccess) {
    return <SubdomainTenantRoutes />;
  }

  // Standard path-based routing
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/explorar" element={<ExploreMarketplace />} />
        <Route path="/login" element={<UnifiedLoginPage />} />
        <Route path="/cadastrar" element={<SaasSignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/comprar" element={<ComprarPage />} />
        <Route path="/ref/:code" element={<ReferralRedirectPage />} />
        <Route path="/completar-cadastro" element={<CompleteRegistrationPage />} />
        <Route path="/confirmar-agendamento/:id" element={<ConfirmAppointmentPage />} />
        <Route path="/cancelar-agendamento/:id" element={<CancelAppointmentPage />} />

        {/* Legacy redirects */}
        <Route path="/entrar" element={<Navigate to="/login" replace />} />
        <Route path="/admin-platform/login" element={<Navigate to="/login" replace />} />

        {/* Admin (tenant admin) — /dashboard resolves tenant and redirects */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRouter /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

        {/* Super Admin */}
        <Route path="/superadmin" element={<SuperAdminLoginPage />} />
        <Route path="/superadmin/dashboard" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformDashboard /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/tenants" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformTenants /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/stores" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformStores /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/planos" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformPlans /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/relatorios" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformReports /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/configuracoes" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformSettings /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/usuarios" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformUsers /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/users/:id" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformUserDetail /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/pagamentos" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformPayments /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/affiliates" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformAffiliates /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/whatsapp" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformWhatsApp /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/landing" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformLandingPage /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/help-center" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformHelpCenter /></SuperAdminLayout></ProtectedRoute>} />
        <Route path="/superadmin/commissions" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminLayout><PlatformCommissions /></SuperAdminLayout></ProtectedRoute>} />
        {/* Legacy super admin redirects */}
        <Route path="/admin-platform" element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="/admin-platform/*" element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="/super-admin/*" element={<Navigate to="/superadmin/dashboard" replace />} />

        {/* Affiliate */}
        <Route path="/affiliate/dashboard" element={<ProtectedRoute allowedRoles={["affiliate"]}><AffiliateLayout><AffiliateDashboard /></AffiliateLayout></ProtectedRoute>} />
        <Route path="/affiliate/referrals" element={<ProtectedRoute allowedRoles={["affiliate"]}><AffiliateLayout><AffiliateReferrals /></AffiliateLayout></ProtectedRoute>} />
        <Route path="/affiliate/sales" element={<ProtectedRoute allowedRoles={["affiliate"]}><AffiliateLayout><AffiliateSales /></AffiliateLayout></ProtectedRoute>} />

        {/* Staff */}
        <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={["staff"]}><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
        <Route path="/staff-dashboard/agenda" element={<ProtectedRoute allowedRoles={["staff"]}><StaffLayout><StaffAgenda /></StaffLayout></ProtectedRoute>} />
        <Route path="/staff-dashboard/clientes" element={<ProtectedRoute allowedRoles={["staff"]}><StaffLayout><StaffClientes /></StaffLayout></ProtectedRoute>} />

        {/* Tenant public routes (path-based) */}
        <Route path="/t/:slug/*" element={<TenantRoutes />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

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
