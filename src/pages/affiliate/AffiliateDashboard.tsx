import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, ShoppingCart, TrendingUp, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommission: 0,
    commissionPaid: 0,
    commissionPending: 0,
    clients: 0,
    referredStores: 0,
  });
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: aff } = await supabase
        .from("affiliates" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (aff) {
        setAffiliate(aff);
        const affId = (aff as any).id;

        const { data: sales } = await supabase
          .from("affiliate_sales" as any)
          .select("*")
          .eq("affiliate_id", affId);

        const allSales = (sales as any[]) || [];
        const paidSales = allSales.filter((s: any) => s.payment_status === "paid");
        const pendingSales = allSales.filter((s: any) => s.payment_status === "pending");

        // Count referred stores (consulta segura, sem colunas sensíveis)
        const { data: referredTenants } = await (supabase.rpc as any)("get_affiliate_referred_tenants");
        const storeCount = ((referredTenants as any[]) || []).length;

        // Get commissions
        const { data: commissions } = await supabase
          .from("affiliate_commissions" as any)
          .select("amount, status")
          .eq("affiliate_id", affId);

        const allCommissions = (commissions as any[]) || [];
        const totalCommission = allCommissions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
        const paidCommission = allCommissions.filter((c: any) => c.status === "pago").reduce((sum: number, c: any) => sum + Number(c.amount), 0);
        const pendingCommission = totalCommission - paidCommission;

        setStats({
          totalSales: allSales.length,
          totalCommission,
          commissionPaid: paidCommission,
          commissionPending: pendingCommission,
          clients: paidSales.length,
          referredStores: storeCount || 0,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const cards = [
    { title: "Lojas Indicadas", value: stats.referredStores, icon: ShoppingCart, color: "text-primary" },
    { title: "Comissão Total", value: `R$ ${stats.totalCommission.toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
    { title: "Comissão Paga", value: `R$ ${stats.commissionPaid.toFixed(2)}`, icon: TrendingUp, color: "text-blue-500" },
    { title: "Comissão Pendente", value: `R$ ${stats.commissionPending.toFixed(2)}`, icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard do Afiliado</h1>
      </div>

      {/* Referral Link Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-primary" />
            Seu Link de Indicação
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com seus clientes. Cada loja criada através dele será vinculada a você automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3">
            <span className="font-mono text-sm text-foreground break-all flex-1">
              https://zarosaas.lovable.app/ref/{(affiliate as any)?.ref_code || ""}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={async () => {
              const link = `https://zarosaas.lovable.app/ref/${(affiliate as any)?.ref_code || ""}`;
              try {
                await navigator.clipboard.writeText(link);
                toast.success("Link copiado! Compartilhe com seus clientes.");
              } catch {
                toast.error("Não foi possível copiar o link.");
              }
            }}
          >
            <Copy className="h-5 w-5" />
            Copiar meu link de indicação
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AffiliateDashboard;
