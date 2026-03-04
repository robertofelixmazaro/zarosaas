import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Store, Users, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";

const LandingPage = () => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <img src={zaroLogo} alt="Zaro Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold tracking-tight">ZARO AGENDAMENTOS</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/entrar">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastrar">
              <Button size="sm">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="py-24 text-center overflow-hidden">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
          >
            Sistema Completo de<br />Agendamentos para Todo<br />Tipo de Negócio
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto"
          >
            Agendamentos online, gestão de equipe, produtos e relatórios. Ideal para barbearias, salões, clínicas, estúdios e muito mais.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/cadastrar">
              <Button size="lg" className="text-base px-8 gap-2">
                Começar Agora <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Calendar, title: "Agendamentos Online", desc: "Seus clientes agendam 24h pelo site" },
              { icon: Users, title: "Gestão de Equipe", desc: "Controle profissionais, horários e disponibilidade" },
              { icon: Store, title: "Loja de Produtos", desc: "Venda produtos direto pelo site" },
              { icon: Shield, title: "Multi-Tenant Seguro", desc: "Cada negócio com dados isolados" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tenant list */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-3">Negócios Cadastrados</h2>
            <p className="text-muted-foreground">Encontre seu negócio ou crie o seu</p>
          </motion.div>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Carregando...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Nenhum negócio cadastrado ainda.{" "}
              <Link to="/novo-negocio" className="text-primary underline">Seja o primeiro!</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {tenants.map((t: any, i: number) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    to={`/t/${t.slug}`}
                    className="block p-6 rounded-lg border bg-card hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-4">
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
                    {t.address && <p className="text-sm text-muted-foreground">{t.address}</p>}
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                      Visitar <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 ZARO AGENDAMENTOS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
