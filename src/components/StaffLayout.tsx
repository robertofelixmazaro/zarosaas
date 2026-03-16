import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Users, LogOut, Menu, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/st" },
  { icon: Calendar, label: "Minha Agenda", path: "/st/agenda" },
  { icon: Users, label: "Meus Clientes", path: "/st/clientes" },
];

const StaffLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { tenant } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("auth_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStaffName(data.name);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r z-50 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-7 w-7 rounded-full object-cover" />
          ) : null}
          <span className="font-bold tracking-tight">{tenant?.name || "EQUIPE"}</span>
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
        <div className="p-3 border-t space-y-2">
          {staffName && (
            <p className="text-xs text-muted-foreground px-3 truncate">{staffName}</p>
          )}
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen">
        <header className="h-16 border-b flex items-center px-4 lg:px-6 gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">
            {navItems.find((n) => n.path === location.pathname)?.label || "Painel do Profissional"}
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

export default StaffLayout;
