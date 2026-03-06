import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scissors, ChevronRight, Star, Home, Briefcase, Calendar, ShoppingBag, MessageSquare, Image, Phone, LogIn, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import ShareButton from "@/components/ShareButton";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";

interface PremiumNavbarProps {
  shopName?: string;
  logoUrl?: string;
  avgRating?: string;
  shareUrl?: string;
}

const menuItems = [
  { label: "Início", href: "#", icon: Home },
  { label: "Serviços", href: "#servicos", icon: Briefcase },
  { label: "Agendamento", href: "agendar", icon: Calendar, isRoute: true },
  { label: "Produtos", href: "#produtos", icon: ShoppingBag },
  { label: "Avaliações", href: "#avaliacoes", icon: MessageSquare },
  { label: "Galeria", href: "#galeria", icon: Image },
  { label: "Contato", href: "#contato", icon: Phone },
];

const PremiumNavbar = ({ shopName = "Meu Negócio", logoUrl, avgRating = "5.0", shareUrl }: PremiumNavbarProps) => {
  const { tenantSlug } = useTenant();
  const basePath = tenantSlug ? `/t/${tenantSlug}` : "";
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/70 backdrop-blur-xl border-b shadow-sm"
            : "bg-background/50 backdrop-blur-md"
        )}
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="text-lg font-bold tracking-tight">{shopName}</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            {menuItems.filter(i => !i.isRoute).map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.href); }}
                className="text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {shareUrl && <ShareButton url={shareUrl} title={shopName} />}
            <Link to={`${basePath}/agendar`} className="hidden sm:inline-flex">
              <Button size="sm" className="gap-1.5 font-semibold shadow-md shadow-primary/20">
                Agendar <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            >
              <div className="relative w-5 h-5">
                <span
                  className={cn(
                    "absolute left-0 w-5 h-[2px] bg-foreground rounded-full transition-all duration-300 ease-in-out",
                    isOpen ? "top-[9px] rotate-45" : "top-[3px] rotate-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[9px] w-5 h-[2px] bg-foreground rounded-full transition-all duration-300 ease-in-out",
                    isOpen ? "opacity-0 translate-x-2" : "opacity-100"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 w-5 h-[2px] bg-foreground rounded-full transition-all duration-300 ease-in-out",
                    isOpen ? "top-[9px] -rotate-45" : "top-[15px] rotate-0"
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Offcanvas Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[70] w-[300px] max-w-[85vw] bg-background border-l shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-bold tracking-tight">{shopName}</span>
          <button
            onClick={() => setIsOpen(false)}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Social proof badge */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{avgRating} de avaliação</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">+2.000 clientes</span>
          </div>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const content = (
                <span className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer">
                  <item.icon className="h-4.5 w-4.5 text-primary" />
                  {item.label}
                </span>
              );

              return (
                <li key={item.label}>
                  {item.isRoute ? (
                    <Link to={`${basePath}/${item.href}`} onClick={() => setIsOpen(false)}>
                      {content}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.href);
                      }}
                    >
                      {content}
                    </a>
                  )}
                </li>
              );
            })}

            {/* Separator */}
            <li className="my-3 border-t" />

            {/* Login */}
            <li>
              <Link to={`${basePath}/login`} onClick={() => setIsOpen(false)}>
                <span className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer">
                  <LogIn className="h-4.5 w-4.5 text-primary" />
                  Entrar
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* CTA */}
        <div className="p-4 border-t">
          <Link to={`${basePath}/agendar`} onClick={() => setIsOpen(false)}>
            <Button className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/25">
              Agendar Agora <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default PremiumNavbar;
