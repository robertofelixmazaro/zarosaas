import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Eye, Pencil, Trash2 } from "lucide-react";
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

const PlatformTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
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
      const { data: { session } } = await supabase.auth.getSession();
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
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Visualizar página pública"
                              asChild
                            >
                              <a href={`/t/${t.slug}`} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Editar negócio"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Excluir negócio"
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
              O negócio <strong>"{deleteTenant?.name}"</strong> e todos os seus dados (serviços, agendamentos, clientes, produtos, galeria e avaliações) serão removidos permanentemente. Esta ação não pode ser desfeita.
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
