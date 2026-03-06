import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";

interface ClientRecord {
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
}

const StaffClientes = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: barber } = await supabase
        .from("barbers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!barber) {
        setLoading(false);
        return;
      }

      const { data: appts } = await supabase
        .from("appointments")
        .select("client_name, client_phone, appointment_date")
        .eq("barber_id", barber.id)
        .order("appointment_date", { ascending: false });

      const map = new Map<string, ClientRecord>();
      (appts || []).forEach((a: any) => {
        const key = a.client_phone;
        if (!map.has(key)) {
          map.set(key, {
            name: a.client_name,
            phone: a.client_phone,
            visits: 1,
            lastVisit: a.appointment_date,
          });
        } else {
          const existing = map.get(key)!;
          existing.visits += 1;
        }
      });

      setClients(Array.from(map.values()));
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Clientes</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">{clients.length} clientes</span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">Nenhum cliente encontrado.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((client, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{client.visits} {client.visits === 1 ? "visita" : "visitas"}</p>
                    <p className="text-xs text-muted-foreground">Última: {client.lastVisit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffClientes;
