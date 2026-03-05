import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Users, Eye, Pencil, Trash2, PowerOff, Power, Copy } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface AffiliateRow {
  id: string;
  user_id: string;
  ref_code: string;
  commission_percent: number;
  created_at: string | null;
  name: string;
  email: string;
  total_sales: number;
  total_commissions: number;
}

const PlatformAffiliates = () => {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", commission_percent: "10" });
  const [creating, setCreating] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAffiliate, setDeleteAffiliate] = useState<AffiliateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<AffiliateRow | null>(null);
  const [editForm, setEditForm] = useState({ commission_percent: "10" });
  const [saving, setSaving] = useState(false);

  const fetchAffiliates = async () => {
    const { data: affs, error } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar afiliados");
      setLoading(false);
      return;
    }

    const affList = (affs || []) as any[];
    const userIds = affList.map((a) => a.user_id);

    // Get profiles
    let profileMap: Record<string, { name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("auth_id, name, email")
        .in("auth_id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          if (p.auth_id) profileMap[p.auth_id] = { name: p.name, email: p.email || "" };
        });
      }
    }

    // Get sales stats
    const affIds = affList.map((a) => a.id);
    let salesMap: Record<string, { count: number; commissions: number }> = {};
    if (affIds.length > 0) {
      const { data: sales } = await supabase
        .from("affiliate_sales")
        .select("affiliate_id, amount, commission_amount")
        .in("affiliate_id", affIds);
      if (sales) {
        sales.forEach((s: any) => {
          if (!salesMap[s.affiliate_id]) salesMap[s.affiliate_id] = { count: 0, commissions: 0 };
          salesMap[s.affiliate_id].count++;
          salesMap[s.affiliate_id].commissions += Number(s.commission_amount || 0);
        });
      }
    }

    setAffiliates(
      affList.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        ref_code: a.ref_code,
        commission_percent: a.commission_percent,
        created_at: a.created_at,
        name: profileMap[a.user_id]?.name || "—",
        email: profileMap[a.user_id]?.email || "—",
        total_sales: salesMap[a.id]?.count || 0,
        total_commissions: salesMap[a.id]?.commissions || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-affiliate", {
        body: {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          commission_percent: Number(createForm.commission_percent) || 10,
        },
      });

      if (error) {
        toast.error("Erro ao criar afiliado");
        setCreating(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setCreating(false);
        return;
      }

      toast.success(`Afiliado criado! Código: ${data.affiliate.ref_code}`);
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", commission_percent: "10" });
      fetchAffiliates();
    } catch {
      toast.error("Erro ao criar afiliado");
    }
    setCreating(false);
  };

  const handleEdit = async () => {
    if (!editAffiliate) return;
    setSaving(true);
    const { error } = await supabase
      .from("affiliates")
      .update({ commission_percent: Number(editForm.commission_percent) || 10 } as any)
      .eq("id", editAffiliate.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Afiliado atualizado");
    setEditOpen(false);
    fetchAffiliates();
  };

  const confirmDelete = async () => {
    if (!deleteAffiliate) return;
    setDeleting(true);
    // Delete affiliate record (cascade will handle commissions/sales)
    const { error } = await supabase
      .from("affiliates")
      .delete()
      .eq("id", deleteAffiliate.id);
    if (error) {
      toast.error("Erro ao excluir afiliado");
    } else {
      toast.success("Afiliado excluído");
      fetchAffiliates();
    }
    setDeleting(false);
    setDeleteOpen(false);
  };

  const copyRefLink = (refCode: string) => {
    navigator.clipboard.writeText(`https://zarosaas.lovable.app/comprar?ref=${refCode}`);
    toast.success("Link copiado!");
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
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Gerenciar Afiliados</h2>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar afiliado
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todos os Afiliados ({affiliates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : affiliates.length === 0 ? (
              <p className="text-muted-foreground">Nenhum afiliado cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Total Comissões</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{a.ref_code}</code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyRefLink(a.ref_code)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{a.commission_percent}%</TableCell>
                        <TableCell>{a.total_sales}</TableCell>
                        <TableCell>R$ {a.total_commissions.toFixed(2)}</TableCell>
                        <TableCell>
                          {a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" title="Editar" onClick={() => {
                              setEditAffiliate(a);
                              setEditForm({ commission_percent: String(a.commission_percent) });
                              setEditOpen(true);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir" onClick={() => {
                              setDeleteAffiliate(a);
                              setDeleteOpen(true);
                            }}>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Afiliado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nome do afiliado" />
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label>Senha *</Label>
              <Input type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="grid gap-2">
              <Label>Comissão (%)</Label>
              <Input type="number" min="0" max="100" value={createForm.commission_percent} onChange={(e) => setCreateForm({ ...createForm, commission_percent: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar Afiliado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Afiliado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Comissão (%)</Label>
              <Input type="number" min="0" max="100" value={editForm.commission_percent} onChange={(e) => setEditForm({ commission_percent: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir afiliado?</AlertDialogTitle>
            <AlertDialogDescription>
              O afiliado <strong>"{deleteAffiliate?.name}"</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformAffiliates;
