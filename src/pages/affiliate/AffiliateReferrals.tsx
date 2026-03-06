import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AffiliateReferrals = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get affiliate record
      const { data: aff } = await supabase
        .from("affiliates" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!aff) {
        setLoading(false);
        return;
      }

      // Get tenants referred by this affiliate
      const { data: tenants } = await supabase
        .from("tenants" as any)
        .select("id, name, slug, active, created_at, plan_id")
        .eq("referred_by_affiliate_id", (aff as any).id)
        .order("created_at", { ascending: false });

      if (tenants) {
        // Get plan names for each tenant
        const planIds = [...new Set((tenants as any[]).map((t: any) => t.plan_id).filter(Boolean))];
        let plansMap: Record<string, string> = {};

        if (planIds.length > 0) {
          const { data: plans } = await supabase
            .from("plans")
            .select("id, name")
            .in("id", planIds);
          if (plans) {
            plansMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));
          }
        }

        setReferrals(
          (tenants as any[]).map((t: any) => ({
            ...t,
            plan_name: t.plan_id ? plansMap[t.plan_id] || "—" : "Sem plano",
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minhas Indicações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Lojas indicadas</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma loja indicada ainda. Compartilhe seu link de indicação!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((ref: any) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.name}</TableCell>
                    <TableCell>{ref.plan_name}</TableCell>
                    <TableCell>
                      <Badge variant={ref.active ? "default" : "secondary"}>
                        {ref.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(ref.created_at).toLocaleDateString("pt-BR")}
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

export default AffiliateReferrals;
