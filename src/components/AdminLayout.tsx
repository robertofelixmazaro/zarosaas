import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, Package, BarChart3, Settings, Menu, X, LogOut, Sparkles, Bell, Star, ShoppingBag, MessageSquare, Download, Image, ExternalLink, CreditCard, AlertTriangle, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { getNicheLabels } from "@/lib/nicheLabels";
import { getTenantBasePath, getTenantExternalUrl, getTenantAdminUrl } from "@/lib/tenantUrl";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { playNotificationSound, playOrderSound } from "@/lib/notificationSound";
import ThemeToggle from "@/components/ThemeToggle";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import PlanUpgradeBanner from "@/components/PlanUpgradeBanner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import OnboardingWizard from "@/components/OnboardingWizard";
import HelpCenter from "@/components/HelpCenter";
import GuidedTour from "@/components/GuidedTour";

const getNavItems = (staffLabel: string) => [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", roles: ["admin"] },
  { icon: Calendar, label: "Agendamentos", path: "/admin/agendamentos", roles: ["admin"] },
  { icon: Users, label: "Clientes", path: "/admin/clientes", roles: ["admin"] },
  { icon: Sparkles, label: "Serviços", path: "/admin/servicos", roles: ["admin"] },
  { icon: Users, label: staffLabel, path: "/admin/barbeiros", roles: ["admin"] },
  { icon: Package, label: "Produtos", path: "/admin/produtos", roles: ["admin"] },
  { icon: ShoppingBag, label: "Pedidos", path: "/admin/pedidos", roles: ["admin"] },
  { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios", roles: ["admin"] },
  { icon: Star, label: "Avaliações", path: "/admin/avaliacoes", roles: ["admin"] },
  { icon: MessageSquare, label: "Lembretes", path: "/admin/lembretes", roles: ["admin"] },
  { icon: Clock, label: "Horários", path: "/admin/horarios", roles: ["admin"] },
  { icon: Image, label: "Galeria", path: "/admin/galeria", roles: ["admin"] },
  { icon: ExternalLink, label: "Landing Page", path: "/admin/landing", roles: ["admin"] },
  { icon: CreditCard, label: "Faturamento", path: "/admin/billing", roles: ["admin"] },
  { icon: Shield, label: "Segurança", path: "/admin/seguranca", roles: ["admin"] },
  { icon: Settings, label: "Configurações", path: "/admin/config", roles: ["admin"] },
];

const SubscriptionBlockedOverlay = ({ basePath }: { basePath: string }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Assinatura Expirada</h2>
          <p className="text-muted-foreground">
            Sua assinatura expirou ou foi cancelada. Renove para continuar usando o sistema.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            className="w-full h-12 text-base"
            onClick={() => navigate(`${basePath}/admin/billing`)}
          >
            Renovar Assinatura
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/comprar")}
          >
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const { tenantSlug, tenant } = useTenant();
  const { limits, loading: limitsLoading } = usePlanLimits();
  const nicheLabels = getNicheLabels(tenant?.niche);
  const basePath = getTenantBasePath(tenantSlug);
  const role = userRole || "client";
  const allNavItems = getNavItems(nicheLabels.staffTitle);
  const navItems = allNavItems.filter((item) => item.roles.includes(role)).map(item => ({
    ...item,
    path: `${basePath}${item.path}`,
  }));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Check if onboarding has been completed and if tour should show
  useEffect(() => {
    if (!tenant?.id || userRole !== "admin") return;
    supabase
      .from("tenants")
      .select("onboarding_completed")
      .eq("id", tenant.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !(data as any).onboarding_completed) {
          setShowOnboarding(true);
        }
      });
  }, [tenant?.id, userRole]);

  // Check tour status after onboarding
  useEffect(() => {
    if (showOnboarding || !tenant?.id || userRole !== "admin") return;
    const tourKey = `zaro_tour_done_${tenant.id}`;
    if (localStorage.getItem(tourKey)) return;

    // Check if tour is enabled globally
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "help_tour_enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (!data || data.value !== "false") {
          setShowTour(true);
        }
      });
  }, [showOnboarding, tenant?.id, userRole]);

  // Check if the current page is billing (allow access even when blocked)
  const isBillingPage = location.pathname.includes("/admin/billing");
  const showBlockedOverlay = !limitsLoading && limits.subscriptionBlocked && !isBillingPage;

  useEffect(() => {
    const appointmentChannel = supabase
      .channel("admin-new-appointments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const appt = payload.new as any;
          setNewCount((c) => c + 1);
          playNotificationSound();
          toast.info("Novo agendamento!", {
            description: `${appt.client_name} agendou para ${appt.appointment_date} às ${appt.appointment_time}`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    const orderChannel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as any;
          setNewCount((c) => c + 1);
          playOrderSound();
          toast.info("Novo pedido de produto! 🛒", {
            description: `${order.customer_name} — R$ ${Number(order.total).toFixed(0)}`,
            duration: 8000,
            action: {
              label: "Ver pedidos",
              onClick: () => navigate(`${basePath}/admin/pedidos`),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate(`${basePath}`);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {showBlockedOverlay && <SubscriptionBlockedOverlay basePath={basePath} />}
      {showOnboarding && tenant && (
        <OnboardingWizard
          tenantId={tenant.id}
          currentSlug={tenant.slug || ""}
          onComplete={(newSlug) => {
            setShowOnboarding(false);
            if (newSlug !== tenant.slug) {
              window.location.href = getTenantAdminUrl(newSlug);
              window.location.reload();
            }
          }}
        />
      )}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r z-50 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-7 w-7 rounded-full object-cover" />
          ) : null}
          <span className="font-bold tracking-tight">{tenant?.name || "ADMIN"}</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                data-tour={item.path.split("/admin/")[1] || "dashboard"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          {tenantSlug && (
            <a href={getTenantExternalUrl(tenantSlug)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" size="sm">
                <ExternalLink className="h-4 w-4" /> Ver Landing Page
              </Button>
            </a>
          )}
          {canInstall && !isInstalled && (
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" size="sm" onClick={async () => {
              const ok = await install();
              if (ok) toast.info("App instalado!");
            }}>
              <Download className="h-4 w-4" /> Instalar App
            </Button>
          )}
          {isInstalled && (
            <p className="text-xs text-muted-foreground px-3 py-1 flex items-center gap-1">✅ App instalado</p>
          )}
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <header className="h-16 border-b flex items-center px-4 lg:px-6 gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">
            {navItems.find((n) => n.path === location.pathname)?.label || "Painel Admin"}
          </h1>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => { setNewCount(0); navigate(`${basePath}/admin/agendamentos`); }}
          >
            <Bell className="h-5 w-5" />
            {newCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {newCount}
              </Badge>
            )}
          </Button>
        </header>
        <PlanUpgradeBanner />
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      <HelpCenter onRestartTour={() => setShowTour(true)} />

      {showTour && (
        <GuidedTour
          onComplete={() => {
            setShowTour(false);
            if (tenant?.id) {
              localStorage.setItem(`zaro_tour_done_${tenant.id}`, "completed");
            }
          }}
          onSkip={() => {
            setShowTour(false);
            if (tenant?.id) {
              localStorage.setItem(`zaro_tour_done_${tenant.id}`, "skipped");
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminLayout;
