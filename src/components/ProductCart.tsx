import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus, Trash2, Phone, User, Mail, MapPin, Clock, CreditCard, Banknote, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProductCartProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  autoOpen?: boolean;
  onAutoOpenHandled?: () => void;
}

type DeliveryMode = "entrega" | "retirada";
type PaymentMethod = "dinheiro" | "debito" | "credito" | "pix";

const ProductCart = ({ cart, setCart, autoOpen, onAutoOpenHandled }: ProductCartProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Delivery
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("retirada");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Pickup
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalProducts = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPrice = totalProducts + (deliveryMode === "entrega" ? deliveryFee : 0);

  // Load delivery fee from settings
  useEffect(() => {
    supabase
      .from("site_settings" as any)
      .select("value")
      .eq("key", "delivery_fee")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDeliveryFee(Number((data as any).value) || 0);
      });
  }, []);

  // Auto-open cart when product is added
  useEffect(() => {
    if (autoOpen && cart.length > 0) {
      setOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpen]);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerWhatsapp("");
    setCustomerEmail("");
    setDeliveryMode("retirada");
    setAddressStreet("");
    setAddressNumber("");
    setAddressNeighborhood("");
    setAddressCity("");
    setAddressState("");
    setAddressZip("");
    setPickupDate("");
    setPickupTime("");
    setPaymentMethod("pix");
    setNeedsChange(false);
    setChangeFor("");
    setStep("cart");
  };

  const validateCheckout = (): string | null => {
    if (!customerName.trim()) return "Preencha o nome completo";
    if (!customerPhone.trim()) return "Preencha o número do celular";
    if (!customerWhatsapp.trim()) return "Preencha o WhatsApp";
    if (!customerEmail.trim()) return "Preencha o e-mail";

    if (deliveryMode === "entrega") {
      if (!addressStreet.trim()) return "Preencha a rua";
      if (!addressNumber.trim()) return "Preencha o número";
      if (!addressNeighborhood.trim()) return "Preencha o bairro";
      if (!addressCity.trim()) return "Preencha a cidade";
      if (!addressState.trim()) return "Preencha o estado";
      if (!addressZip.trim()) return "Preencha o CEP";
    } else {
      if (!pickupDate) return "Selecione a data de retirada";
      if (!pickupTime) return "Selecione o horário de retirada";
    }

    if (paymentMethod === "dinheiro" && needsChange && !changeFor.trim()) {
      return "Informe o valor para troco";
    }

    return null;
  };

  const handleCheckout = async () => {
    const error = validateCheckout();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      const notes = buildOrderNotes();

      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase
        .from("orders" as any)
        .insert({
          id: orderId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          total: totalPrice,
          status: "pendente",
          notes,
        } as any);

      if (orderError) throw orderError;

      const items = cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items" as any)
        .insert(items as any);

      if (itemsError) throw itemsError;

      toast.success("Pedido enviado com sucesso! 🎉", {
        description: "Entraremos em contato pelo WhatsApp.",
      });
      setCart([]);
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao enviar pedido", { description: err.message });
    }
    setSubmitting(false);
  };

  const buildOrderNotes = (): string => {
    const lines: string[] = [];
    lines.push(`WhatsApp: ${customerWhatsapp}`);
    lines.push(`E-mail: ${customerEmail}`);
    lines.push(`Modalidade: ${deliveryMode === "entrega" ? "Entrega" : "Retirada na loja"}`);

    if (deliveryMode === "entrega") {
      lines.push(`Endereço: ${addressStreet}, ${addressNumber} - ${addressNeighborhood}`);
      lines.push(`${addressCity}/${addressState} - CEP: ${addressZip}`);
    } else {
      lines.push(`Retirada: ${pickupDate} às ${pickupTime}`);
    }

    const payLabels: Record<PaymentMethod, string> = {
      dinheiro: "Dinheiro",
      debito: "Cartão de Débito",
      credito: "Cartão de Crédito",
      pix: "PIX",
    };
    lines.push(`Pagamento: ${payLabels[paymentMethod]}`);

    if (paymentMethod === "dinheiro" && needsChange) {
      lines.push(`Troco para: R$ ${changeFor}`);
    }

    return lines.join("\n");
  };

  const renderCartItems = () => (
    <>
      <div className="flex-1 overflow-y-auto space-y-3 mt-4">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">R$ {Number(item.price).toFixed(2)} cada</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-sm font-semibold w-16 text-right">
              R$ {(item.price * item.quantity).toFixed(2)}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {totalProducts.toFixed(2)}</span>
          </div>
          {deliveryMode === "entrega" && deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Taxa de entrega</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>R$ {totalPrice.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Continuar comprando
          </Button>
          <Button className="flex-1" onClick={() => setStep("checkout")} disabled={cart.length === 0}>
            Finalizar compra
          </Button>
        </div>
      </div>
    </>
  );

  const renderCheckoutForm = () => (
    <div className="flex-1 overflow-y-auto space-y-5 mt-4 pb-4">
      {/* Dados pessoais */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4" /> Dados pessoais</h3>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome completo *" />
        <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Celular *" />
        <Input value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder="WhatsApp *" />
        <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="E-mail *" type="email" />
      </div>

      {/* Entrega ou Retirada */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Entrega ou Retirada</h3>
        <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as DeliveryMode)} className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="entrega" id="entrega" />
            <Label htmlFor="entrega">Entrega</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="retirada" id="retirada" />
            <Label htmlFor="retirada">Retirar na loja</Label>
          </div>
        </RadioGroup>

        {deliveryMode === "entrega" ? (
          <div className="space-y-2">
            <Input value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="CEP *" />
            <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua *" />
            <div className="flex gap-2">
              <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Número *" className="w-1/3" />
              <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} placeholder="Bairro *" className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="Cidade *" className="flex-1" />
              <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="UF *" className="w-20" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Data de retirada *</Label>
                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Horário *</Label>
                <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagamento */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Forma de pagamento</h3>
        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg border">
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="flex items-center gap-1 cursor-pointer text-sm"><QrCode className="h-3.5 w-3.5" /> PIX</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg border">
            <RadioGroupItem value="credito" id="credito" />
            <Label htmlFor="credito" className="flex items-center gap-1 cursor-pointer text-sm"><CreditCard className="h-3.5 w-3.5" /> Crédito</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg border">
            <RadioGroupItem value="debito" id="debito" />
            <Label htmlFor="debito" className="flex items-center gap-1 cursor-pointer text-sm"><CreditCard className="h-3.5 w-3.5" /> Débito</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg border">
            <RadioGroupItem value="dinheiro" id="dinheiro" />
            <Label htmlFor="dinheiro" className="flex items-center gap-1 cursor-pointer text-sm"><Banknote className="h-3.5 w-3.5" /> Dinheiro</Label>
          </div>
        </RadioGroup>

        {paymentMethod === "dinheiro" && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="needs-change"
                checked={needsChange}
                onChange={(e) => setNeedsChange(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="needs-change" className="text-sm cursor-pointer">Precisa de troco?</Label>
            </div>
            {needsChange && (
              <Input
                value={changeFor}
                onChange={(e) => setChangeFor(e.target.value)}
                placeholder="Troco para quanto? Ex: 50"
                type="number"
              />
            )}
          </div>
        )}
      </div>

      {/* Resumo e ações */}
      <div className="border-t pt-4 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {totalProducts.toFixed(2)}</span>
          </div>
          {deliveryMode === "entrega" && deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Taxa de entrega</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>R$ {totalPrice.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep("cart")}>
            Voltar
          </Button>
          <Button className="flex-1" onClick={handleCheckout} disabled={submitting}>
            {submitting ? "Enviando..." : "Confirmar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep("cart"); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 border-0">
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {step === "cart" ? "Carrinho" : "Finalizar pedido"}
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Seu carrinho está vazio
          </div>
        ) : step === "cart" ? renderCartItems() : renderCheckoutForm()}
      </SheetContent>
    </Sheet>
  );
};

export default ProductCart;
