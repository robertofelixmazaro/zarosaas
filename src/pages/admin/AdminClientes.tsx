import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Phone, Mail, Calendar } from "lucide-react";

const AdminClientes = () => {
  const { tenantId } = useTenant();
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["admin-clients", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: appointmentCounts = {} } = useQuery({
    queryKey: ["client-appointment-counts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("client_phone")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((a) => {
        counts[a.client_phone] = (counts[a.client_phone] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenantId,
  });

  const filtered = clients.filter((c: any) =>
    [c.name, c.phone, c.email].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Clientes</h2>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes</h2>
        <span className="text-sm text-muted-foreground">{clients.length} clientes</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((client: any) => (
            <div key={client.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {client.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {client.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {appointmentCounts[client.phone] || 0} agendamentos
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desde {new Date(client.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClientes;
