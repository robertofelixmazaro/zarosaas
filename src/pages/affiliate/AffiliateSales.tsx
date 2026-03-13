import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, Unlock, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AffiliateSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [plans, setPlans] = useState<Record<string, string>>({});
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSales = async () => {
    if (!user) return;
    const { data: aff } = await supabase
      .from("affiliates" as any)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (aff) {
      setAffiliateId((aff as any).id);
      const { data } = await supabase
        .from("affiliate_sales" as any)
        .select("*")
        .eq("affiliate_id", (aff as any).id)
        .order("created_at", { ascending: false });
      setSales((data as any[]) || []);
    }

    // Load plans for name mapping
    const { data: plansData } = await supabase.from("plans").select("id, name");
    if (plansData) {
      const map: Record<string, string> = {};
      plansData.forEach((p: any) => { map[p.id] = p.name; });
      setPlans(map);
    }

    setLoading(false);
  };

  useEffect(() => { loadSales(); }, [user]);

  const confirmPayment = async (saleId: string) => {
    setActionLoading(saleId);
    const { error } = await supabase
      .from("affiliate_sales" as any)
      .update({ payment_status: "paid" })
      .eq("id", saleId);

    if (error) {
      toast.error("Erro ao confirmar pagamento");
    } else {
      toast.success("Pagamento confirmado!");
      loadSales();
    }
    setActionLoading(null);
  };

  const releaseAccess = async (sale: any) => {
    setActionLoading(sale.id);
    try {
      const { data, error } = await supabase.functions.invoke("release-client-access", {
        body: {
          sale_id: sale.id,
          client_email: sale.client_email,
          client_name: sale.client_name || sale.client_email,
          store_name: sale.store_name || "Minha Loja",
        },
      });
      if (error) throw error;
      toast.success("Acesso liberado com sucesso!");
      loadSales();
    } catch (err: any) {
      toast.error("Erro ao liberar acesso: " + err.message);
    }
    setActionLoading(null);
  };

  const totalSales = sales.length;
  const totalRevenue = sales.filter(s => s.payment_status === "paid").reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
  const totalCommission = sales.filter(s => s.payment_status === "paid").reduce((sum: number, s: any) => sum + Number(s.commission_amount || 0), 0);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minhas Vendas</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Receita Gerada</p>
                <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total</p>
                <p className="text-2xl font-bold">R$ {totalCommission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.client_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{sale.client_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sale.store_name || "—"}</TableCell>
                      <TableCell>{sale.plan_id ? (plans[sale.plan_id] || "—") : "—"}</TableCell>
                      <TableCell className="font-mono">R$ {Number(sale.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-green-600">R$ {Number(sale.commission_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={sale.payment_status === "paid" ? "default" : "secondary"}>
                          {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.created_at ? format(new Date(sale.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {sale.payment_status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmPayment(sale.id)}
                            disabled={actionLoading === sale.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        )}
                        {sale.payment_status === "paid" && !sale.access_released && (
                          <Button
                            size="sm"
                            onClick={() => releaseAccess(sale)}
                            disabled={actionLoading === sale.id}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Liberar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
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

export default AffiliateSales;
