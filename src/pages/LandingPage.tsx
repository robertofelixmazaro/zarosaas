import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import {
  ChevronRight, Store, Users, Calendar, Shield, Clock, Bell, UserCheck,
  ShoppingBag, BarChart3, Globe, Smartphone, Star, ArrowRight, CheckCircle2,
  MessageSquare, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";

const benefits = [
  { icon: Clock, title: "Agenda online automática 24h", desc: "Clientes podem agendar serviços a qualquer momento, mesmo fora do horário comercial." },
  { icon: Users, title: "Gestão completa de clientes", desc: "Histórico de atendimentos e organização da base de clientes em um só lugar." },
  { icon: Bell, title: "Lembretes automáticos", desc: "Envio de lembretes por WhatsApp, e-mail ou notificações para reduzir faltas." },
  { icon: UserCheck, title: "Recuperação de clientes inativos", desc: "Identifica clientes que não retornam há mais de 30 dias automaticamente." },
  { icon: ShoppingBag, title: "Loja virtual integrada", desc: "Venda produtos diretamente pela página da sua empresa." },
  { icon: Calendar, title: "Gestão de equipe", desc: "Controle de horários e agenda individual de cada profissional." },
  { icon: BarChart3, title: "Relatórios inteligentes", desc: "Acompanhe faturamento, desempenho e métricas do negócio em tempo real." },
  { icon: Globe, title: "Página própria de agendamento", desc: "Cada empresa possui sua própria página profissional personalizada." },
  { icon: Shield, title: "Sistema seguro e confiável", desc: "Proteção de dados com criptografia e arquitetura moderna na nuvem." },
  { icon: Smartphone, title: "Aplicativo instalável no celular", desc: "Sistema pode ser instalado como app no smartphone dos seus clientes." },
];

const steps = [
  { num: "01", title: "Crie sua conta", desc: "Cadastre sua empresa em poucos minutos com um processo simples e rápido.", icon: UserCheck },
  { num: "02", title: "Configure seus serviços", desc: "Adicione serviços, horários de funcionamento e profissionais da equipe.", icon: Calendar },
  { num: "03", title: "Receba agendamentos", desc: "Seus clientes podem agendar online 24 horas por dia, automaticamente.", icon: CheckCircle2 },
];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const LandingPage = () => {
  const { data: plans = [] } = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
  });

  const { data: videoUrl } = useQuery({
    queryKey: ["landing-video-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "landing_video_url")
        .maybeSingle();
      return data?.value || "";
    },
  });

  const { data: landingContent } = useQuery({
    queryKey: ["landing-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "landing_hero_title",
          "landing_hero_subtitle",
          "landing_benefits_title",
          "landing_cta_title",
          "landing_cta_subtitle",
          "landing_hero_image_url",
        ]);
      const map: Record<string, string> = {};
      data?.forEach((row) => { map[row.key] = row.value; });
      return map;
    },
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["landing-gallery-images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_gallery_images" as any)
        .select("*")
        .order("ordem", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const { data: galleryVideos = [] } = useQuery({
    queryKey: ["landing-gallery-videos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_gallery_videos" as any)
        .select("*")
        .order("created_at", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const { data: clientLogos = [] } = useQuery({
    queryKey: ["landing-client-logos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_clients_logos" as any)
        .select("*")
        .order("created_at", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (url.endsWith(".mp4")) return url;
    return null;
  };

  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <img src={zaroLogo} alt="Zaro Sistemas" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold tracking-tight">Zaro Sistemas</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link to="/cadastrar" className="hidden sm:inline-flex">
              <Button size="sm">Cadastrar</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ===== HERO ===== */}
      <section className="relative py-20 md:py-28 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}
            >
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 px-3 py-1 rounded-full bg-primary/10">
                Plataforma SaaS de Agendamentos
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.15] mb-6">
                {landingContent?.landing_hero_title ? (
                  landingContent.landing_hero_title
                ) : (
                  <>Automatize os agendamentos do seu negócio e{" "}<span className="text-primary">ganhe mais clientes</span></>
                )}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                {landingContent?.landing_hero_subtitle || "Sistema completo para barbearias, clínicas, salões e prestadores de serviço organizarem agenda, clientes e equipe."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/cadastrar">
                  <Button size="lg" className="text-base px-8 gap-2 w-full sm:w-auto">
                    Começar agora <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/explorar">
                  <Button variant="outline" size="lg" className="text-base px-8 gap-2 w-full sm:w-auto">
                    <Search className="h-4 w-4" /> Explorar Marketplace
                  </Button>
                </Link>
                <a href="#como-funciona">
                  <Button variant="ghost" size="lg" className="text-base px-8 w-full sm:w-auto">
                    Ver como funciona
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Teste grátis</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Cancele quando quiser</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-sm">Próximos Agendamentos</p>
                    <p className="text-xs text-muted-foreground">Hoje, {new Date().toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                {[
                  { time: "09:00", name: "Carlos Silva", service: "Corte Masculino", color: "bg-primary/10 text-primary" },
                  { time: "10:30", name: "Ana Souza", service: "Limpeza de Pele", color: "bg-accent/10 text-accent" },
                  { time: "14:00", name: "Pedro Lima", service: "Barba Completa", color: "bg-primary/10 text-primary" },
                ].map((a, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.15 }}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background/50"
                  >
                    <span className={`text-xs font-bold px-2 py-1 rounded ${a.color}`}>{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.service}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  </motion.div>
                ))}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-xl bg-primary/10 blur-2xl" />
                <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-accent/10 blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
            className="text-center mb-14 max-w-2xl mx-auto"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Recursos</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {landingContent?.landing_benefits_title || "Tudo que você precisa para organizar e crescer seu negócio"}
            </h2>
            <p className="text-muted-foreground">Funcionalidades pensadas para simplificar sua rotina e aumentar seus resultados.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-7xl mx-auto">
            {benefits.map((b, i) => (
              <motion.div key={b.title}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp} transition={{ duration: 0.45, delay: i * 0.06 }}
                className="group p-5 rounded-xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
            className="text-center mb-14 max-w-xl mx-auto"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Passo a passo</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Começar é muito simples</h2>
            <p className="text-muted-foreground">Em apenas 3 passos sua empresa já está recebendo agendamentos online.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div key={s.num}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center p-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute top-2 right-2 text-5xl font-black text-primary/5">{s.num}</span>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="h-6 w-6 text-primary/20" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VÍDEO EXPLICATIVO ===== */}
      {embedUrl && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-center mb-10 max-w-xl mx-auto"
            >
              <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Demonstração</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Veja como funciona o sistema</h2>
              <p className="text-muted-foreground">Assista ao vídeo e descubra como o Zaro pode transformar seu negócio.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto rounded-2xl overflow-hidden border shadow-lg aspect-video bg-muted"
            >
              {embedUrl.endsWith(".mp4") ? (
                <video src={embedUrl} controls className="w-full h-full object-contain" />
              ) : (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Vídeo explicativo do Zaro"
                />
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== PLANOS ===== */}
      {plans.length > 0 && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-center mb-14 max-w-xl mx-auto"
            >
              <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Planos</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Escolha o plano ideal</h2>
              <p className="text-muted-foreground">Planos flexíveis que acompanham o crescimento do seu negócio.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan: any, i: number) => {
                const features = Array.isArray(plan.features) ? plan.features : [];
                const isPopular = i === 1;
                return (
                  <motion.div key={plan.id}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.12 }}
                    className={`relative rounded-2xl border p-6 bg-card flex flex-col ${isPopular ? "border-primary shadow-xl ring-2 ring-primary/20" : "hover:shadow-lg"} transition-all`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-primary text-primary-foreground px-4 py-1 rounded-full">
                        Mais popular
                      </span>
                    )}
                    <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>}
                    <div className="mb-5">
                      <span className="text-3xl font-extrabold">
                        {plan.price === 0 ? "Grátis" : `R$ ${Number(plan.price).toFixed(2).replace(".", ",")}`}
                      </span>
                      {plan.price > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.max_barbers != null && (
                        <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até {plan.max_barbers} profissionais</li>
                      )}
                      {plan.max_services != null && (
                        <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até {plan.max_services} serviços</li>
                      )}
                      {plan.max_appointments_month != null && (
                        <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {plan.max_appointments_month} agendamentos/mês</li>
                      )}
                      {plan.max_clients != null && (
                        <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até {plan.max_clients} clientes</li>
                      )}
                      {plan.max_products != null && (
                        <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até {plan.max_products} produtos</li>
                      )}
                      {features.map((f: string, fi: number) => (
                        <li key={fi} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {f}</li>
                      ))}
                    </ul>
                    <Link to="/cadastrar">
                      <Button className="w-full" variant={isPopular ? "default" : "outline"}>
                        {plan.price === 0 ? "Começar grátis" : "Assinar agora"}
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== NEGÓCIOS CADASTRADOS ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-3">Negócios que já usam o Zaro</h2>
            <p className="text-muted-foreground">Encontre seu negócio ou crie o seu</p>
          </motion.div>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Carregando...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Nenhum negócio cadastrado ainda.{" "}
              <Link to="/cadastrar" className="text-primary underline">Seja o primeiro!</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {tenants.slice(0, 6).map((t: any, i: number) => (
                <motion.div key={t.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <a href={getTenantExternalUrl(t.slug)}
                    className="block p-5 rounded-xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">{t.name}</h3>
                        <p className="text-xs text-muted-foreground">/{t.slug}</p>
                      </div>
                    </div>
                    {t.address && <p className="text-sm text-muted-foreground mb-3">{t.address}</p>}
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                      Visitar <ChevronRight className="h-4 w-4" />
                    </span>
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== GALERIA DE IMAGENS ===== */}
      {galleryImages.length > 0 && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-center mb-12 max-w-xl mx-auto"
            >
              <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Galeria</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Conheça o sistema por dentro</h2>
              <p className="text-muted-foreground">Veja capturas de tela e imagens do funcionamento da plataforma.</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {galleryImages.map((img: any, i: number) => (
                <motion.div key={img.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-shadow"
                >
                  <img src={img.image_url} alt="Galeria Zaro" className="w-full aspect-video object-cover" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== GALERIA DE VÍDEOS ===== */}
      {galleryVideos.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-center mb-12 max-w-xl mx-auto"
            >
              <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Demonstração</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Veja o Zaro em ação</h2>
              <p className="text-muted-foreground">Assista aos vídeos e descubra como podemos transformar seu negócio.</p>
            </motion.div>
            <div className={`grid gap-6 max-w-5xl mx-auto ${galleryVideos.length === 1 ? "max-w-3xl" : "sm:grid-cols-2"}`}>
              {galleryVideos.map((v: any, i: number) => {
                const embed = getEmbedUrl(v.video_url);
                if (!embed) return null;
                return (
                  <motion.div key={v.id}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.12 }}
                    className="space-y-2"
                  >
                    <div className="rounded-xl overflow-hidden border shadow-lg aspect-video bg-muted">
                      {embed.endsWith(".mp4") ? (
                        <video src={embed} controls className="w-full h-full object-contain" />
                      ) : (
                        <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={v.titulo || "Vídeo"} />
                      )}
                    </div>
                    {v.titulo && <p className="text-sm font-medium text-center">{v.titulo}</p>}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== EMPRESAS QUE CONFIAM NO ZARO ===== */}
      {clientLogos.length > 0 && (
        <section className="py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-center mb-12 max-w-xl mx-auto"
            >
              <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Nossos Clientes</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Empresas que confiam no Zaro</h2>
              <p className="text-muted-foreground">Negócios de diversos segmentos já utilizam nossa plataforma.</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-w-5xl mx-auto items-center">
              {clientLogos.map((logo: any, i: number) => (
                <motion.div key={logo.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <img src={logo.logo_url} alt={logo.empresa_nome} className="w-auto object-contain" style={{ height: '60px' }} />
                  <p className="text-xs font-medium text-muted-foreground text-center truncate w-full">{logo.empresa_nome}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}


      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {landingContent?.landing_cta_title || "Pronto para organizar seu negócio?"}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {landingContent?.landing_cta_subtitle || "Crie sua página de agendamento e comece a receber clientes hoje mesmo."}
            </p>
            <Link to="/cadastrar">
              <Button size="lg" className="text-base px-10 gap-2">
                Criar minha agenda agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zaro Sistemas. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
