import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}

const PlatformTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar negócios");
      return;
    }
    // tenants table may not have 'active' column yet, default to true
    setTenants((data || []).map((t: any) => ({ ...t, active: t.active ?? true })));
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
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
    fetchTenants();
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
