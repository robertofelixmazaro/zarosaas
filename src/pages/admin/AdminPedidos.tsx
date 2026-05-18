import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X, Eye, Package, MapPin, CreditCard, Phone, Mail, MessageCircle, Map, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  created_at: string;
  notes: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  referencia?: string | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: { name: string };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  confirmado: { label: "Confirmado", className: "bg-info/10 text-info border-info/20" },
  entregue: { label: "Entregue", className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusFilters = ["todos", "pendente", "confirmado", "entregue", "cancelado"];

const AdminPedidos = () => {
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!orderToDelete || !tenantId) return;
    setDeleting(true);
    const { error: itemsErr } = await supabase
      .from("order_items" as any)
      .delete()
      .eq("order_id", orderToDelete.id)
      .eq("tenant_id", tenantId);
    if (itemsErr) {
      toast.error("Erro ao excluir itens do pedido", { description: itemsErr.message });
      setDeleting(false);
      return;
    }
    const { error } = await supabase
      .from("orders" as any)
      .delete()
      .eq("id", orderToDelete.id)
      .eq("tenant_id", tenantId);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir pedido", { description: error.message });
      return;
    }
    toast.success("Pedido excluído");
    setOrderToDelete(null);
    setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
  };

  const loadOrders = async () => {
    let query = supabase
      .from("orders" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar pedidos");
      return;
    }
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) loadOrders(); }, [tenantId]);

  const viewOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("order_items" as any)
      .select("*, products(name)")
      .eq("order_id", order.id);
    setOrderItems((data as any) || []);
    setDetailOpen(true);
  };

  const parseNotes = (notes: string | null): Record<string, string> => {
    if (!notes) return {};
    const parsed: Record<string, string> = {};
    notes.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });
    return parsed;
  };

  const sendWhatsAppNotification = (order: Order, items: OrderItem[]) => {
    const notes = parseNotes(order.notes);
    const whatsapp = notes["WhatsApp"] || order.customer_phone;
    const phone = whatsapp.replace(/\D/g, "");
    const phoneFormatted = phone.startsWith("55") ? phone : `55${phone}`;

    const itemsList = items.map((i) => `• ${i.products?.name || "Produto"} ×${i.quantity} - R$ ${(i.unit_price * i.quantity).toFixed(2)}`).join("\n");

    const message = `✅ *Pedido Confirmado!*\n\nOlá ${order.customer_name}, seu pedido foi confirmado!\n\n*Itens:*\n${itemsList}\n\n*Total: R$ ${Number(order.total).toFixed(2)}*\n\n${notes["Modalidade"] === "Entrega" ? `📦 *Entrega no endereço:* ${notes["Endereço"] || ""}` : `🏪 *Retirada:* ${notes["Retirada"] || ""}`}\n\n💳 *Pagamento:* ${notes["Pagamento"] || "A combinar"}${notes["Troco para"] ? `\n💰 Troco para: R$ ${notes["Troco para"]}` : ""}\n\nObrigado pela preferência! 🙏`;

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders" as any)
      .update({ status } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(`Status atualizado para ${statusConfig[status]?.label || status}`);

    // Send WhatsApp on confirm
    if (status === "confirmado") {
      const order = orders.find((o) => o.id === id);
      if (order) {
        const { data } = await supabase
          .from("order_items" as any)
          .select("*, products(name)")
          .eq("order_id", id);
        sendWhatsAppNotification(order, (data as any) || []);
      }
    }

    loadOrders();
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search);
    const matchStatus = filterStatus === "todos" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((s) => (
            <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} className="capitalize">
              {s === "todos" ? "Todos" : statusConfig[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Data</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-sm">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}<br />
                    <span className="text-xs">{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={statusConfig[o.status]?.className}>
                      {statusConfig[o.status]?.label || o.status}
                    </Badge>
                  </td>
                  <td className="p-4 font-semibold text-sm">R$ {Number(o.total).toFixed(0)}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalhes" onClick={() => viewOrder(o)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Confirmar" onClick={() => updateStatus(o.id, "confirmado")}>
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Entregar" onClick={() => updateStatus(o.id, "entregue")}>
                        <Package className="h-4 w-4 text-info" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar" onClick={() => updateStatus(o.id, "cancelado")}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" title="Excluir pedido" onClick={() => setOrderToDelete(o)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground">Nenhum pedido encontrado.</div>}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const info = parseNotes(selectedOrder.notes);
            return (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente</span>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</span>
                    <p className="font-medium">{selectedOrder.customer_phone}</p>
                  </div>
                  {info["WhatsApp"] && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</span>
                      <p className="font-medium">{info["WhatsApp"]}</p>
                    </div>
                  )}
                  {info["E-mail"] && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</span>
                      <p className="font-medium">{info["E-mail"]}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p><Badge variant="outline" className={statusConfig[selectedOrder.status]?.className}>{statusConfig[selectedOrder.status]?.label}</Badge></p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data</span>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                {/* Delivery / Pickup info */}
                {info["Modalidade"] && (
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><MapPin className="h-4 w-4" /> {info["Modalidade"]}</h4>
                    {info["Modalidade"] === "Entrega" ? (
                      <div className="text-sm space-y-1">
                        {info["Endereço"] && <p>{info["Endereço"]}</p>}
                        {/* Second address line (city/state/cep) */}
                        {selectedOrder.notes?.split("\n").find((l) => l.includes("CEP:")) && (
                          <p>{selectedOrder.notes.split("\n").find((l) => l.includes("CEP:"))}</p>
                        )}
                        {(() => {
                          const parts = [
                            selectedOrder.rua,
                            selectedOrder.numero,
                            selectedOrder.bairro,
                            selectedOrder.cidade,
                            selectedOrder.estado,
                            selectedOrder.cep,
                          ].filter(Boolean);
                          const fallback = info["Endereço"] || "";
                          const query = parts.length >= 2
                            ? parts.join(", ")
                            : fallback;
                          if (!query) return null;
                          const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 mt-2"
                              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            >
                              <Map className="h-3.5 w-3.5" /> Abrir no Google Maps
                            </Button>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm">{info["Retirada"] || "-"}</p>
                    )}
                  </div>
                )}

                {/* Payment info */}
                {info["Pagamento"] && (
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><CreditCard className="h-4 w-4" /> Pagamento</h4>
                    <p className="text-sm">{info["Pagamento"]}</p>
                    {info["Troco para"] && (
                      <p className="text-sm text-muted-foreground mt-1">Troco para: R$ {info["Troco para"]}</p>
                    )}
                  </div>
                )}

                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">Itens do Pedido</h4>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.products?.name || "Produto"} × {item.quantity}</span>
                        <span className="font-medium">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>R$ {Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPedidos;
