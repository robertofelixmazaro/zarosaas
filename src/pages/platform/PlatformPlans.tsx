import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  max_barbers: number;
  max_services: number;
  max_appointments_month: number;
  max_products: number;
  features: string[];
  active: boolean;
  created_at: string;
}

const emptyPlan = {
  name: "",
  description: "",
  price: 0,
  max_barbers: 5,
  max_services: 10,
  max_appointments_month: 500,
  max_products: 50,
  features: "",
  active: true,
};

const PlatformPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPlan);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("plans" as any)
      .select("*")
      .order("price", { ascending: true });
    if (error) { toast.error("Erro ao carregar planos"); return; }
    setPlans((data || []).map((p: any) => ({ ...p, features: p.features || [] })));
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      max_barbers: plan.max_barbers,
      max_services: plan.max_services || 10,
      max_appointments_month: plan.max_appointments_month,
      max_products: plan.max_products,
      features: (plan.features || []).join(", "),
      active: plan.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const featuresArray = form.features.split(",").map(f => f.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: form.price,
      max_barbers: form.max_barbers,
      max_services: form.max_services,
      max_appointments_month: form.max_appointments_month,
      max_products: form.max_products,
      features: featuresArray,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase.from("plans" as any).update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("plans" as any).insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Plano criado");
    }
    setDialogOpen(false);
    fetchPlans();
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("plans" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Plano excluído");
    fetchPlans();
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/admin-platform">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Planos</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Plano</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço (R$)</Label>
                    <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Profissionais</Label>
                    <Input type="number" value={form.max_barbers} onChange={e => setForm({ ...form, max_barbers: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Serviços</Label>
                    <Input type="number" value={form.max_services} onChange={e => setForm({ ...form, max_services: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Agendamentos/mês</Label>
                    <Input type="number" value={form.max_appointments_month} onChange={e => setForm({ ...form, max_appointments_month: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Produtos</Label>
                    <Input type="number" value={form.max_products} onChange={e => setForm({ ...form, max_products: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Funcionalidades (separadas por vírgula)</Label>
                  <Textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="Agendamento online, Relatórios, QR Code" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                  <Label>Ativo</Label>
                </div>
                <Button className="w-full" onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                 <TableRow>
                     <TableHead>Nome</TableHead>
                     <TableHead>Preço</TableHead>
                     <TableHead>Profissionais</TableHead>
                     <TableHead>Serviços</TableHead>
                     <TableHead>Agend./mês</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Ações</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>R$ {plan.price.toFixed(2)}</TableCell>
                      <TableCell>{plan.max_barbers >= 999 ? "∞" : plan.max_barbers}</TableCell>
                      <TableCell>{(plan.max_services || 0) >= 999 ? "∞" : plan.max_services}</TableCell>
                      <TableCell>{plan.max_appointments_month >= 99999 ? "∞" : plan.max_appointments_month}</TableCell>
                      <TableCell>
                        <Badge variant={plan.active ? "default" : "destructive"}>
                          {plan.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deletePlan(plan.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PlatformPlans;
