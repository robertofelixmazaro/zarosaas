import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, DollarSign, TrendingUp, Trash2 } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  created_at: string;
  plans?: { name: string };
  tenants?: { name: string; slug: string };
}

const PlatformPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payments" as any)
      .select("*, plans(name), tenants(name, slug)")
      .order("created_at", { ascending: false });
    if (data) setPayments(data as any);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("payments" as any)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Pagamento excluído com sucesso");
      setDeleteTarget(null);
      loadPayments();
    } catch {
      toast.error("Erro ao excluir pagamento");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = payments.filter((p) => {
    const matchSearch = !search || (p as any).tenants?.name?.toLowerCase().includes(search.toLowerCase()) || (p as any).plans?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = payments.filter(p => p.status === "approved").reduce((sum, p) => sum + Number(p.amount), 0);
  const monthPayments = payments.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === "approved";
  });
  const monthRevenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-600 text-white">Aprovado</Badge>;
      case "pending": return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      case "failed": return <Badge variant="destructive">Falhou</Badge>;
      case "refunded": return <Badge variant="secondary">Reembolsado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/superadmin/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /> R$ {totalRevenue.toFixed(2)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita do Mês</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> R$ {monthRevenue.toFixed(2)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Pagamentos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-5 w-5" /> {payments.length}</p></CardContent>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Buscar por tenant ou plano..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{(p as any).tenants?.name || "—"}</TableCell>
                    <TableCell>{(p as any).plans?.name || "—"}</TableCell>
                    <TableCell>R$ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{p.payment_method}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.transaction_id || "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Pagamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este pagamento? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Tenant:</strong> {(deleteTarget as any).tenants?.name || "—"}</p>
              <p><strong>Valor:</strong> R$ {Number(deleteTarget.amount).toFixed(2)}</p>
              <p><strong>Status:</strong> {deleteTarget.status}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformPayments;
