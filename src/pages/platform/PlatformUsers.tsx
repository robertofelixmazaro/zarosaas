import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

interface UserWithRole {
  profile_id: string;
  auth_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  tenant_name: string | null;
  role: string;
  role_id: string;
}

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  barber: "secondary",
  client: "outline",
};

const PlatformUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filtered, setFiltered] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    // Fetch profiles, roles, and tenants
    const [profilesRes, rolesRes, tenantsRes] = await Promise.all([
      supabase.from("profiles").select("id, auth_id, name, email, phone, tenant_id"),
      supabase.from("user_roles" as any).select("id, user_id, role, tenant_id"),
      supabase.from("tenants").select("id, name"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = (rolesRes.data || []) as any[];
    const tenants = tenantsRes.data || [];
    const tenantMap = new Map(tenants.map((t: any) => [t.id, t.name]));

    const merged: UserWithRole[] = [];
    for (const p of profiles as any[]) {
      const userRoles = roles.filter((r: any) => r.user_id === p.auth_id);
      if (userRoles.length === 0) {
        merged.push({
          profile_id: p.id,
          auth_id: p.auth_id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          tenant_name: p.tenant_id ? (tenantMap.get(p.tenant_id) || null) : null,
          role: "sem role",
          role_id: "",
        });
      } else {
        for (const r of userRoles) {
          merged.push({
            profile_id: p.id,
            auth_id: p.auth_id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            tenant_name: r.tenant_id ? (tenantMap.get(r.tenant_id) || null) : (p.tenant_id ? tenantMap.get(p.tenant_id) || null : null),
            role: r.role,
            role_id: r.id,
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
  }, [search, users]);

  const changeRole = async (roleId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles" as any)
      .update({ role: newRole } as any)
      .eq("id", roleId);
    if (error) { toast.error("Erro ao atualizar role"); return; }
    toast.success("Role atualizada");
    fetchUsers();
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
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Usuários da Plataforma ({filtered.length})</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, negócio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
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
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">client</SelectItem>
                                <SelectItem value="barber">barber</SelectItem>
                                <SelectItem value="admin">admin</SelectItem>
                                <SelectItem value="super_admin">super_admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
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
    </div>
  );
};

export default PlatformUsers;
