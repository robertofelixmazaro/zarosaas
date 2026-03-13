import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Clock, CheckCircle, AlertTriangle, Wallet, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const AffiliatePayments = () => {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableBalance = commissions
    .filter((c) => c.status === "disponivel")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === "pendente")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalReceived = commissions
    .filter((c) => c.status === "pago")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!aff) { setLoading(false); return; }
      setAffiliate(aff);

      const { data: comms } = await supabase
        .from("affiliate_commissions")
        .select("*, affiliate_sales(client_name, store_name, amount, plan_id, created_at)")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false });

      setCommissions(comms || []);

      const { data: wds } = await supabase
        .from("affiliate_withdrawals" as any)
        .select("*")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false });

      setWithdrawals((wds as any[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const hasTodayWithdrawal = withdrawals.some((w: any) => {
    const today = new Date().toISOString().slice(0, 10);
    return w.created_at?.slice(0, 10) === today && w.status !== "recusado";
  });

  const getBrasiliaDate = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc - 3 * 3600000);
  };

  const isWithdrawalAllowed = () => {
    const brasilia = getBrasiliaDate();
    const day = brasilia.getDay(); // 0=Sun, 6=Sat
    const hour = brasilia.getHours();
    if (day === 0 || day === 6) return false;
    if (hour < 9 || hour >= 17) return false;
    return true;
  };

  const handleWithdraw = async () => {
    if (!affiliate) return;
    if (!isWithdrawalAllowed()) {
      toast.error("Saque disponível apenas de segunda a sexta-feira, das 09:00 às 17:00.");
      return;
    }
    const val = parseFloat(withdrawAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (val > availableBalance) {
      toast.error("Valor acima do saldo disponível.");
      return;
    }
    if (hasTodayWithdrawal) {
      toast.error("Você já realizou uma solicitação de saque hoje. Aguarde até amanhã.");
      return;
    }
    if (!affiliate.pix_key) {
      toast.error("Cadastre sua chave PIX no perfil antes de solicitar saque.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("affiliate_withdrawals" as any).insert({
      affiliate_id: affiliate.id,
      amount: val,
      pix_key: affiliate.pix_key,
      pix_type: affiliate.pix_type || "cpf",
      status: "pendente",
    } as any);

    if (error) {
      toast.error("Erro ao solicitar saque.");
    } else {
      toast.success("Solicitação de saque enviada com sucesso!");
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      // Reload withdrawals
      const { data: wds } = await supabase
        .from("affiliate_withdrawals" as any)
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });
      setWithdrawals((wds as any[]) || []);
    }
    setSubmitting(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30">Pendente</Badge>;
      case "disponivel": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Disponível</Badge>;
      case "pago": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">Pago</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const withdrawalStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30">Pendente</Badge>;
      case "pago": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Pago</Badge>;
      case "recusado": return <Badge variant="destructive">Recusado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const cards = [
    { title: "Saldo Disponível", value: `R$ ${availableBalance.toFixed(2)}`, icon: Wallet, color: "text-green-500" },
    { title: "Comissões Pendentes", value: `R$ ${pendingCommissions.toFixed(2)}`, icon: Clock, color: "text-orange-500" },
    { title: "Total Recebido", value: `R$ ${totalReceived.toFixed(2)}`, icon: CheckCircle, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => setWithdrawModalOpen(true)}
          disabled={availableBalance <= 0}
        >
          <DollarSign className="h-5 w-5" />
          Solicitar Saque
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules Notice */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="space-y-1">
          <p>Os saques são processados manualmente e pagos via PIX em até 48 horas após a solicitação.</p>
          <p>É permitido apenas 1 solicitação de saque por dia.</p>
          <p>Horário para solicitação de saques: <strong>segunda a sexta, das 09:00 às 17:00</strong> (horário de Brasília).</p>
        </AlertDescription>
      </Alert>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">R$ {Number(w.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.pix_key}</TableCell>
                    <TableCell>{withdrawalStatusBadge(w.status)}</TableCell>
                    <TableCell className="text-sm">{w.created_at ? format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                    <TableCell className="text-sm">{w.paid_at ? format(new Date(w.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Commissions History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma comissão registrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor do Plano</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => {
                  const sale = (c as any).affiliate_sales;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{sale?.client_name || sale?.store_name || "-"}</TableCell>
                      <TableCell>R$ {Number(sale?.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">R$ {Number(c.amount).toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm">{c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Modal */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>Informe o valor que deseja sacar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {hasTodayWithdrawal && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você já realizou uma solicitação de saque hoje. Aguarde até amanhã para solicitar novamente.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <span className="text-sm text-muted-foreground">Saldo disponível</span>
              <span className="font-bold text-lg">R$ {availableBalance.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label>Valor do saque (R$)</Label>
              <Input
                type="text"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={hasTodayWithdrawal}
              />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <div className="p-3 rounded-lg border bg-muted/50 text-sm">
                {affiliate?.pix_key ? (
                  <span>{affiliate.pix_type?.toUpperCase()}: {affiliate.pix_key}</span>
                ) : (
                  <span className="text-destructive">Nenhuma chave PIX cadastrada. Atualize seu perfil.</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleWithdraw} disabled={submitting || hasTodayWithdrawal || !affiliate?.pix_key}>
              {submitting ? "Enviando..." : "Solicitar Saque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliatePayments;
