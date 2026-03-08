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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Pencil, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { validateCpf } from "@/lib/cpfValidator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AffiliateRow {
  id: string;
  user_id: string;
  ref_code: string;
  commission_percent: number;
  created_at: string | null;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  cpf: string;
  pix_type: string;
  pix_key: string;
  total_sales: number;
  total_commissions: number;
}

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "Email" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const defaultCreateForm = {
  name: "", email: "", password: "", commission_percent: "10",
  phone: "", whatsapp: "", cpf: "", pix_type: "", pix_key: "",
};

const PlatformAffiliates = () => {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...defaultCreateForm });
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAffiliate, setDeleteAffiliate] = useState<AffiliateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<AffiliateRow | null>(null);
  const [editForm, setEditForm] = useState({ commission_percent: "10", phone: "", whatsapp: "", cpf: "", pix_type: "", pix_key: "" });
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
        phone: a.phone || "",
        whatsapp: a.whatsapp || "",
        cpf: a.cpf || "",
        pix_type: a.pix_type || "",
        pix_key: a.pix_key || "",
        total_sales: salesMap[a.id]?.count || 0,
        total_commissions: salesMap[a.id]?.commissions || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.name.trim()) errors.name = "Nome é obrigatório";
    if (!createForm.email.trim()) errors.email = "Email é obrigatório";
    if (!createForm.password.trim()) errors.password = "Senha é obrigatória";
    else if (createForm.password.length < 6) errors.password = "Mínimo 6 caracteres";
    if (!createForm.phone.trim()) errors.phone = "Telefone é obrigatório";
    if (!createForm.whatsapp.trim()) errors.whatsapp = "WhatsApp é obrigatório";

    const cpfDigits = createForm.cpf.replace(/\D/g, "");
    if (!cpfDigits) {
      errors.cpf = "CPF é obrigatório";
    } else if (!validateCpf(cpfDigits)) {
      errors.cpf = "CPF inválido";
    }

    if (createForm.pix_type && createForm.pix_key) {
      if (createForm.pix_type === "cpf") {
        const pixCpf = createForm.pix_key.replace(/\D/g, "");
        if (pixCpf !== cpfDigits) {
          errors.pix_key = "A chave PIX deve estar vinculada ao mesmo CPF do afiliado.";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreateForm()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-affiliate", {
        body: {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          commission_percent: Number(createForm.commission_percent) || 10,
          phone: createForm.phone.replace(/\D/g, ""),
          whatsapp: createForm.whatsapp.replace(/\D/g, ""),
          cpf: createForm.cpf.replace(/\D/g, ""),
          pix_type: createForm.pix_type,
          pix_key: createForm.pix_key,
        },
      });

      if (error) { toast.error("Erro ao criar afiliado"); setCreating(false); return; }
      if (data?.error) { toast.error(data.error); setCreating(false); return; }

      toast.success(`Afiliado criado! Código: ${data.affiliate.ref_code}`);
      setCreateOpen(false);
      setCreateForm({ ...defaultCreateForm });
      setFormErrors({});
      fetchAffiliates();
    } catch {
      toast.error("Erro ao criar afiliado");
    }
    setCreating(false);
  };

  const handleEdit = async () => {
    if (!editAffiliate) return;
    setSaving(true);

    const updateData: Record<string, unknown> = {
      commission_percent: Number(editForm.commission_percent) || 10,
    };
    if (editForm.phone) updateData.phone = editForm.phone.replace(/\D/g, "");
    if (editForm.whatsapp) updateData.whatsapp = editForm.whatsapp.replace(/\D/g, "");
    if (editForm.cpf) updateData.cpf = editForm.cpf.replace(/\D/g, "");
    if (editForm.pix_type) updateData.pix_type = editForm.pix_type;
    if (editForm.pix_key) updateData.pix_key = editForm.pix_key;

    // Validate PIX CPF match
    if (editForm.pix_type === "cpf" && editForm.pix_key) {
      const pixCpf = editForm.pix_key.replace(/\D/g, "");
      const affCpf = editForm.cpf.replace(/\D/g, "");
      if (pixCpf !== affCpf) {
        toast.error("A chave PIX deve estar vinculada ao mesmo CPF do afiliado.");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("affiliates")
      .update(updateData as any)
      .eq("id", editAffiliate.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Afiliado atualizado");
    setEditOpen(false);
    fetchAffiliates();
  };

  const confirmDelete = async () => {
    if (!deleteAffiliate) return;
    setDeleting(true);
    const { error } = await supabase.from("affiliates").delete().eq("id", deleteAffiliate.id);
    if (error) { toast.error("Erro ao excluir afiliado"); }
    else { toast.success("Afiliado excluído"); fetchAffiliates(); }
    setDeleting(false);
    setDeleteOpen(false);
  };

  const copyRefLink = (refCode: string) => {
    navigator.clipboard.writeText(`https://zarosaas.lovable.app/comprar?ref=${refCode}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
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
                    <TableHead>CPF</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>PIX</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.email}</TableCell>
                      <TableCell className="text-xs">{a.cpf ? formatCPF(a.cpf) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{a.ref_code}</code>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyRefLink(a.ref_code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{a.commission_percent}%</TableCell>
                      <TableCell className="text-xs">
                        {a.pix_type ? (
                          <span>{PIX_TYPES.find(p => p.value === a.pix_type)?.label || a.pix_type}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{a.total_sales}</TableCell>
                      <TableCell>R$ {a.total_commissions.toFixed(2)}</TableCell>
                      <TableCell>
                        {a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="Editar" onClick={() => {
                            setEditAffiliate(a);
                            setEditForm({
                              commission_percent: String(a.commission_percent),
                              phone: a.phone ? formatPhone(a.phone) : "",
                              whatsapp: a.whatsapp ? formatPhone(a.whatsapp) : "",
                              cpf: a.cpf ? formatCPF(a.cpf) : "",
                              pix_type: a.pix_type || "",
                              pix_key: a.pix_key || "",
                            });
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setFormErrors({}); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Criar Afiliado</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] px-6">
            <div className="grid gap-4 py-4">
              {/* Dados pessoais */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Pessoais</h4>
                <Separator />
              </div>
              <div className="grid gap-2">
                <Label>Nome completo *</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nome do afiliado" />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@exemplo.com" />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Senha *</Label>
                <Input type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                  {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>WhatsApp *</Label>
                  <Input
                    value={createForm.whatsapp}
                    onChange={(e) => setCreateForm({ ...createForm, whatsapp: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                  {formErrors.whatsapp && <p className="text-xs text-destructive">{formErrors.whatsapp}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>CPF *</Label>
                  <Input
                    value={createForm.cpf}
                    onChange={(e) => setCreateForm({ ...createForm, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                  {formErrors.cpf && <p className="text-xs text-destructive">{formErrors.cpf}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Comissão (%)</Label>
                  <Input type="number" min="0" max="100" value={createForm.commission_percent} onChange={(e) => setCreateForm({ ...createForm, commission_percent: e.target.value })} />
                </div>
              </div>

              {/* Dados de pagamento */}
              <div className="space-y-1 pt-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados de Pagamento</h4>
                <Separator />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de chave PIX</Label>
                <Select value={createForm.pix_type} onValueChange={(v) => setCreateForm({ ...createForm, pix_type: v, pix_key: v === "cpf" ? createForm.cpf : "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Chave PIX</Label>
                <Input
                  value={createForm.pix_key}
                  onChange={(e) => setCreateForm({ ...createForm, pix_key: e.target.value })}
                  placeholder={createForm.pix_type === "cpf" ? "000.000.000-00" : "Digite a chave PIX"}
                  disabled={createForm.pix_type === "cpf"}
                />
                {formErrors.pix_key && <p className="text-xs text-destructive">{formErrors.pix_key}</p>}
                {createForm.pix_type === "cpf" && (
                  <p className="text-xs text-muted-foreground">A chave PIX será automaticamente o CPF informado acima.</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar Afiliado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Editar Afiliado</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] px-6">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Comissão (%)</Label>
                <Input type="number" min="0" max="100" value={editForm.commission_percent} onChange={(e) => setEditForm({ ...editForm, commission_percent: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                </div>
                <div className="grid gap-2">
                  <Label>WhatsApp</Label>
                  <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>CPF</Label>
                <Input value={editForm.cpf} onChange={(e) => setEditForm({ ...editForm, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label>Tipo de chave PIX</Label>
                <Select value={editForm.pix_type} onValueChange={(v) => setEditForm({ ...editForm, pix_type: v, pix_key: v === "cpf" ? editForm.cpf : editForm.pix_key })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Chave PIX</Label>
                <Input
                  value={editForm.pix_key}
                  onChange={(e) => setEditForm({ ...editForm, pix_key: e.target.value })}
                  disabled={editForm.pix_type === "cpf"}
                />
                {editForm.pix_type === "cpf" && (
                  <p className="text-xs text-muted-foreground">A chave PIX será automaticamente o CPF.</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-0">
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
