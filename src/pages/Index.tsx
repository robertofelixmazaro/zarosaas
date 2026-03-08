import { useState, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchServices, fetchBarbers, fetchProducts, DbService, DbBarber, DbProduct } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { Scissors, Clock, MapPin, Phone, Instagram, ChevronRight, Star, ShoppingCart, Camera, Download, Play, X, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ProductCart, { CartItem } from "@/components/ProductCart";
import PremiumNavbar from "@/components/PremiumNavbar";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import { useOgMetaTags } from "@/hooks/useOgMetaTags";
import TenantNotFound from "./TenantNotFound";

const Index = () => {
  const queryClient = useQueryClient();
  const { tenantId, tenantSlug, tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shouldOpenCart, setShouldOpenCart] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"image" | "video">("image");
  const { canInstall, isInstalled, install } = usePwaInstall();

  

  // Dynamic OG meta tags (client-side, for SPA navigation)
  const publishedBase = "https://zarosaas.lovable.app";
  const ogUrl = tenantSlug ? `${publishedBase}/t/${tenantSlug}` : publishedBase;

  // Share URL via edge function for proper OG tags in crawlers
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const ogShareUrl = tenantSlug
    ? `${supabaseUrl}/functions/v1/og-tenant?slug=${tenantSlug}`
    : ogUrl;

  const { data: barbersList = [] } = useQuery<DbBarber[]>({ queryKey: ["barbers", tenantId], queryFn: () => fetchBarbers(tenantId || undefined), enabled: !!tenantId });
  const { data: services = [] } = useQuery<DbService[]>({ queryKey: ["services", tenantId], queryFn: () => fetchServices(tenantId || undefined), enabled: !!tenantId });
  const { data: products = [] } = useQuery<DbProduct[]>({ queryKey: ["products", tenantId], queryFn: () => fetchProducts(tenantId || undefined), enabled: !!tenantId });

  const { data: galleryItems = [] } = useQuery({
    queryKey: ["gallery_items", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("gallery_items" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("reviews" as any)
        .select("*, barbers(name)")
        .eq("tenant_id", tenantId)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });

  const { data: siteSettings = {} as any } = useQuery({
    queryKey: ["site_settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return {};
      const { data } = await supabase.from("site_settings").select("*").eq("tenant_id", tenantId);
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    enabled: !!tenantId,
  });

  // Dynamic PWA manifest per tenant
  useDynamicManifest(
    tenant?.name,
    siteSettings.logo_url || tenant?.logo_url || undefined,
    siteSettings.primary_color || undefined
  );

  // Client-side OG meta tags (updates on SPA navigation; crawlers use og-tenant edge function)
  const ogDescription = siteSettings.description || (tenant?.name ? `Agende seu horário em ${tenant.name} de forma rápida e fácil.` : undefined);
  const ogImage = siteSettings.cover_image_url || siteSettings.logo_url || tenant?.logo_url || undefined;
  useOgMetaTags({
    title: siteSettings.shop_name || tenant?.name,
    description: ogDescription,
    image: ogImage,
    url: ogUrl,
  });

    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  const addToCart = (product: DbProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setShouldOpenCart(true);
  };

  if (tenantLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (tenantError || (!tenantLoading && !tenantId)) {
    return <TenantNotFound message={tenantError || undefined} />;
  }

  const basePath = tenantSlug ? `/t/${tenantSlug}` : "";
  const shopName = siteSettings.shop_name || tenant?.name || "Meu Negócio";
  const primaryColor = siteSettings.primary_color || "";
  const secondaryColor = siteSettings.secondary_color || "";
  const buttonColor = siteSettings.button_color || "";
  const coverImage = siteSettings.cover_image_url || "";
  const logoUrl = siteSettings.logo_url || tenant?.logo_url || "";
  const description = siteSettings.description || "";
  const whatsapp = siteSettings.whatsapp || tenant?.phone || "";

  // Dynamic style overrides
  const dynamicStyles: React.CSSProperties = {};
  const btnStyle: React.CSSProperties = buttonColor ? { backgroundColor: buttonColor, borderColor: buttonColor, color: "#fff" } : {};

  return (
    <div className="min-h-screen bg-background">
      <ProductCart cart={cart} setCart={setCart} autoOpen={shouldOpenCart} onAutoOpenHandled={() => setShouldOpenCart(false)} />
      <PremiumNavbar
        shopName={shopName}
        logoUrl={logoUrl}
        avgRating={avgRating}
        shareUrl={ogShareUrl}
      />

      {/* Hero */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {coverImage ? (
            <img src={coverImage} alt={shopName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }} />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
          {logoUrl && (
            <img src={logoUrl} alt={shopName} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-2 border-white/30 shadow-xl" />
          )}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 text-white/80 text-sm mb-6">
            <Star className="h-3.5 w-3.5 fill-current" /> Avaliação {avgRating} · {barbersList.length} profissiona{barbersList.length === 1 ? "l" : "is"}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6">
            {shopName}
          </h1>
          {description && (
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto">
              {description}
            </p>
          )}
          {!description && (
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto">
              Agende seu horário com os melhores profissionais
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`${basePath}/agendar`}>
              <Button size="lg" className="text-base px-8 gap-2" style={btnStyle}>
                Agendar Horário <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#servicos">
              <Button size="lg" variant="outline" className="text-base px-8 border-white/30 text-white hover:bg-white/10">
                Ver Serviços
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b" style={primaryColor ? { borderColor: `${primaryColor}20` } : {}}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: String(barbersList.length), label: "Profissionais" },
              { number: String(services.length), label: "Serviços" },
              { number: `${avgRating}★`, label: "Avaliação Média" },
              { number: String(reviews.length), label: "Avaliações" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold" style={primaryColor ? { color: primaryColor } : {}}>{s.number}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Nossos Serviços</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Conheça todos os serviços disponíveis</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {services.map((s, i) => (
              <div
                key={s.id}
                className="group rounded-lg border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {s.image_url ? (
                  <div className="w-full h-40 bg-muted">
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-muted/30 flex items-center justify-center">
                    <span className="text-5xl">{s.icon}</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-1">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold">R$ {Number(s.price).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duration_minutes} min
                    </span>
                  </div>
                  <Link to={`${basePath}/agendar?servico=${s.id}`}>
                    <Button className="w-full gap-2" style={btnStyle}>
                      Agendar <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to={`${basePath}/agendar`}>
              <Button size="lg" className="gap-2" style={btnStyle}>
                Ver Todos os Horários <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Equipe */}
      {barbersList.length > 0 && (
        <section id="equipe" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Nossa Equipe</h2>
              <p className="text-muted-foreground">Profissionais dedicados ao seu atendimento</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {barbersList.map((b) => (
                <div key={b.id} className="text-center group">
                  {b.photo_url ? (
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                      <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4 text-4xl font-bold group-hover:scale-105 transition-transform"
                      style={primaryColor ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
                    >
                      {b.name[0]}
                    </div>
                  )}
                  <h3 className="text-lg font-semibold">{b.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.specialty}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Galeria */}
      {galleryItems.length > 0 && (
        <section id="galeria" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Galeria</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Confira nossos trabalhos e resultados</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-6xl mx-auto">
              {galleryItems.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => { setLightboxUrl(item.media_url); setLightboxType(item.media_type); }}
                  className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-muted"
                >
                  {item.media_type === "video" ? (
                    <>
                      <video src={item.media_url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Play className="h-10 w-10 text-white fill-white" />
                      </div>
                    </>
                  ) : (
                    <img src={item.media_url} alt={item.title || "Galeria"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  {(item.title || item.description) && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      {item.title && <span className="text-xs text-white font-medium block">{item.title}</span>}
                      {item.description && <span className="text-xs text-white/70 block line-clamp-1">{item.description}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxUrl(null)}>
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {lightboxType === "video" ? (
              <video src={lightboxUrl} className="w-full max-h-[90vh] rounded-lg" controls autoPlay />
            ) : (
              <img src={lightboxUrl} alt="Galeria" className="w-full max-h-[90vh] object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}

      {/* Produtos */}
      {products.length > 0 && (
        <section id="produtos" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Nossos Produtos</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Cuide do seu visual em casa com os melhores produtos</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {products.map((p) => (
                <div key={p.id} className="rounded-lg border bg-card hover:shadow-lg transition-all group overflow-hidden">
                  {p.image_url ? (
                    <div className="w-full h-40 bg-muted">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold mb-1">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">R$ {Number(p.price).toFixed(0)}</span>
                      <Button size="sm" onClick={() => addToCart(p)} disabled={p.stock <= 0} style={btnStyle}>
                        {p.stock > 0 ? "Comprar" : "Esgotado"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Avaliações */}
      {reviews.length > 0 && (
        <section id="avaliacoes" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">O Que Nossos Clientes Dizem</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Avaliações reais dos nossos clientes</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-6 rounded-lg border bg-card">
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-4 w-4", s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{r.comment}</p>}
                  <div className="flex items-center gap-3">
                    {r.client_photo_url ? (
                      <img src={r.client_photo_url} alt={r.client_name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(r.client_name || "?")?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{r.client_name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">com {r.barbers?.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Formulário de Avaliação */}
      <section id="avaliar" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Deixe Sua Avaliação</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Conte como foi sua experiência</p>
          </div>
          <WalkinReviewForm barbers={barbersList} tenantId={tenantId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["reviews", tenantId] })} buttonStyle={btnStyle} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div
            className={cn("rounded-2xl p-10 md:p-16 text-center max-w-4xl mx-auto", !primaryColor && "bg-primary text-primary-foreground")}
            style={primaryColor ? { backgroundColor: primaryColor, color: "#fff" } : {}}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para agendar?</h2>
            <p className="opacity-70 mb-8 max-w-md mx-auto">Agende agora e garanta seu horário com os melhores profissionais.</p>
            <Link to={`${basePath}/agendar`}>
              <Button size="lg" variant="secondary" className="text-base px-10 gap-2">
                Agendar Horário <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* WhatsApp FAB */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
          title="Falar no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}

      {/* Footer */}
      <footer id="contato" className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <Scissors className="h-5 w-5" />
                )}
                <span className="font-bold tracking-tight">{shopName}</span>
              </div>
              <p className="text-sm text-muted-foreground">{description || "Agende seu horário com facilidade."}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Horário de Funcionamento</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{siteSettings.hours_weekday || "Segunda a Sexta"}</p>
                <p>{siteSettings.hours_saturday || "Sábado"}</p>
                <p>{siteSettings.hours_sunday || "Domingo"}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contato</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                {(siteSettings.address || tenant?.address) && (
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {siteSettings.address || tenant?.address}</p>
                )}
                {(siteSettings.phone || tenant?.phone) && (
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {siteSettings.phone || tenant?.phone}</p>
                )}
                {siteSettings.instagram && (
                  <p className="flex items-center gap-2"><Instagram className="h-4 w-4" /> {siteSettings.instagram}</p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} {shopName}. Todos os direitos reservados.</span>
            {canInstall && !isInstalled && (
              <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
                const ok = await install();
                if (ok) toast.success("App instalado com sucesso!");
              }}>
                <Download className="h-4 w-4" /> Instalar App
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

function WalkinReviewForm({ barbers, onSuccess, tenantId, buttonStyle }: { barbers: DbBarber[]; onSuccess: () => void; tenantId?: string | null; buttonStyle?: React.CSSProperties }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [barberId, setBarberId] = useState("");
  const [clientName, setClientName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("review-photos").upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("review-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("reviews" as any).insert({
        barber_id: barberId,
        rating,
        comment: comment.trim() || null,
        appointment_id: null,
        client_user_id: null,
        client_name: clientName.trim(),
        client_photo_url: photoUrl,
        tenant_id: tenantId || null,
        approved: false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada! Será exibida após aprovação.");
      setRating(0);
      setComment("");
      setBarberId("");
      setClientName("");
      setPhotoFile(null);
      setPhotoPreview(null);
      onSuccess();
    },
    onError: () => toast.error("Erro ao enviar avaliação. Tente novamente."),
  });

  return (
    <div className="max-w-md mx-auto p-6 rounded-lg border bg-card space-y-5">
      <div>
        <label className="text-sm font-medium mb-2 block">Seu Nome</label>
        <Input
          placeholder="Digite seu nome"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          maxLength={100}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Sua Foto (opcional)</label>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Camera className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {photoPreview ? "Trocar foto" : "Escolher foto"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Profissional</label>
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o profissional" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Nota</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(s)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("h-7 w-7 transition-colors", (hovered || rating) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
            </button>
          ))}
        </div>
      </div>
      <Textarea
        placeholder="Como foi sua experiência? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
      />
      <Button
        onClick={() => mutation.mutate()}
        disabled={rating === 0 || !barberId || !clientName.trim() || mutation.isPending}
        className="w-full"
        style={buttonStyle}
      >
        {mutation.isPending ? "Enviando..." : "Enviar Avaliação"}
      </Button>
    </div>
  );
}

export default Index;
