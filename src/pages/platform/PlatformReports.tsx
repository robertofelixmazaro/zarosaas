import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Users, CalendarCheck, Star } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface MonthlyData {
  month: string;
  count: number;
}

const PlatformReports = () => {
  const [tenantsPerMonth, setTenantsPerMonth] = useState<MonthlyData[]>([]);
  const [appointmentsPerMonth, setAppointmentsPerMonth] = useState<MonthlyData[]>([]);
  const [topTenants, setTopTenants] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all tenants with created_at
      const { data: tenants } = await supabase.from("tenants").select("created_at, name, id");
      // Fetch all appointments with created_at and tenant_id
      const { data: appointments } = await supabase.from("appointments").select("created_at, tenant_id");

      // Group tenants by month
      const tByMonth: Record<string, number> = {};
      (tenants || []).forEach((t: any) => {
        if (!t.created_at) return;
        const m = t.created_at.substring(0, 7); // YYYY-MM
        tByMonth[m] = (tByMonth[m] || 0) + 1;
      });

      // Group appointments by month
      const aByMonth: Record<string, number> = {};
      const aTenantCount: Record<string, number> = {};
      (appointments || []).forEach((a: any) => {
        if (!a.created_at) return;
        const m = a.created_at.substring(0, 7);
        aByMonth[m] = (aByMonth[m] || 0) + 1;
        if (a.tenant_id) {
          aTenantCount[a.tenant_id] = (aTenantCount[a.tenant_id] || 0) + 1;
        }
      });

      // Sort months
      const months = [...new Set([...Object.keys(tByMonth), ...Object.keys(aByMonth)])].sort();
      const last6 = months.slice(-6);

      setTenantsPerMonth(last6.map(m => ({ month: m, count: tByMonth[m] || 0 })));
      setAppointmentsPerMonth(last6.map(m => ({ month: m, count: aByMonth[m] || 0 })));

      // Top tenants by appointments
      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
      const top = Object.entries(aTenantCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ name: tenantMap.get(id) || id, count }));
      setTopTenants(top);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/super-admin/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Novos Negócios por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={tenantsPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} className="text-xs" />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={formatMonth} />
                      <Bar dataKey="count" name="Negócios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    Agendamentos por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={appointmentsPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} className="text-xs" />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={formatMonth} />
                      <Line type="monotone" dataKey="count" name="Agendamentos" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Top 5 Negócios por Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topTenants.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topTenants} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="count" name="Agendamentos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default PlatformReports;
