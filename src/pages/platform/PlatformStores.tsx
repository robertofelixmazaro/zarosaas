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
import { ArrowLeft, Eye, Pencil, Trash2, Plus, Store, Power, PowerOff } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { format } from "date-fns";
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

const PlatformStores = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchStores = async () => {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lojas");
      setLoading(false);
      return;
    }

    const storeList = (tenants || []) as any[];

    // Fetch owner profiles for display
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
  }, []);

  // Toggle active status
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

      if (error) {
        toast.error("Erro ao criar loja");
        setCreating(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setCreating(false);
        return;
      }

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
      .update({
        name: editForm.name,
        slug: editForm.slug,
        phone: editForm.phone || null,
        address: editForm.address || null,
      } as any)
      .eq("id", editStore.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
      return;
    }
    toast.success("Loja atualizada com sucesso");
    setEditOpen(false);
    fetchStores();
  };

  // Delete
  const openDelete = (s: StoreRow) => {
    setDeleteStore(s);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteStore) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("delete-tenant", {
        body: { tenant_id: deleteStore.id },
      });
      if (res.error) {
        toast.error("Erro ao excluir loja");
      } else if (res.data?.fallback) {
        toast.warning(res.data.message || "Loja desativada como alternativa");
        fetchStores();
      } else {
        toast.success("Loja removida com sucesso");
        fetchStores();
      }
    } catch {
      toast.error("Erro ao excluir loja");
    }
    setDeleting(false);
    setDeleteOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/super-admin/dashboard">
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
            <Plus className="h-4 w-4 mr-2" />
            Criar nova loja
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
                              <a href={`/t/${s.slug}`} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button size="icon" variant="ghost" title="Editar loja" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={s.active ? "Suspender loja" : "Ativar loja"}
                              onClick={() => toggleStatus(s)}
                            >
                              {s.active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
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
          <DialogHeader>
            <DialogTitle>Criar Nova Loja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="create-store-name">Nome da loja *</Label>
              <Input id="create-store-name" value={createForm.store_name} onChange={(e) => setCreateForm({ ...createForm, store_name: e.target.value })} placeholder="Ex: Barbearia Elite" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-owner-name">Nome do proprietário</Label>
              <Input id="create-owner-name" value={createForm.owner_name} onChange={(e) => setCreateForm({ ...createForm, owner_name: e.target.value })} placeholder="Ex: João Silva" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-owner-email">Email do proprietário *</Label>
              <Input id="create-owner-email" type="email" value={createForm.owner_email} onChange={(e) => setCreateForm({ ...createForm, owner_email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-owner-password">Senha inicial *</Label>
              <Input id="create-owner-password" type="text" value={createForm.owner_password} onChange={(e) => setCreateForm({ ...createForm, owner_password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar Loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
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
            <AlertDialogTitle>Excluir loja permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A loja <strong>"{deleteStore?.name}"</strong> e todos os seus dados (serviços, agendamentos, clientes, produtos, galeria e avaliações) serão removidos permanentemente. Esta ação não pode ser desfeita.
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
