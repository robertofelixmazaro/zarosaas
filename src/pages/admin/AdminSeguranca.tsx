import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Monitor, Globe, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoginEntry {
  id: string;
  ip_address: string | null;
  device: string | null;
  browser: string | null;
  created_at: string | null;
}

const AdminSeguranca = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("login_history")
      .select("id, ip_address, device, browser, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setHistory((data as LoginEntry[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Segurança</h1>
      </div>
      <p className="text-muted-foreground text-sm">Histórico dos seus últimos acessos à plataforma.</p>

      {loading ? (
        <div className="text-muted-foreground py-8 text-center">Carregando...</div>
      ) : history.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">Nenhum acesso registrado ainda.</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground"><Clock className="inline h-4 w-4 mr-1" />Data</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground"><Monitor className="inline h-4 w-4 mr-1" />Dispositivo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Navegador</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground"><Globe className="inline h-4 w-4 mr-1" />IP</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {entry.created_at
                        ? format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{entry.device || "Desconhecido"}</td>
                    <td className="px-4 py-3">{entry.browser || "Desconhecido"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSeguranca;
