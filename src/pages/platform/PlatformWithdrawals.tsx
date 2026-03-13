import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Clock, CheckCircle, Eye, Check, XCircle } from "lucide-react";
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
  affiliate_name?: string;
  affiliate_email?: string;
}

const PlatformWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "pago" | "recusado" } | null>(null);

  const loadData = async () => {
    // Fetch withdrawals
    const { data: wds } = await supabase
      .from("affiliate_withdrawals" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!wds) { setLoading(false); return; }

    // Fetch affiliate names
    const affiliateIds = [...new Set((wds as any[]).map((w: any) => w.affiliate_id))];
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
    if (confirmAction.action === "pago") updates.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from("affiliate_withdrawals" as any)
      .update(updates)
      .eq("id", confirmAction.id);

    if (error) {
      toast.error("Erro ao atualizar saque.");
    } else {
      toast.success(confirmAction.action === "pago" ? "Saque marcado como pago!" : "Saque recusado.");
      // If paid, update the related commissions to "pago" status
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
      case "pago": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Pago</Badge>;
      case "recusado": return <Badge variant="destructive">Recusado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPending = withdrawals.filter((w) => w.status === "pendente").reduce((s, w) => s + Number(w.amount), 0);
  const totalPaid = withdrawals.filter((w) => w.status === "pago").reduce((s, w) => s + Number(w.amount), 0);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
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

      <Card>
        <CardContent className="pt-6">
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação de saque.</p>
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
                {withdrawals.map((w) => (
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
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => setConfirmAction({ id: w.id, action: "pago" })}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmAction({ id: w.id, action: "recusado" })}>
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
            <DialogDescription>Informações da solicitação de saque.</DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Afiliado</span><span className="font-medium">{selectedWithdrawal.affiliate_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{selectedWithdrawal.affiliate_email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-bold">R$ {Number(selectedWithdrawal.amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo PIX</span><span>{selectedWithdrawal.pix_type?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chave PIX</span><span className="font-mono text-sm">{selectedWithdrawal.pix_key}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{statusBadge(selectedWithdrawal.status)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{selectedWithdrawal.created_at ? format(new Date(selectedWithdrawal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</span></div>
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
            <AlertDialogTitle>{confirmAction?.action === "pago" ? "Confirmar Pagamento" : "Recusar Saque"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "pago"
                ? "Tem certeza que deseja marcar este saque como pago?"
                : "Tem certeza que deseja recusar esta solicitação de saque?"}
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
