import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, DollarSign, Users, UserX, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface AffiliateCommission {
  affiliate_id: string;
  ref_code: string;
  commission_percent: number;
  active_clients: number;
  cancelled_clients: number;
  monthly_commission: number;
  clients: {
    tenant_id: string;
    tenant_name: string;
    status: string;
    plan: string;
    commission: number;
  }[];
}

interface Alert {
  affiliate_name: string;
  affiliate_id: string;
  tenant_name: string;
  tenant_id: string;
  status: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  past_due: { label: "Inadimplente", variant: "destructive" },
  expired: { label: "Expirado", variant: "destructive" },
  no_subscription: { label: "Sem assinatura", variant: "outline" },
  trialing: { label: "Trial", variant: "secondary" },
};

const PlatformCommissions = () => {
  const [data, setData] = useState<AffiliateCommission[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [affiliateNames, setAffiliateNames] = useState<Record<string, string>>({});
  const [expandedAffiliate, setExpandedAffiliate] = useState<string | null>(null);

  const fetchCommissions = async () => {
    setRecalculating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("recalculate-commissions");
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setData(result.results || []);
      setAlerts(result.alerts || []);

      // Fetch affiliate names from profiles
      const affIds = (result.results || []).map((r: any) => r.affiliate_id);
      if (affIds.length > 0) {
        const { data: affs } = await supabase
          .from("affiliates")
          .select("id, user_id")
          .in("id", affIds);
        if (affs?.length) {
          const userIds = affs.map((a) => a.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("auth_id, name")
            .in("auth_id", userIds);
          const nameMap: Record<string, string> = {};
          affs.forEach((a) => {
            const profile = profiles?.find((p) => p.auth_id === a.user_id);
            nameMap[a.id] = profile?.name || a.user_id;
          });
          setAffiliateNames(nameMap);
        }
      }
    } catch (err) {
      toast.error("Erro ao calcular comissões");
      console.error(err);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const totalMonthly = data.reduce((sum, a) => sum + a.monthly_commission, 0);
  const totalActive = data.reduce((sum, a) => sum + a.active_clients, 0);
  const totalCancelled = data.reduce((sum, a) => sum + a.cancelled_clients, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comissões de Afiliados</h2>
          <p className="text-muted-foreground text-sm">Comissões calculadas com base em assinaturas ativas.</p>
        </div>
        <Button onClick={fetchCommissions} disabled={recalculating} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Comissão Mensal Total</p>
                <p className="text-xl font-bold">R$ {totalMonthly.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Users className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                <p className="text-xl font-bold">{totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes Cancelados</p>
                <p className="text-xl font-bold">{totalCancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Afiliados Ativos</p>
                <p className="text-xl font-bold">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Inadimplência ({alerts.length})
            </CardTitle>
            <CardDescription>Clientes indicados por afiliados que pararam de pagar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="text-sm font-medium">{alert.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Indicado por: <span className="font-medium">{affiliateNames[alert.affiliate_id] || alert.affiliate_name}</span>
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {statusLabels[alert.status]?.label || alert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Painel de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Calculando comissões...</p>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground">Nenhum afiliado com clientes indicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Clientes Ativos</TableHead>
                    <TableHead>Cancelados</TableHead>
                    <TableHead>Comissão Mensal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((a) => (
                    <>
                      <TableRow
                        key={a.affiliate_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedAffiliate(expandedAffiliate === a.affiliate_id ? null : a.affiliate_id)}
                      >
                        <TableCell className="font-medium">
                          {affiliateNames[a.affiliate_id] || "—"}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{a.ref_code}</code>
                        </TableCell>
                        <TableCell>{a.commission_percent}%</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">{a.active_clients}</span>
                        </TableCell>
                        <TableCell>
                          <span className={a.cancelled_clients > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {a.cancelled_clients}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {a.monthly_commission.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.active_clients > 0 ? "default" : "secondary"}>
                            {a.active_clients > 0 ? "Ativo" : "Sem comissão"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expandedAffiliate === a.affiliate_id && a.clients.length > 0 && (
                        <TableRow key={`${a.affiliate_id}-detail`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Clientes indicados</p>
                              <div className="space-y-1">
                                {a.clients.map((c) => {
                                  const st = statusLabels[c.status] || { label: c.status, variant: "outline" as const };
                                  return (
                                    <div key={c.tenant_id} className="flex items-center justify-between py-1.5 px-2 rounded text-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium">{c.tenant_name}</span>
                                        <span className="text-xs text-muted-foreground">{c.plan}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={c.commission > 0 ? "font-medium" : "text-muted-foreground"}>
                                          R$ {c.commission.toFixed(2)}
                                        </span>
                                        <Badge variant={st.variant} className="text-xs">
                                          {st.label}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformCommissions;
