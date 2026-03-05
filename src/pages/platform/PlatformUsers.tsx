import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Eye, Pencil, Trash2 } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

interface UserWithRole {
  profile_id: string;
  auth_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  tenant_name: string | null;
  tenant_id: string | null;
  role: string;
  role_id: string;
}

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  barber: "secondary",
  client: "outline",
  affiliate: "outline",
};

const PlatformUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filtered, setFiltered] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    const [profilesRes, rolesRes, tenantsRes] = await Promise.all([
      supabase.from("profiles").select("id, auth_id, name, email, phone, tenant_id"),
      supabase.from("user_roles").select("id, user_id, role, tenant_id"),
      supabase.from("tenants").select("id, name"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const tenants = tenantsRes.data || [];
    const tenantMap = new Map(tenants.map((t: any) => [t.id, t.name]));

    const merged: UserWithRole[] = [];
    for (const p of profiles as any[]) {
      const userRoles = roles.filter((r: any) => r.user_id === p.auth_id);
      if (userRoles.length === 0) {
        merged.push({
          profile_id: p.id, auth_id: p.auth_id, name: p.name, email: p.email, phone: p.phone,
          tenant_name: p.tenant_id ? (tenantMap.get(p.tenant_id) || null) : null,
          tenant_id: p.tenant_id, role: "sem role", role_id: "",
        });
      } else {
        for (const r of userRoles) {
          merged.push({
            profile_id: p.id, auth_id: p.auth_id, name: p.name, email: p.email, phone: p.phone,
            tenant_name: r.tenant_id ? (tenantMap.get(r.tenant_id) || null) : (p.tenant_id ? tenantMap.get(p.tenant_id) || null : null),
            tenant_id: r.tenant_id || p.tenant_id, role: r.role, role_id: r.id,
          });
        }
      }
    }

    setUsers(merged);
    setFiltered(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.tenant_name || "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeRole = async (roleId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("id", roleId);
    if (error) { toast.error("Erro ao atualizar role"); return; }
    toast.success("Role atualizada");
    fetchUsers();
  };

  // --- Edit handlers ---
  const openEdit = (u: UserWithRole) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
    setEditRole(u.role);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: editName, email: editEmail, phone: editPhone })
      .eq("id", editUser.profile_id);
    if (profileError) { toast.error("Erro ao salvar perfil"); setSaving(false); return; }

    // Update role if changed and role exists
    if (editUser.role_id && editRole !== editUser.role) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: editRole as any })
        .eq("id", editUser.role_id);
      if (roleError) { toast.error("Erro ao atualizar role"); setSaving(false); return; }
    }

    toast.success("Usuário atualizado");
    setSaving(false);
    setEditOpen(false);
    fetchUsers();
  };

  // --- Delete handlers ---
  const openDelete = (u: UserWithRole) => {
    setDeleteUser(u);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);

    // If user has a tenant, deactivate it
    if (deleteUser.tenant_id) {
      await supabase.from("tenants").update({ active: false }).eq("id", deleteUser.tenant_id);
    }

    // Delete user roles
    if (deleteUser.auth_id) {
      await supabase.from("user_roles").delete().eq("user_id", deleteUser.auth_id);
    }

    // Delete profile
    const { error } = await supabase.from("profiles").delete().eq("id", deleteUser.profile_id);
    if (error) { toast.error("Erro ao excluir usuário"); setDeleting(false); return; }

    toast.success("Usuário removido com sucesso");
    setDeleting(false);
    setDeleteOpen(false);
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/super-admin/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Usuários da Plataforma ({filtered.length})</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, email, negócio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Negócio</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Alterar Role</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u, i) => (
                      <TableRow key={`${u.profile_id}-${u.role_id || i}`}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                        <TableCell>{u.phone || "—"}</TableCell>
                        <TableCell>{u.tenant_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={ROLE_COLORS[u.role] || "outline"}>{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.role_id ? (
                            <Select value={u.role} onValueChange={val => changeRole(u.role_id, val)}>
                              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="barber">barber</SelectItem>
                                <SelectItem value="admin">admin</SelectItem>
                                <SelectItem value="super_admin">super_admin</SelectItem>
                                <SelectItem value="affiliate">affiliate</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => navigate(`/super-admin/users/${u.profile_id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => openDelete(u)}>
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

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere as informações do usuário abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input id="edit-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            {editUser?.role_id && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barber">barber</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="super_admin">super_admin</SelectItem>
                    <SelectItem value="affiliate">affiliate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteUser?.name}</strong>?
              {deleteUser?.tenant_id && " A loja associada será desativada."}
              {" "}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformUsers;
