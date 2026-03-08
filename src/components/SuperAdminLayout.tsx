import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Handshake, CreditCard, UserCog,
  DollarSign, Globe, Settings, Menu, X, LogOut, Shield, HelpCircle, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/superadmin/dashboard" },
  { icon: Building2, label: "Lojas", path: "/superadmin/stores" },
  { icon: Handshake, label: "Afiliados", path: "/superadmin/affiliates" },
  { icon: Percent, label: "Comissões", path: "/superadmin/commissions" },
  { icon: CreditCard, label: "Planos", path: "/superadmin/planos" },
  { icon: UserCog, label: "Usuários", path: "/superadmin/usuarios" },
  { icon: DollarSign, label: "Pagamentos", path: "/superadmin/pagamentos" },
  { icon: Globe, label: "Landing Page", path: "/superadmin/landing" },
  { icon: HelpCircle, label: "Central de Ajuda", path: "/superadmin/help-center" },
  { icon: Settings, label: "Configurações", path: "/superadmin/configuracoes" },
];

const SuperAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/superadmin");
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
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">Zaro — Super Admin</span>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
          {user && (
            <p className="text-xs text-muted-foreground px-3 py-1 truncate">{user.email}</p>
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
            {navItems.find((n) => n.path === location.pathname)?.label || "Super Admin"}
          </h1>
          <ThemeToggle />
        </header>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
