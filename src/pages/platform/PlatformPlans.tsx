import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Package } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  max_barbers: number;
  max_services: number;
  max_appointments_month: number;
  max_products: number;
  max_clients: number;
  features: string[];
  active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  price: 0,
  max_barbers: 5,
  max_services: 10,
  max_clients: 100,
  max_appointments_month: 500,
  max_products: 50,
  features: "",
  active: true,
};

const PlatformPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("plans" as any)
      .select("*")
      .order("price", { ascending: true });
    if (error) { toast.error("Erro ao carregar planos"); return; }
    setPlans((data || []).map((p: any) => ({ ...p, features: p.features || [], max_clients: p.max_clients ?? 100 })));
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      max_barbers: plan.max_barbers,
      max_services: plan.max_services || 10,
      max_clients: plan.max_clients || 100,
      max_appointments_month: plan.max_appointments_month,
      max_products: plan.max_products,
      features: (plan.features || []).join(", "),
      active: plan.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    const featuresArray = form.features.split(",").map(f => f.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: form.price,
      max_barbers: form.max_barbers,
      max_services: form.max_services,
      max_clients: form.max_clients,
      max_appointments_month: form.max_appointments_month,
      max_products: form.max_products,
      features: featuresArray,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase.from("plans" as any).update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("plans" as any).insert(payload);
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Plano criado");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPlans();
  };

  const confirmDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeleting(true);
    const { error } = await supabase.from("plans" as any).delete().eq("id", deletePlanId);
    setDeleting(false);
    if (error) { toast.error("Erro ao excluir. O plano pode estar em uso."); return; }
    toast.success("Plano excluído");
    setDeleteOpen(false);
    fetchPlans();
  };

  const formatLimit = (val: number, threshold = 999) => val >= threshold ? "∞" : String(val);

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
            <Package className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Gerenciar Planos</h2>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Plano</Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : plans.length === 0 ? (
              <p className="text-muted-foreground">Nenhum plano cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Profissionais</TableHead>
                      <TableHead>Serviços</TableHead>
                      <TableHead>Clientes</TableHead>
                      <TableHead>Agend./mês</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{plan.name}</span>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">R$ {plan.price.toFixed(2)}</TableCell>
                        <TableCell>{formatLimit(plan.max_barbers)}</TableCell>
                        <TableCell>{formatLimit(plan.max_services)}</TableCell>
                        <TableCell>{formatLimit(plan.max_clients)}</TableCell>
                        <TableCell>{formatLimit(plan.max_appointments_month, 99999)}</TableCell>
                        <TableCell>{formatLimit(plan.max_products)}</TableCell>
                        <TableCell>
                          <Badge variant={plan.active ? "default" : "destructive"}>
                            {plan.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(plan)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => { setDeletePlanId(plan.id); setDeleteOpen(true); }}
                              title="Excluir"
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

        {/* Features preview */}
        {plans.filter(p => p.active && p.features.length > 0).length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.filter(p => p.active).map(plan => (
              <Card key={plan.id}>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-2xl font-bold text-primary mb-3">R$ {plan.price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                  {plan.features.length > 0 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-primary">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Nome do plano *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Profissional" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do plano" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Preço (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Profissionais</Label>
                <Input type="number" min={1} value={form.max_barbers} onChange={e => setForm({ ...form, max_barbers: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Serviços</Label>
                <Input type="number" min={1} value={form.max_services} onChange={e => setForm({ ...form, max_services: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Clientes</Label>
                <Input type="number" min={1} value={form.max_clients} onChange={e => setForm({ ...form, max_clients: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Agendamentos/mês</Label>
                <Input type="number" min={1} value={form.max_appointments_month} onChange={e => setForm({ ...form, max_appointments_month: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Produtos</Label>
                <Input type="number" min={1} value={form.max_products} onChange={e => setForm({ ...form, max_products: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Funcionalidades incluídas</Label>
              <Textarea
                value={form.features}
                onChange={e => setForm({ ...form, features: e.target.value })}
                placeholder="Agendamento online, Relatórios, QR Code, Lembretes WhatsApp"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Separe as funcionalidades por vírgula</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Plano ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Este plano será removido permanentemente. Lojas associadas a ele podem perder o acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePlan}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformPlans;
