import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus, Trash2, Phone, User, Mail, MapPin, Clock, CreditCard, Banknote, QrCode, Loader2, MessageCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

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
  const { tenantId, tenant } = useTenant() as any;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout" | "contact">("cart");
  const [contactInfo, setContactInfo] = useState<{ waUrl: string; message: string; negotiationMessage?: string } | null>(null);

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

  const formatCep = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  };

  const handleCepChange = async (v: string) => {
    const masked = formatCep(v);
    setAddressZip(masked);
    setCepError(null);
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.");
        return;
      }
      setAddressStreet(data.logradouro || "");
      setAddressNeighborhood(data.bairro || "");
      setAddressCity(data.localidade || "");
      setAddressState(data.uf || "");
    } catch {
      setCepError("Não foi possível buscar o CEP agora. Preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
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
    setAddressComplement("");
    setAddressReference("");
    setCepError(null);
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
      if (!tenantId) {
        toast.error("Empresa não identificada. Recarregue a página.");
        setSubmitting(false);
        return;
      }

      // Fetch products to check payment_mode / negotiation_message
      const ids = cart.map((c) => c.id);
      const { data: productsData } = await supabase
        .from("products" as any)
        .select("id, payment_mode, negotiation_message")
        .in("id", ids);

      const productsMap = new Map<string, any>((productsData || []).map((p: any) => [p.id, p]));
      const hasContactRequired = cart.some(
        (c) => productsMap.get(c.id)?.payment_mode === "contact_required"
      );
      const requiresContact = hasContactRequired && paymentMethod !== "pix";
      const negotiationMessage =
        cart.map((c) => productsMap.get(c.id)?.negotiation_message).find((m) => m && m.trim()) ||
        "Forma de pagamento sujeita à negociação com a empresa.";

      const notes = buildOrderNotes(requiresContact ? negotiationMessage : undefined);
      const orderStatus = requiresContact ? "pending_payment_contact" : "pendente";
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase
        .from("orders" as any)
        .insert({
          id: orderId,
          tenant_id: tenantId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          total: totalPrice,
          status: orderStatus,
          notes,
          cep: deliveryMode === "entrega" ? addressZip.trim() || null : null,
          rua: deliveryMode === "entrega" ? addressStreet.trim() || null : null,
          numero: deliveryMode === "entrega" ? addressNumber.trim() || null : null,
          complemento: deliveryMode === "entrega" ? addressComplement.trim() || null : null,
          bairro: deliveryMode === "entrega" ? addressNeighborhood.trim() || null : null,
          cidade: deliveryMode === "entrega" ? addressCity.trim() || null : null,
          estado: deliveryMode === "entrega" ? addressState.trim() || null : null,
          referencia: deliveryMode === "entrega" ? addressReference.trim() || null : null,
        } as any);

      if (orderError) {
        console.error("[ProductCart] orders insert error:", orderError);
        throw orderError;
      }

      const items = cart.map((item) => ({
        order_id: orderId,
        tenant_id: tenantId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items" as any)
        .insert(items as any);

      if (itemsError) {
        console.error("[ProductCart] order_items insert error:", itemsError);
        throw itemsError;
      }

      if (requiresContact) {
        // Build WhatsApp message
        const payLabels: Record<PaymentMethod, string> = {
          dinheiro: "Dinheiro",
          debito: "Cartão de Débito",
          credito: "Cartão de Crédito",
          pix: "PIX",
        };
        const itemsTxt = cart
          .map((c) => `• ${c.name} x${c.quantity} - R$ ${(c.price * c.quantity).toFixed(2)}`)
          .join("\n");
        const addressTxt =
          deliveryMode === "entrega"
            ? `Endereço: ${addressStreet}, ${addressNumber} - ${addressNeighborhood}, ${addressCity}/${addressState} - CEP ${addressZip}`
            : "Retirada na loja";
        const msg =
          `Olá! Acabei de fazer um pedido e gostaria de negociar a forma de pagamento.\n\n` +
          `Cliente: ${customerName}\n` +
          `WhatsApp: ${customerWhatsapp}\n\n` +
          `Itens:\n${itemsTxt}\n\n` +
          `Total: R$ ${totalPrice.toFixed(2)}\n` +
          `Forma desejada: ${payLabels[paymentMethod]}\n` +
          `${addressTxt}\n\n` +
          `Pedido: ${orderId.slice(0, 8)}`;
        const tenantPhone = (tenant?.phone || "").replace(/\D/g, "");
        const waUrl = tenantPhone
          ? `https://wa.me/${tenantPhone.startsWith("55") ? tenantPhone : "55" + tenantPhone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;

        setContactInfo({ waUrl, message: msg, negotiationMessage });
        setStep("contact");
        toast.success("Pedido registrado! Fale com a empresa para concluir.");
      } else {
        toast.success("Pedido enviado com sucesso! 🎉", {
          description: "Entraremos em contato pelo WhatsApp.",
        });
        setCart([]);
        resetForm();
        setOpen(false);
      }
    } catch (err: any) {
      toast.error("Erro ao enviar pedido", { description: err.message });
    }
    setSubmitting(false);
  };

  const buildOrderNotes = (negotiationNote?: string): string => {
    const lines: string[] = [];
    lines.push(`WhatsApp: ${customerWhatsapp}`);
    lines.push(`E-mail: ${customerEmail}`);
    lines.push(`Modalidade: ${deliveryMode === "entrega" ? "Entrega" : "Retirada na loja"}`);

    if (deliveryMode === "entrega") {
      lines.push(`Endereço: ${addressStreet}, ${addressNumber} - ${addressNeighborhood}`);
      lines.push(`${addressCity}/${addressState} - CEP: ${addressZip}`);
      if (addressComplement.trim()) lines.push(`Complemento: ${addressComplement}`);
      if (addressReference.trim()) lines.push(`Referência: ${addressReference}`);
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

    if (negotiationNote) {
      lines.push(`\n[Pagamento sujeito à negociação] ${negotiationNote}`);
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
            <div className="relative">
              <Input
                value={addressZip}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="CEP *"
                inputMode="numeric"
                maxLength={9}
                aria-invalid={!!cepError}
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {cepError && <p className="text-xs text-destructive">{cepError}</p>}
            <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua *" />
            <div className="flex gap-2">
              <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Número *" className="w-1/3" />
              <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} placeholder="Bairro *" className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="Cidade *" className="flex-1" />
              <Input value={addressState} onChange={(e) => setAddressState(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF *" className="w-20" />
            </div>
            <Input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Complemento (opcional)" />
            <Input value={addressReference} onChange={(e) => setAddressReference(e.target.value)} placeholder="Ponto de referência (opcional)" />
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
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep("cart"); setContactInfo(null); } }}>
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
            {step === "cart" ? "Carrinho" : step === "checkout" ? "Finalizar pedido" : "Falar com a empresa"}
          </SheetTitle>
        </SheetHeader>

        {step === "contact" && contactInfo ? (
          <div className="flex-1 flex flex-col gap-4 mt-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-sm">
                  {contactInfo.negotiationMessage || "Forma de pagamento sujeita à negociação com a empresa."}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Seu pedido foi registrado. Para concluir, finalize a forma de pagamento diretamente com a empresa pelo WhatsApp.
            </p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.open(contactInfo.waUrl, "_blank")}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com a empresa
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCart([]);
                resetForm();
                setContactInfo(null);
                setOpen(false);
              }}
            >
              Fechar
            </Button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Seu carrinho está vazio
          </div>
        ) : step === "cart" ? renderCartItems() : renderCheckoutForm()}
      </SheetContent>
    </Sheet>
  );
};

export default ProductCart;
