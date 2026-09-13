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
import { ArrowLeft, Eye, Pencil, Trash2, Plus, Store, Power, PowerOff, CreditCard } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface StoreRow {
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
  owner_name?: string;
  owner_email?: string;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
}

interface SubscriptionData {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  payment_method: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

const PlatformStores = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  // Create store
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ store_name: "", owner_name: "", owner_email: "", owner_password: "" });
  const [creating, setCreating] = useState(false);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editStore, setEditStore] = useState<StoreRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStore, setDeleteStore] = useState<StoreRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Subscription management
  const [subOpen, setSubOpen] = useState(false);
  const [subStore, setSubStore] = useState<StoreRow | null>(null);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm] = useState({
    plan_id: "",
    status: "active",
    payment_method: "online",
    period_days: "30",
    custom_end_date: "",
  });
  const [subSaving, setSubSaving] = useState(false);

  const fetchPlans = async () => {
    const { data } = await supabase.from("plans" as any).select("id, name, price").eq("active", true).order("price");
    setPlans((data as any[]) || []);
  };

  const fetchStores = async () => {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select(TENANT_SAFE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lojas");
      setLoading(false);
      return;
    }

    const storeList = (tenants || []) as any[];

    const ownerIds = storeList.map((s) => s.owner_user_id).filter(Boolean);
    let profileMap: Record<string, { name: string; email: string }> = {};

    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("auth_id, name, email")
        .in("auth_id", ownerIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          if (p.auth_id) profileMap[p.auth_id] = { name: p.name, email: p.email || "" };
        });
      }
    }

    setStores(
      storeList.map((s) => ({
        ...s,
        active: s.active ?? true,
        owner_name: s.owner_user_id ? profileMap[s.owner_user_id]?.name || "—" : "—",
        owner_email: s.owner_user_id ? profileMap[s.owner_user_id]?.email || "—" : "—",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
    fetchPlans();
  }, []);

  const toggleStatus = async (store: StoreRow) => {
    const { error } = await supabase
      .from("tenants")
      .update({ active: !store.active } as any)
      .eq("id", store.id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(store.active ? "Loja suspensa" : "Loja ativada");
    fetchStores();
  };

  // Create store
  const handleCreate = async () => {
    if (!createForm.store_name.trim() || !createForm.owner_email.trim() || !createForm.owner_password.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (createForm.owner_password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-store", {
        body: {
          store_name: createForm.store_name,
          owner_name: createForm.owner_name,
          owner_email: createForm.owner_email,
          owner_password: createForm.owner_password,
        },
      });

      if (error) { toast.error("Erro ao criar loja"); setCreating(false); return; }
      if (data?.error) { toast.error(data.error); setCreating(false); return; }

      toast.success(`Loja "${createForm.store_name}" criada com sucesso!`);
      setCreateOpen(false);
      setCreateForm({ store_name: "", owner_name: "", owner_email: "", owner_password: "" });
      fetchStores();
    } catch {
      toast.error("Erro ao criar loja");
    }
    setCreating(false);
  };

  // Edit
  const openEdit = (s: StoreRow) => {
    setEditStore(s);
    setEditForm({ name: s.name, slug: s.slug, phone: s.phone || "", address: s.address || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editStore) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name: editForm.name, slug: editForm.slug, phone: editForm.phone || null, address: editForm.address || null } as any)
      .eq("id", editStore.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar alterações"); return; }
    toast.success("Loja atualizada com sucesso");
    setEditOpen(false);
    fetchStores();
  };

  // Delete
  const openDelete = (s: StoreRow) => { setDeleteStore(s); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!deleteStore) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-tenant", { body: { tenant_id: deleteStore.id } });
      if (res.error) { toast.error("Erro ao excluir loja"); }
      else if (res.data?.fallback) { toast.warning(res.data.message || "Loja desativada como alternativa"); fetchStores(); }
      else { toast.success("Loja removida com sucesso"); fetchStores(); }
    } catch { toast.error("Erro ao excluir loja"); }
    setDeleting(false);
    setDeleteOpen(false);
  };

  // Subscription management
  const openSubscription = async (store: StoreRow) => {
    setSubStore(store);
    setSubLoading(true);
    setSubOpen(true);

    const { data: sub } = await supabase
      .from("subscriptions" as any)
      .select("*")
      .eq("tenant_id", store.id)
      .maybeSingle();

    const subscription = sub as any;

    if (subscription) {
      setSubData(subscription);
      setSubForm({
        plan_id: subscription.plan_id || "",
        status: subscription.status || "active",
        payment_method: subscription.payment_method || "online",
        period_days: "30",
        custom_end_date: subscription.current_period_end
          ? format(new Date(subscription.current_period_end), "yyyy-MM-dd")
          : "",
      });
    } else {
      setSubData(null);
      setSubForm({
        plan_id: store.plan_id || "",
        status: "active",
        payment_method: "online",
        period_days: "30",
        custom_end_date: "",
      });
    }
    setSubLoading(false);
  };

  const saveSubscription = async () => {
    if (!subStore) return;
    setSubSaving(true);

    const now = new Date();
    let periodEnd: string;

    if (subForm.custom_end_date) {
      periodEnd = new Date(subForm.custom_end_date + "T23:59:59").toISOString();
    } else {
      periodEnd = addDays(now, parseInt(subForm.period_days)).toISOString();
    }

    const payload = {
      tenant_id: subStore.id,
      plan_id: subForm.plan_id,
      status: subForm.status,
      payment_method: subForm.payment_method,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd,
    };

    if (subData) {
      // Update existing subscription
      const { error } = await supabase
        .from("subscriptions" as any)
        .update(payload as any)
        .eq("id", subData.id);
      if (error) { toast.error("Erro ao atualizar assinatura"); setSubSaving(false); return; }
      toast.success("Assinatura atualizada");
    } else {
      // Create new subscription
      const { error } = await supabase
        .from("subscriptions" as any)
        .insert(payload as any);
      if (error) { toast.error("Erro ao criar assinatura"); setSubSaving(false); return; }
      toast.success("Assinatura criada");
    }

    // Also update tenant plan_id
    await supabase.from("tenants").update({ plan_id: subForm.plan_id } as any).eq("id", subStore.id);

    setSubSaving(false);
    setSubOpen(false);
    fetchStores();
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Gerenciar Lojas</h2>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar nova loja
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Lojas ({stores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : stores.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.owner_name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.owner_email}</TableCell>
                        <TableCell>
                          {s.created_at ? format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.active ? "default" : "destructive"}>
                            {s.active ? "Ativa" : "Suspensa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" title="Ver loja" asChild>
                              <a href={getTenantExternalUrl(s.slug)} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button size="icon" variant="ghost" title="Editar loja" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Gerenciar Assinatura" onClick={() => openSubscription(s)}>
                              <CreditCard className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              title={s.active ? "Suspender loja" : "Ativar loja"}
                              onClick={() => toggleStatus(s)}
                            >
                              {s.active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Excluir loja"
                              onClick={() => openDelete(s)}
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

      {/* Create Store Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Criar Nova Loja</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome da loja *</Label>
              <Input value={createForm.store_name} onChange={(e) => setCreateForm({ ...createForm, store_name: e.target.value })} placeholder="Ex: Barbearia Elite" />
            </div>
            <div className="grid gap-2">
              <Label>Nome do proprietário</Label>
              <Input value={createForm.owner_name} onChange={(e) => setCreateForm({ ...createForm, owner_name: e.target.value })} placeholder="Ex: João Silva" />
            </div>
            <div className="grid gap-2">
              <Label>Email do proprietário *</Label>
              <Input type="email" value={createForm.owner_email} onChange={(e) => setCreateForm({ ...createForm, owner_email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label>Senha inicial *</Label>
              <Input type="text" value={createForm.owner_password} onChange={(e) => setCreateForm({ ...createForm, owner_password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "Criando..." : "Criar Loja"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Loja</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Endereço</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
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

      {/* Subscription Management Dialog */}
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Gerenciar Assinatura — {subStore?.name}
            </DialogTitle>
          </DialogHeader>

          {subLoading ? (
            <p className="text-muted-foreground py-4">Carregando...</p>
          ) : (
            <div className="space-y-4 py-2">
              {subData && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status atual:</span>
                    <Badge variant={subData.status === "active" ? "default" : "destructive"}>{subData.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forma de pagamento:</span>
                    <span className="font-medium">{subData.payment_method === "manual" ? "Manual" : "Online"}</span>
                  </div>
                  {subData.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expira em:</span>
                      <span className="font-medium">{format(new Date(subData.current_period_end), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label>Plano</Label>
                <Select value={subForm.plan_id} onValueChange={(v) => setSubForm({ ...subForm, plan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status da assinatura</Label>
                <Select value={subForm.status} onValueChange={(v) => setSubForm({ ...subForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Forma de pagamento</Label>
                <Select value={subForm.payment_method} onValueChange={(v) => setSubForm({ ...subForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online (Mercado Pago)</SelectItem>
                    <SelectItem value="manual">Manual (Pix / Dinheiro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {subForm.payment_method === "manual" && (
                <>
                  <div className="grid gap-2">
                    <Label>Período da assinatura</Label>
                    <Select value={subForm.period_days} onValueChange={(v) => setSubForm({ ...subForm, period_days: v, custom_end_date: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                        <SelectItem value="180">180 dias</SelectItem>
                        <SelectItem value="365">365 dias</SelectItem>
                        <SelectItem value="custom">Data personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {subForm.period_days === "custom" && (
                    <div className="grid gap-2">
                      <Label>Data de expiração</Label>
                      <Input
                        type="date"
                        value={subForm.custom_end_date}
                        onChange={(e) => setSubForm({ ...subForm, custom_end_date: e.target.value })}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveSubscription}
              disabled={subSaving || !subForm.plan_id || (subForm.period_days === "custom" && !subForm.custom_end_date)}
            >
              {subSaving ? "Salvando..." : subData ? "Atualizar Assinatura" : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A loja <strong>"{deleteStore?.name}"</strong> e todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
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

export default PlatformStores;
