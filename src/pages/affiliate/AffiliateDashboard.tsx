import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react";

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalSales: 0, totalCommission: 0, clients: 0, pending: 0 });
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
        const { data: sales } = await supabase
          .from("affiliate_sales" as any)
          .select("*")
          .eq("affiliate_id", (aff as any).id);

        const allSales = (sales as any[]) || [];
        setStats({
          totalSales: allSales.length,
          totalCommission: allSales.filter((s: any) => s.payment_status === "paid").length * 50, // placeholder
          clients: allSales.filter((s: any) => s.access_released).length,
          pending: allSales.filter((s: any) => s.payment_status === "pending").length,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const cards = [
    { title: "Total de Vendas", value: stats.totalSales, icon: ShoppingCart, color: "text-primary" },
    { title: "Comissões", value: `R$ ${stats.totalCommission}`, icon: DollarSign, color: "text-green-500" },
    { title: "Clientes Ativos", value: stats.clients, icon: Users, color: "text-blue-500" },
    { title: "Pagamentos Pendentes", value: stats.pending, icon: TrendingUp, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard do Afiliado</h1>
        <p className="text-sm text-muted-foreground">
          Seu código de referência: <span className="font-mono font-semibold text-primary">{(affiliate as any)?.ref_code || "—"}</span>
        </p>
      </div>

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
