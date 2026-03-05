import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, Unlock } from "lucide-react";

const AffiliateSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
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

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minhas Vendas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{sale.client_email}</TableCell>
                    <TableCell>{sale.client_name || "—"}</TableCell>
                    <TableCell>{sale.store_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={sale.payment_status === "paid" ? "default" : "secondary"}>
                        {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.access_released ? "default" : "outline"}>
                        {sale.access_released ? "Liberado" : "Bloqueado"}
                      </Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateSales;
