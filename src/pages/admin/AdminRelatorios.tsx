import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAppointmentsAdmin, fetchBarbers, fetchServices, DbBarber, DbService } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { getNicheLabels } from "@/lib/nicheLabels";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, startOfMonth, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DbAppointment } from "@/lib/api";

const COLORS = [
  "hsl(210, 100%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(270, 70%, 55%)",
  "hsl(190, 80%, 45%)",
];

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(filtered: DbAppointment[], barberMap: Record<string, string>) {
  const header = "Data,Horário,Cliente,Telefone,Profissional,Serviço,Valor,Status";
  const rows = filtered.map((a) =>
    [
      a.appointment_date,
      a.appointment_time,
      `"${a.client_name}"`,
      a.client_phone,
      `"${a.barbers?.name || barberMap[a.barber_id] || ""}"`,
      `"${a.services?.name || ""}"`,
      Number(a.price).toFixed(2).replace(".", ","),
      a.status,
    ].join(";")
  );
  downloadFile([header, ...rows].join("\n"), "relatorio.csv", "text/csv;charset=utf-8");
}

function exportPDF(
  filtered: DbAppointment[],
  barberMap: Record<string, string>,
  totalGeral: number,
  totalConcluidos: number,
  businessName: string = "Meu Negócio"
) {
  const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const tableRows = filtered
    .map(
      (a) =>
        `<tr><td>${a.appointment_date}</td><td>${a.appointment_time}</td><td>${a.client_name}</td><td>${a.barbers?.name || barberMap[a.barber_id] || ""}</td><td>${a.services?.name || ""}</td><td>${fmtBRL(Number(a.price))}</td><td>${a.status}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório</title>
<style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#000;color:#fff}.summary{display:flex;gap:24px;margin:16px 0}.card{background:#f5f5f5;padding:12px 16px;border-radius:8px}.card .label{font-size:11px;color:#666}.card .val{font-size:18px;font-weight:bold}</style></head>
<body><h1>Relatório — ${businessName}</h1>
<div class="summary">
<div class="card"><div class="label">Faturamento Total</div><div class="val">${fmtBRL(totalGeral)}</div></div>
<div class="card"><div class="label">Agendamentos</div><div class="val">${filtered.length}</div></div>
<div class="card"><div class="label">Ticket Médio</div><div class="val">${filtered.length ? fmtBRL(totalGeral / filtered.length) : "R$ 0,00"}</div></div>
<div class="card"><div class="label">Conclusão</div><div class="val">${filtered.length ? Math.round((totalConcluidos / filtered.length) * 100) : 0}%</div></div>
</div>
<table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Profissional</th><th>Serviço</th><th>Valor</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

const AdminRelatorios = () => {
  const { tenantId, tenant } = useTenant();
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments", tenantId],
    queryFn: () => fetchAppointmentsAdmin(undefined, tenantId || undefined),
    enabled: !!tenantId,
  });
  const { data: barbers = [] } = useQuery<DbBarber[]>({ queryKey: ["barbers", tenantId], queryFn: () => fetchBarbers(tenantId || undefined), enabled: !!tenantId });
  const { data: services = [] } = useQuery<DbService[]>({ queryKey: ["services", tenantId], queryFn: () => fetchServices(tenantId || undefined), enabled: !!tenantId });

  const filtered = useMemo(() => {
    if (!startDate && !endDate) return appointments;
    return appointments.filter((a) => {
      const d = parseISO(a.appointment_date);
      const start = startDate ? startOfDay(startDate) : new Date(0);
      const end = endDate ? endOfDay(endDate) : new Date(9999, 11, 31);
      return isWithinInterval(d, { start, end });
    });
  }, [appointments, startDate, endDate]);

  if (loadingAppts) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Relatórios</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const barberMap = Object.fromEntries(barbers.map((b) => [b.id, b.name]));
  const totalGeral = filtered.reduce((acc, a) => acc + Number(a.price), 0);
  const totalConcluidos = filtered.filter((a) => a.status === "concluido" || a.status === "confirmado").length;

  const porBarbeiro: Record<string, number> = {};
  filtered.forEach((a) => {
    const name = a.barbers?.name || barberMap[a.barber_id] || "Desconhecido";
    porBarbeiro[name] = (porBarbeiro[name] || 0) + Number(a.price);
  });
  const barberData = Object.entries(porBarbeiro).map(([name, value]) => ({ name, value }));

  const porServico: Record<string, number> = {};
  filtered.forEach((a) => {
    const name = a.services?.name || "Desconhecido";
    porServico[name] = (porServico[name] || 0) + 1;
  });
  const serviceData = Object.entries(porServico).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const porMes: Record<string, number> = {};
  filtered.forEach((a) => {
    const month = format(startOfMonth(parseISO(a.appointment_date)), "MMM/yy", { locale: ptBR });
    porMes[month] = (porMes[month] || 0) + Number(a.price);
  });
  const monthlyData = Object.entries(porMes).map(([name, value]) => ({ name, value }));

  const statusCount = {
    confirmado: filtered.filter((a) => a.status === "confirmado").length,
    pendente: filtered.filter((a) => a.status === "pendente").length,
    concluido: filtered.filter((a) => a.status === "concluido").length,
    cancelado: filtered.filter((a) => a.status === "cancelado").length,
  };

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold">Relatórios</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="De" date={startDate} onSelect={setStartDate} />
          <DatePicker label="Até" date={endDate} onSelect={setEndDate} />
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Limpar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV(filtered, barberMap)}>
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF(filtered, barberMap, totalGeral, totalConcluidos, tenant?.name)}>
                Exportar PDF (Imprimir)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Faturamento Total</div><div className="text-2xl font-bold mt-1">{fmtCurrency(totalGeral)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Total Agendamentos</div><div className="text-2xl font-bold mt-1">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Ticket Médio</div><div className="text-2xl font-bold mt-1">{filtered.length ? fmtCurrency(totalGeral / filtered.length) : "R$ 0,00"}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Taxa de Conclusão</div><div className="text-2xl font-bold mt-1">{filtered.length ? Math.round((totalConcluidos / filtered.length) * 100) : 0}%</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke="hsl(210, 100%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento por Profissional</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barberData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Bar dataKey="value" fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Serviços Mais Procurados</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Agendamentos por Barbeiro</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barberData.map((b) => ({ name: b.name, value: filtered.filter((a) => (a.barbers?.name || barberMap[a.barber_id]) === b.name).length }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Agendamentos por Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusCount).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">{status === "concluido" ? "Concluído" : status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function DatePicker({ label, date, onSelect }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal min-w-[150px]", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
      </PopoverContent>
    </Popover>
  );
}

export default AdminRelatorios;
