import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, Users, DollarSign, TrendingUp } from "lucide-react";

interface StaffStats {
  totalAppointments: number;
  totalClients: number;
  totalRevenue: number;
  totalCommission: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
}

interface RecentAppointment {
  id: string;
  client_name: string;
  service_name: string;
  price: number;
  staff_commission: number;
  appointment_date: string;
  status: string;
}

const AdminStaffReport = () => {
  const { id: barberId } = useParams<{ id: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [barber, setBarber] = useState<{ name: string; photo_url: string | null; specialty: string | null } | null>(null);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [recent, setRecent] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !barberId) return;

    const load = async () => {
      setLoading(true);

      // Fetch barber info
      const { data: barberData } = await supabase
        .from("barbers")
        .select("name, photo_url, specialty")
        .eq("id", barberId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (barberData) setBarber(barberData as any);

      // Fetch all completed appointments for this barber
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, client_name, price, staff_commission, company_revenue, appointment_date, status, services(name)")
        .eq("barber_id", barberId)
        .eq("tenant_id", tenantId)
        .order("appointment_date", { ascending: false });

      const appts = (appointments as any[]) || [];
      const completed = appts.filter(a => a.status === "concluido");

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const uniqueClients = new Set(completed.map(a => a.client_name?.toLowerCase().trim()));

      setStats({
        totalAppointments: completed.length,
        totalClients: uniqueClients.size,
        totalRevenue: completed.reduce((s, a) => s + (a.price || 0), 0),
        totalCommission: completed.reduce((s, a) => s + (a.staff_commission || 0), 0),
        revenueToday: completed.filter(a => a.appointment_date === today).reduce((s, a) => s + (a.price || 0), 0),
        revenueWeek: completed.filter(a => a.appointment_date >= weekAgo).reduce((s, a) => s + (a.price || 0), 0),
        revenueMonth: completed.filter(a => a.appointment_date >= monthAgo).reduce((s, a) => s + (a.price || 0), 0),
      });

      setRecent(appts.slice(0, 20).map(a => ({
        id: a.id,
        client_name: a.client_name,
        service_name: a.services?.name || "-",
        price: a.price || 0,
        staff_commission: a.staff_commission || 0,
        appointment_date: a.appointment_date,
        status: a.status,
      })));

      setLoading(false);
    };

    load();
  }, [tenantId, barberId]);

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;
  if (!barber) return <div className="text-center py-10 text-muted-foreground">Colaborador não encontrado.</div>;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const statusMap: Record<string, string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
    no_show: "Não compareceu",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          {barber.photo_url ? (
            <img src={barber.photo_url} alt={barber.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
              {barber.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{barber.name}</h2>
            {barber.specialty && <p className="text-sm text-muted-foreground">{barber.specialty}</p>}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Agendamentos</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalAppointments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Clientes</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Faturamento</span>
            </div>
            <p className="text-2xl font-bold">{fmt(stats?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Comissão</span>
            </div>
            <p className="text-2xl font-bold">{fmt(stats?.totalCommission || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturamento por período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-lg font-semibold">{fmt(stats?.revenueToday || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              <p className="text-lg font-semibold">{fmt(stats?.revenueWeek || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
              <p className="text-lg font-semibold">{fmt(stats?.revenueMonth || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum atendimento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                recent.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.client_name}</TableCell>
                    <TableCell>{a.service_name}</TableCell>
                    <TableCell>{fmt(a.price)}</TableCell>
                    <TableCell>{fmt(a.staff_commission)}</TableCell>
                    <TableCell>{new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{statusMap[a.status] || a.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStaffReport;
