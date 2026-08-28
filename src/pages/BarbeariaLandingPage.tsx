import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowRight, Scissors, CalendarClock, Bell, Users, ShoppingBag,
  BarChart3, Smartphone, Star, CheckCircle2, MessageSquare, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Seo } from "@/components/Seo";
import zaroLogo from "@/assets/zaro-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const pains = [
  {
    icon: MessageSquare,
    title: "Agenda no caderno e no WhatsApp",
    desc: "Horários anotados em vários lugares geram conflito de agendamento e cliente esperando na cadeira do lado.",
    fix: "Agenda online única, por barbeiro, com horários disponíveis calculados automaticamente.",
  },
  {
    icon: CalendarClock,
    title: "Cliente que não aparece (no-show)",
    desc: "Cada falta é uma cadeira parada e faturamento perdido no dia.",
    fix: "Lembretes automáticos por WhatsApp e e-mail, confirmação de presença e sinal antecipado opcional.",
  },
  {
    icon: Users,
    title: "Cliente some depois de um corte",
    desc: "Sem histórico, é impossível saber quem parou de voltar à barbearia.",
    fix: "Ficha do cliente com histórico de cortes e alerta de clientes inativos há mais de 30 dias.",
  },
  {
    icon: Wallet,
    title: "Comissão de barbeiro na calculadora",
    desc: "Fechamento manual no fim do mês costuma gerar erro e discussão com a equipe.",
    fix: "Comissão calculada por atendimento e relatório de faturamento por profissional.",
  },
];

const features = [
  { icon: Scissors, title: "Agenda por barbeiro", desc: "Cada profissional com seus serviços, horários e folgas." },
  { icon: Bell, title: "Lembretes automáticos", desc: "WhatsApp, e-mail e push reduzindo faltas sem trabalho manual." },
  { icon: Smartphone, title: "Página própria da barbearia", desc: "Link e QR Code para o cliente agendar em segundos pelo celular." },
  { icon: Star, title: "Avaliações dos clientes", desc: "Colete avaliações após o corte e exiba as aprovadas na sua página." },
  { icon: ShoppingBag, title: "Venda de produtos", desc: "Pomadas, óleos e kits vendidos direto na página da barbearia." },
  { icon: BarChart3, title: "Relatórios do salão", desc: "Faturamento, serviços mais pedidos e desempenho da equipe." },
];

const steps = [
  { n: "1", title: "Crie sua conta", desc: "Cadastro gratuito em poucos minutos, sem instalar nada." },
  { n: "2", title: "Configure serviços e barbeiros", desc: "Corte, barba, combo, duração, preço e horários de cada profissional." },
  { n: "3", title: "Compartilhe seu link", desc: "Envie no WhatsApp, coloque na bio do Instagram ou imprima o QR Code." },
  { n: "4", title: "Receba agendamentos 24h", desc: "A agenda enche sozinha, inclusive com a barbearia fechada." },
];

const faqs = [
  {
    q: "O sistema serve para barbearia com vários barbeiros?",
    a: "Sim. Você cadastra cada barbeiro com seus próprios serviços, horários e folgas. O cliente escolhe o profissional na hora de agendar e cada barbeiro acessa a própria agenda.",
  },
  {
    q: "Como o sistema reduz as faltas dos clientes?",
    a: "O Zaro envia lembretes automáticos por WhatsApp e e-mail antes do horário, permite confirmação ou cancelamento pelo próprio cliente e, se você quiser, cobra um sinal antecipado.",
  },
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O sistema funciona no navegador do computador e do celular, e pode ser instalado como aplicativo na tela inicial pelo próprio site da sua barbearia.",
  },
  {
    q: "Meus clientes precisam criar conta para agendar?",
    a: "Não. O cliente abre o link da sua barbearia, escolhe serviço, profissional e horário, informa os dados de contato e pronto.",
  },
  {
    q: "Posso usar meu próprio domínio e a identidade da barbearia?",
    a: "Sim. A página de agendamento usa o nome, a logo, as cores e as fotos da sua barbearia, e pode funcionar em um domínio próprio.",
  },
];

const BarbeariaLandingPage = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Seo
        title="Sistema para Barbearia — Agendamento Online | Zaro"
        description="Sistema para barbearia com agenda online por barbeiro, lembretes automáticos no WhatsApp, controle de comissões e página própria para receber agendamentos 24h."
        path="/sistema-para-barbearia"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={zaroLogo} alt="Zaro Sistemas" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold tracking-tight">Zaro Sistemas</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link to="/comprar" className="hidden sm:inline-flex">
                <Button size="sm">Cadastrar</Button>
              </Link>
            </div>
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="relative py-20 md:py-28">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="container mx-auto px-4 relative">
              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}
                className="max-w-3xl mx-auto text-center"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary mb-5 px-3 py-1 rounded-full bg-primary/10">
                  <Scissors className="h-3.5 w-3.5" /> Feito para barbearias
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] mb-6">
                  Sistema para barbearia com agendamento online 24 horas
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Organize a agenda de cada barbeiro, reduza faltas com lembretes automáticos no WhatsApp
                  e acompanhe o faturamento da barbearia em um só lugar.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/comprar">
                    <Button size="lg" className="text-base px-8 gap-2 platform-btn-primary w-full sm:w-auto">
                      Criar agenda da minha barbearia <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/explorar">
                    <Button size="lg" variant="outline" className="text-base px-8 w-full sm:w-auto">
                      Ver barbearias na plataforma
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Sem instalação. Funciona no celular e no computador.
                </p>
              </motion.div>
            </div>
          </section>

          {/* DORES */}
          <section className="py-20 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-12">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Rotina da barbearia</span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Os problemas que travam o dia a dia — e como resolvemos
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {pains.map((p, i) => (
                  <motion.article
                    key={p.title}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="p-6 rounded-xl border bg-card"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <p.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{p.desc}</p>
                    <p className="text-sm flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{p.fix}</span>
                    </p>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          {/* RECURSOS */}
          <section className="py-20 border-t bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-12">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Recursos</span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Tudo que uma barbearia precisa em um sistema só
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="p-6 rounded-xl border bg-card"
                  >
                    <f.icon className="h-5 w-5 text-primary mb-4" />
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* COMO FUNCIONA */}
          <section className="py-20 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-12">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Como funciona</span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Sua barbearia recebendo agendamentos no mesmo dia
                </h2>
              </div>
              <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {steps.map((s, i) => (
                  <motion.li
                    key={s.n}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="p-6 rounded-xl border bg-card"
                  >
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-4">
                      {s.n}
                    </span>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </motion.li>
                ))}
              </ol>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-20 border-t bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-12">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Dúvidas frequentes</span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Perguntas de donos de barbearia
                </h2>
              </div>
              <div className="max-w-3xl mx-auto space-y-4">
                {faqs.map((f) => (
                  <div key={f.q} className="p-6 rounded-xl border bg-card">
                    <h3 className="font-semibold mb-2">{f.q}</h3>
                    <p className="text-sm text-muted-foreground">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative border-t">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 pointer-events-none" />
            <div className="container mx-auto px-4 relative text-center max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Pronto para organizar sua barbearia?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Crie a página de agendamento da sua barbearia e comece a receber clientes hoje mesmo.
              </p>
              <Link to="/comprar">
                <Button size="lg" className="text-base px-10 gap-2 platform-btn-primary">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
              <Link to="/explorar" className="hover:text-foreground transition-colors">Explorar empresas</Link>
              <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            </div>
            <p>© {new Date().getFullYear()} Zaro Sistemas. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BarbeariaLandingPage;
