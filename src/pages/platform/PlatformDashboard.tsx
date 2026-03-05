import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, CalendarCheck, TrendingUp, CreditCard, BarChart3, Settings, UserCog, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PlatformHeader from "@/components/PlatformHeader";

interface Stats {
  totalTenants: number;
  totalUsers: number;
  totalAppointments: number;
  newTenantsThisMonth: number;
}

const PlatformDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    totalUsers: 0,
    totalAppointments: 0,
    newTenantsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [tenants, users, appointments, newTenants] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("tenants").select("id", { count: "exact", head: true }).gte("created_at", firstOfMonth),
      ]);

      setStats({
        totalTenants: tenants.count ?? 0,
        totalUsers: users.count ?? 0,
        totalAppointments: appointments.count ?? 0,
        newTenantsThisMonth: newTenants.count ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total de Negócios", value: stats.totalTenants, icon: Building2, color: "text-blue-500" },
    { title: "Total de Usuários", value: stats.totalUsers, icon: Users, color: "text-green-500" },
    { title: "Total de Agendamentos", value: stats.totalAppointments, icon: CalendarCheck, color: "text-amber-500" },
    { title: "Novos Negócios (mês)", value: stats.newTenantsThisMonth, icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin-platform/tenants"><Button variant="outline" size="sm"><Building2 className="h-4 w-4 mr-1" />Negócios</Button></Link>
          <Link to="/admin-platform/planos"><Button variant="outline" size="sm"><CreditCard className="h-4 w-4 mr-1" />Planos</Button></Link>
          <Link to="/admin-platform/relatorios"><Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-1" />Relatórios</Button></Link>
          <Link to="/admin-platform/usuarios"><Button variant="outline" size="sm"><UserCog className="h-4 w-4 mr-1" />Usuários</Button></Link>
          <Link to="/admin-platform/configuracoes"><Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Configurações</Button></Link>
          <Link to="/admin-platform/pagamentos"><Button variant="outline" size="sm"><DollarSign className="h-4 w-4 mr-1" />Pagamentos</Button></Link>
        </div>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlatformDashboard;
