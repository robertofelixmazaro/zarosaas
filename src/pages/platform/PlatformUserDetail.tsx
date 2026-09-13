import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Mail, Phone, Store, Shield, Calendar, CreditCard, MessageCircle, FileText } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { formatCpfCnpj, formatPhone } from "@/lib/cpfValidator";

const na = (v: string | null | undefined) => v || "Não informado";

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Não informado";

const statusLabel: Record<string, string> = {
  active: "Ativa",
  trial: "Trial",
  canceled: "Cancelada",
  expired: "Expirada",
  past_due: "Inadimplente",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "active") return "default";
  if (s === "trial") return "secondary";
  if (["canceled", "expired", "past_due"].includes(s)) return "destructive";
  return "outline";
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  staff: "secondary",
  affiliate: "outline",
};

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
        const { data: t } = await supabase.from("tenants").select(TENANT_SAFE_COLUMNS).eq("id", p.tenant_id).maybeSingle();
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

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
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
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email || "Sem email"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5" /> Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Nome completo" value={na(profile.name)} icon={User} />
              <Separator />
              <InfoRow label="Email" value={na(profile.email)} icon={Mail} />
              <Separator />
              <InfoRow label="Telefone" value={profile.phone ? formatPhone(profile.phone) : "Não informado"} icon={Phone} />
              <Separator />
              <InfoRow label="WhatsApp" value={profile.whatsapp ? formatPhone(profile.whatsapp) : "Não informado"} icon={MessageCircle} />
              <Separator />
              <InfoRow label="CPF" value={profile.cpf ? formatCpfCnpj(profile.cpf) : "Não informado"} icon={FileText} />
              <Separator />
              <InfoRow label="Data de criação da conta" value={formatDate(profile.created_at)} icon={Calendar} />
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" /> Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Roles atribuídas</p>
                <div className="flex gap-2 flex-wrap">
                  {roles.length > 0 ? roles.map(r => (
                    <Badge key={r.id} variant={ROLE_COLORS[r.role] || "outline"}>{r.role}</Badge>
                  )) : <Badge variant="outline">sem role</Badge>}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Status da conta</p>
                <Badge variant="default" className="mt-1">Ativa</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">ID do perfil</p>
                <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{profile.id}</p>
              </div>
              {profile.auth_id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Auth ID</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{profile.auth_id}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Informações da Loja */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-5 w-5" /> Informações da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {tenant ? (
                <>
                  <InfoRow label="Nome da loja" value={tenant.name} icon={Store} />
                  <Separator />
                  <div className="flex items-start gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Slug da loja</p>
                      <p className="text-sm font-mono">zarosistemas.com.br/t/{tenant.slug}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Status da loja</p>
                      <Badge variant={tenant.active ? "default" : "destructive"} className="mt-1">
                        {tenant.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <InfoRow label="Nicho" value={na(tenant.niche)} />
                  <Separator />
                  <InfoRow label="Telefone da loja" value={tenant.phone ? formatPhone(tenant.phone) : "Não informado"} />
                  <Separator />
                  <InfoRow label="Endereço" value={na(tenant.address)} />
                  <Separator />
                  <InfoRow label="Criada em" value={formatDate(tenant.created_at)} />
                </>
              ) : (
                <p className="text-muted-foreground text-sm py-2">Nenhuma loja associada a este usuário.</p>
              )}
            </CardContent>
          </Card>

          {/* Plano e Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5" /> Plano & Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {plan ? (
                <>
                  <InfoRow label="Plano atual" value={plan.name} />
                  <Separator />
                  <InfoRow label="Preço do plano" value={`R$ ${Number(plan.price).toFixed(2)}`} />
                </>
              ) : (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground">Plano atual</p>
                  <p className="text-sm font-medium">Não informado</p>
                </div>
              )}
              <Separator />
              {subscription ? (
                <>
                  <div className="flex items-start gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Status da assinatura</p>
                      <Badge variant={statusVariant(subscription.status)} className="mt-1">
                        {statusLabel[subscription.status] || subscription.status}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  {subscription.trial_ends_at && (
                    <>
                      <InfoRow label="Data de início do trial" value={formatDate(subscription.current_period_start)} />
                      <Separator />
                      <InfoRow label="Data de fim do trial" value={formatDate(subscription.trial_ends_at)} />
                      <Separator />
                    </>
                  )}
                  <InfoRow label="Período atual - Início" value={formatDate(subscription.current_period_start)} />
                  <Separator />
                  <InfoRow label="Período atual - Vencimento" value={formatDate(subscription.current_period_end)} />
                  <Separator />
                  <InfoRow label="Método de pagamento" value={na(subscription.payment_method)} />
                </>
              ) : (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground">Status da assinatura</p>
                  <p className="text-sm font-medium">Não informado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PlatformUserDetail;
