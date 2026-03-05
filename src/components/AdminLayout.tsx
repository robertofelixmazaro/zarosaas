import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Scissors, LayoutDashboard, Calendar, Users, Package, BarChart3, Settings, Menu, X, LogOut, Sparkles, Bell, Star, ShoppingBag, MessageSquare, Download, Image, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { playNotificationSound, playOrderSound } from "@/lib/notificationSound";
import ThemeToggle from "@/components/ThemeToggle";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const allNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", roles: ["admin", "barber"] },
  { icon: Calendar, label: "Agendamentos", path: "/admin/agendamentos", roles: ["admin", "barber"] },
  { icon: Sparkles, label: "Serviços", path: "/admin/servicos", roles: ["admin"] },
  { icon: Users, label: "Barbeiros", path: "/admin/barbeiros", roles: ["admin"] },
  { icon: Package, label: "Produtos", path: "/admin/produtos", roles: ["admin"] },
  { icon: ShoppingBag, label: "Pedidos", path: "/admin/pedidos", roles: ["admin"] },
  { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios", roles: ["admin"] },
  { icon: Star, label: "Avaliações", path: "/admin/avaliacoes", roles: ["admin", "barber"] },
  { icon: MessageSquare, label: "Lembretes", path: "/admin/lembretes", roles: ["admin", "barber"] },
  { icon: Image, label: "Galeria", path: "/admin/galeria", roles: ["admin"] },
  { icon: Settings, label: "Configurações", path: "/admin/config", roles: ["admin"] },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const { tenantSlug, tenant } = useTenant();
  const basePath = tenantSlug ? `/t/${tenantSlug}` : "";
  const role = userRole || "client";
  const navItems = allNavItems.filter((item) => item.roles.includes(role)).map(item => ({
    ...item,
    path: `${basePath}${item.path}`,
  }));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const { canInstall, isInstalled, install } = usePwaInstall();

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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r z-50 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b">
          <Scissors className="h-5 w-5" />
          <span className="font-bold tracking-tight">{tenant?.name || "ADMIN"}</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
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
            <a href={`/t/${tenantSlug}`} target="_blank" rel="noopener noreferrer">
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
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
