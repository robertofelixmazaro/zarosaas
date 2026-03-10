import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Store, Shield, Calendar, CreditCard } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";

const PlatformUserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(p);

      if (p?.auth_id) {
        const { data: r } = await supabase.from("user_roles").select("*").eq("user_id", p.auth_id);
        setRoles(r || []);
      }

      if (p?.tenant_id) {
        const { data: t } = await supabase.from("tenants").select("*").eq("id", p.tenant_id).maybeSingle();
        setTenant(t);

        const { data: sub } = await supabase.from("subscriptions").select("*, plans(*)").eq("tenant_id", p.tenant_id).maybeSingle();
        if (sub) {
          setSubscription(sub);
          setPlan((sub as any).plans);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    super_admin: "destructive",
    admin: "default",
    barber: "secondary",
    client: "outline",
    affiliate: "outline",
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/usuarios"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
      </PlatformHeader>
      <main className="p-6 max-w-4xl mx-auto"><p className="text-muted-foreground">Carregando...</p></main>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/usuarios"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
      </PlatformHeader>
      <main className="p-6 max-w-4xl mx-auto"><p className="text-muted-foreground">Usuário não encontrado.</p></main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/usuarios">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Informações Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><span className="text-sm text-muted-foreground">Nome</span><p className="font-medium">{profile.name}</p></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{profile.email || "—"}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{profile.phone || "—"}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Criado em: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR") : "—"}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Permissões</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Roles</span>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {roles.length > 0 ? roles.map(r => (
                    <Badge key={r.id} variant={ROLE_COLORS[r.role] || "outline"}>{r.role}</Badge>
                  )) : <Badge variant="outline">sem role</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Loja Associada</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tenant ? (
                <>
                  <div><span className="text-sm text-muted-foreground">Nome</span><p className="font-medium">{tenant.name}</p></div>
                  <div><span className="text-sm text-muted-foreground">Slug</span><p className="text-sm font-mono">{tenant.slug}.zarosistemas.com.br</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><Badge variant={tenant.active ? "default" : "destructive"}>{tenant.active ? "Ativa" : "Inativa"}</Badge></div>
                </>
              ) : <p className="text-muted-foreground">Nenhuma loja associada</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Plano & Assinatura</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {plan ? (
                <>
                  <div><span className="text-sm text-muted-foreground">Plano</span><p className="font-medium">{plan.name}</p></div>
                  <div><span className="text-sm text-muted-foreground">Preço</span><p>R$ {Number(plan.price).toFixed(2)}</p></div>
                </>
              ) : <p className="text-muted-foreground">Sem plano</p>}
              {subscription ? (
                <div><span className="text-sm text-muted-foreground">Status da Assinatura</span>
                  <Badge variant={subscription.status === "active" ? "default" : "destructive"} className="mt-1">{subscription.status}</Badge>
                </div>
              ) : <p className="text-muted-foreground text-sm">Sem assinatura</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PlatformUserDetail;
