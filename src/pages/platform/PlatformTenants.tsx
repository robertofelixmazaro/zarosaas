import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, Trash2, CreditCard, CheckCircle } from "lucide-react";
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
  logo_url: string | null;
}

interface Plan {
  id: string;
  name: string;
  active: boolean;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

const PlatformTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", phone: "", address: "", active: true });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Plan activation state
  const [planOpen, setPlanOpen] = useState(false);
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);
  const [planForm, setPlanForm] = useState({ plan_id: "", status: "active", expiration_date: "", payment_method: "online" });
  const [planSaving, setPlanSaving] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const fetchData = async () => {
    const [tenantsRes, plansRes, subsRes] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name, active").eq("active", true).order("price", { ascending: true }),
      supabase.from("subscriptions" as any).select("*"),
    ]);

    if (tenantsRes.error) {
      toast.error("Erro ao carregar negócios");
      return;
    }
    setTenants((tenantsRes.data || []).map((t: any) => ({ ...t, active: t.active ?? true })));
    setPlans(plansRes.data || []);

    // Map subscriptions by tenant_id
    const subsMap: Record<string, Subscription> = {};
    ((subsRes.data as any) || []).forEach((s: any) => {
      subsMap[s.tenant_id] = s;
    });
    setSubscriptions(subsMap);
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

  // Edit handlers
  const openEdit = (t: Tenant) => {
    setEditTenant(t);
    setEditForm({ name: t.name, slug: t.slug, phone: t.phone || "", address: t.address || "", active: t.active });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTenant) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        name: editForm.name,
        slug: editForm.slug,
        phone: editForm.phone || null,
        address: editForm.address || null,
        active: editForm.active,
      } as any)
      .eq("id", editTenant.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
      return;
    }
    toast.success("Negócio atualizado com sucesso");
    setEditOpen(false);
    fetchData();
  };

  // Delete handlers
  const openDelete = (t: Tenant) => {
    setDeleteTenant(t);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTenant) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-tenant", {
        body: { tenant_id: deleteTenant.id },
      });
      if (res.error) {
        toast.error("Erro ao excluir negócio");
      } else {
        toast.success(`"${deleteTenant.name}" foi excluído permanentemente`);
        fetchData();
      }
    } catch {
      toast.error("Erro ao excluir negócio");
    }
    setDeleting(false);
    setDeleteOpen(false);
  };

  // Plan activation handlers
  const openPlanDialog = (t: Tenant) => {
    setPlanTenant(t);
    const sub = subscriptions[t.id];
    const defaultExpiration = new Date();
    defaultExpiration.setMonth(defaultExpiration.getMonth() + 1);
    setPlanForm({
      plan_id: sub?.plan_id || t.plan_id || "",
      status: sub?.status || "active",
      expiration_date: sub?.current_period_end
        ? new Date(sub.current_period_end).toISOString().split("T")[0]
        : defaultExpiration.toISOString().split("T")[0],
      payment_method: (sub as any)?.payment_method || "online",
    });
    setPlanOpen(true);
  };

  const confirmManualPayment = async () => {
    if (!planTenant) return;
    setConfirmingPayment(true);
    try {
      const sub = subscriptions[planTenant.id];
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (sub) {
        await supabase
          .from("subscriptions" as any)
          .update({
            status: "active",
            payment_method: "manual",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_ends_at: null,
          } as any)
          .eq("id", sub.id);
      } else {
        await supabase
          .from("subscriptions" as any)
          .insert({
            tenant_id: planTenant.id,
            plan_id: planForm.plan_id || planTenant.plan_id,
            status: "active",
            payment_method: "manual",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          } as any);
      }

      // Record payment
      await supabase
        .from("payments" as any)
        .insert({
          tenant_id: planTenant.id,
          plan_id: planForm.plan_id || planTenant.plan_id || sub?.plan_id,
          amount: 0,
          status: "approved",
          payment_method: "manual",
          transaction_id: `manual-${Date.now()}`,
        } as any);

      toast.success("Pagamento confirmado! Plano renovado por 30 dias.");
      setPlanOpen(false);
      fetchData();
    } catch {
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setConfirmingPayment(false);
    }
  };

  const savePlan = async () => {
    if (!planTenant || !planForm.plan_id) return;
    setPlanSaving(true);

    const sub = subscriptions[planTenant.id];
    const periodEnd = planForm.expiration_date
      ? new Date(planForm.expiration_date + "T23:59:59Z").toISOString()
      : null;

    if (sub) {
      // Update existing subscription
      const { error } = await supabase
        .from("subscriptions" as any)
        .update({
          plan_id: planForm.plan_id,
          status: planForm.status,
          current_period_end: periodEnd,
          current_period_start: sub.current_period_start || new Date().toISOString(),
        } as any)
        .eq("id", sub.id);
      if (error) {
        toast.error("Erro ao atualizar assinatura");
        setPlanSaving(false);
        return;
      }
    } else {
      // Create new subscription
      const { error } = await supabase
        .from("subscriptions" as any)
        .insert({
          tenant_id: planTenant.id,
          plan_id: planForm.plan_id,
          status: planForm.status,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
        } as any);
      if (error) {
        toast.error("Erro ao criar assinatura");
        setPlanSaving(false);
        return;
      }
    }

    // Also update tenant plan_id and active status
    await supabase
      .from("tenants")
      .update({
        plan_id: planForm.plan_id,
        active: planForm.status === "active" || planForm.status === "trial",
      } as any)
      .eq("id", planTenant.id);

    toast.success("Plano atualizado com sucesso");
    setPlanSaving(false);
    setPlanOpen(false);
    fetchData();
  };

  const getSubscriptionBadge = (tenantId: string) => {
    const sub = subscriptions[tenantId];
    if (!sub) return <Badge variant="outline">Sem assinatura</Badge>;
    
    const isExpired = sub.current_period_end && new Date(sub.current_period_end) < new Date();
    
    if (isExpired || sub.status === "expired" || sub.status === "cancelled") {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (sub.status === "trial") {
      return <Badge variant="secondary">Trial</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const getExpirationText = (tenantId: string) => {
    const sub = subscriptions[tenantId];
    if (!sub?.current_period_end) return "—";
    return format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/dashboard">
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
                      <TableHead>Plano</TableHead>
                      <TableHead>Status Assinatura</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">{t.slug}.zarosistemas.com.br</TableCell>
                        <TableCell>
                          {plans.find(p => p.id === (subscriptions[t.id]?.plan_id || t.plan_id))?.name || "Sem plano"}
                        </TableCell>
                        <TableCell>{getSubscriptionBadge(t.id)}</TableCell>
                        <TableCell>{getExpirationText(t.id)}</TableCell>
                        <TableCell>
                          <Badge variant={t.active ? "default" : "destructive"}>
                            {t.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Gerenciar plano"
                              onClick={() => openPlanDialog(t)}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Visualizar" asChild>
                              <a href={getTenantExternalUrl(t.slug)} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(t)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Excluir"
                              onClick={() => openDelete(t)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Plan Management Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Plano — {planTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Plano</Label>
              <Select value={planForm.plan_id} onValueChange={(v) => setPlanForm({ ...planForm, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status da Assinatura</Label>
              <Select value={planForm.status} onValueChange={(v) => setPlanForm({ ...planForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data de Expiração</Label>
              <Input
                type="date"
                value={planForm.expiration_date}
                onChange={(e) => setPlanForm({ ...planForm, expiration_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={planSaving || !planForm.plan_id}>
              {planSaving ? "Salvando..." : "Salvar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Negócio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input id="edit-slug" value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={editForm.active ? "active" : "inactive"} onValueChange={(v) => setEditForm({ ...editForm, active: v === "active" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving || !editForm.name || !editForm.slug}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este negócio?</AlertDialogTitle>
            <AlertDialogDescription>
              O negócio <strong>"{deleteTenant?.name}"</strong> e todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformTenants;
