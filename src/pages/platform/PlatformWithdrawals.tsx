import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Clock, CheckCircle, Eye, Check, XCircle, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface WithdrawalRow {
  id: string;
  affiliate_id: string;
  amount: number;
  pix_key: string;
  pix_type: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  processed_at: string | null;
  ip_address: string | null;
  affiliate_name?: string;
  affiliate_email?: string;
}

const PlatformWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "pago" | "recusado" | "em_processamento" } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const loadData = async () => {
    const { data: wds } = await supabase
      .from("affiliate_withdrawals" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!wds) { setLoading(false); return; }

    const affiliateIds = [...new Set((wds as any[]).map((w: any) => w.affiliate_id))];
    if (affiliateIds.length === 0) {
      setWithdrawals([]);
      setLoading(false);
      return;
    }

    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("id, user_id")
      .in("id", affiliateIds);

    const userIds = (affiliates || []).map((a) => a.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("auth_id, name, email")
      .in("auth_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.auth_id, p]));
    const affMap = new Map((affiliates || []).map((a) => [a.id, a]));

    const enriched = (wds as any[]).map((w: any) => {
      const aff = affMap.get(w.affiliate_id);
      const profile = aff ? profileMap.get(aff.user_id) : null;
      return {
        ...w,
        affiliate_name: profile?.name || "—",
        affiliate_email: profile?.email || "",
      };
    });

    setWithdrawals(enriched);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async () => {
    if (!confirmAction) return;
    const updates: any = { status: confirmAction.action };
    if (confirmAction.action === "pago") {
      updates.paid_at = new Date().toISOString();
      updates.processed_at = new Date().toISOString();
    }
    if (confirmAction.action === "recusado") {
      updates.processed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("affiliate_withdrawals" as any)
      .update(updates)
      .eq("id", confirmAction.id);

    if (error) {
      toast.error("Erro ao atualizar saque.");
    } else {
      const labels: Record<string, string> = {
        pago: "Saque marcado como pago!",
        recusado: "Saque recusado.",
        em_processamento: "Saque movido para processamento.",
      };
      toast.success(labels[confirmAction.action]);

      if (confirmAction.action === "pago") {
        const wd = withdrawals.find((w) => w.id === confirmAction.id);
        if (wd) {
          await supabase
            .from("affiliate_commissions")
            .update({ status: "pago" } as any)
            .eq("affiliate_id", wd.affiliate_id)
            .eq("status", "disponivel");
        }
      }
      loadData();
    }
    setConfirmAction(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30">Pendente</Badge>;
      case "em_processamento": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">Em Processamento</Badge>;
      case "pago": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Concluído</Badge>;
      case "recusado": return <Badge variant="destructive">Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = withdrawals.filter((w) => {
    if (filterStatus !== "all" && w.status !== filterStatus) return false;
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      return w.affiliate_name?.toLowerCase().includes(s) || w.affiliate_email?.toLowerCase().includes(s) || w.pix_key?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalPending = withdrawals.filter((w) => w.status === "pendente" || w.status === "em_processamento").reduce((s, w) => s + Number(w.amount), 0);
  const totalPaid = withdrawals.filter((w) => w.status === "pago").reduce((s, w) => s + Number(w.amount), 0);

  if (loading) return <div className="p-6 text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  const actionLabel = (action: string) => {
    switch (action) {
      case "pago": return "Confirmar Pagamento";
      case "recusado": return "Recusar Saque";
      case "em_processamento": return "Iniciar Processamento";
      default: return "Confirmar";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Saques de Afiliados</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Saques</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{withdrawals.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes / Em Processamento</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">R$ {totalPaid.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou chave PIX..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_processamento">Em Processamento</SelectItem>
            <SelectItem value="pago">Concluído</SelectItem>
            <SelectItem value="recusado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação de saque encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.affiliate_name}</TableCell>
                    <TableCell>R$ {Number(w.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.pix_key}</TableCell>
                    <TableCell className="text-sm">{w.created_at ? format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                    <TableCell>{statusBadge(w.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedWithdrawal(w); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {w.status === "pendente" && (
                          <>
                            <Button size="icon" variant="ghost" className="text-blue-600" title="Em processamento" onClick={() => setConfirmAction({ id: w.id, action: "em_processamento" })}>
                              <Loader2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-green-600" title="Marcar como pago" onClick={() => setConfirmAction({ id: w.id, action: "pago" })}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" title="Recusar" onClick={() => setConfirmAction({ id: w.id, action: "recusado" })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {w.status === "em_processamento" && (
                          <>
                            <Button size="icon" variant="ghost" className="text-green-600" title="Marcar como pago" onClick={() => setConfirmAction({ id: w.id, action: "pago" })}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" title="Recusar" onClick={() => setConfirmAction({ id: w.id, action: "recusado" })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Saque</DialogTitle>
            <DialogDescription>Informações completas da solicitação.</DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Afiliado</span><span className="font-medium">{selectedWithdrawal.affiliate_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{selectedWithdrawal.affiliate_email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-bold">R$ {Number(selectedWithdrawal.amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo PIX</span><span>{selectedWithdrawal.pix_type?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chave PIX</span><span className="font-mono text-sm">{selectedWithdrawal.pix_key}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(selectedWithdrawal.status)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Solicitado em</span><span>{selectedWithdrawal.created_at ? format(new Date(selectedWithdrawal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</span></div>
              {selectedWithdrawal.ip_address && (
                <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-sm">{selectedWithdrawal.ip_address}</span></div>
              )}
              {selectedWithdrawal.processed_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Processado em</span><span>{format(new Date(selectedWithdrawal.processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></div>
              )}
              {selectedWithdrawal.paid_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Pago em</span><span>{format(new Date(selectedWithdrawal.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? actionLabel(confirmAction.action) : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "pago"
                ? "Tem certeza que deseja marcar este saque como pago? As comissões disponíveis serão atualizadas."
                : confirmAction?.action === "recusado"
                ? "Tem certeza que deseja recusar esta solicitação? O saldo será devolvido ao afiliado."
                : "Deseja mover este saque para processamento?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformWithdrawals;
