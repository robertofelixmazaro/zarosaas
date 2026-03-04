import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  created_at: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  plan_id: string | null;
}

interface Plan {
  id: string;
  name: string;
  active: boolean;
}

const PlatformTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [tenantsRes, plansRes] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name, active").eq("active", true).order("price", { ascending: true }),
    ]);

    if (tenantsRes.error) {
      toast.error("Erro ao carregar negócios");
      return;
    }
    setTenants((tenantsRes.data || []).map((t: any) => ({ ...t, active: t.active ?? true })));
    setPlans(plansRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleTenant = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("tenants")
      .update({ active: !currentActive } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(currentActive ? "Negócio desativado" : "Negócio ativado");
    fetchData();
  };

  const assignPlan = async (tenantId: string, planId: string) => {
    const value = planId === "none" ? null : planId;
    const { error } = await supabase
      .from("tenants")
      .update({ plan_id: value } as any)
      .eq("id", tenantId);
    if (error) {
      toast.error("Erro ao atribuir plano");
      return;
    }
    toast.success("Plano atualizado");
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, plan_id: value } : t)));
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/admin-platform">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Todos os Negócios ({tenants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : tenants.length === 0 ? (
              <p className="text-muted-foreground">Nenhum negócio cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">/t/{t.slug}</TableCell>
                        <TableCell>{t.phone || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={t.plan_id || "none"}
                            onValueChange={(val) => assignPlan(t.id, val)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Sem plano" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem plano</SelectItem>
                              {plans.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.active ? "default" : "destructive"}>
                            {t.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={t.active ? "destructive" : "default"}
                            onClick={() => toggleTenant(t.id, t.active)}
                          >
                            {t.active ? "Desativar" : "Ativar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PlatformTenants;
