import { useState } from "react";
import { HelpCircle, X, PlayCircle, BookOpen, Clock, Users, Calendar, Share2, MessageSquare, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
const helpArticles = [
  {
    id: "services",
    icon: BookOpen,
    emoji: "📘",
    title: "Como criar serviços",
    content: `Para criar um serviço, acesse o menu "Serviços" no painel lateral.\n\n1. Clique em "Novo Serviço"\n2. Preencha o nome, preço e duração\n3. Clique em "Salvar"\n\nSeus clientes verão os serviços disponíveis na página de agendamento.`,
  },
  {
    id: "schedule",
    icon: Clock,
    emoji: "📘",
    title: "Como configurar horários",
    content: `Acesse o menu "Horários" para definir os dias e horários de funcionamento.\n\n1. Selecione o profissional\n2. Defina os horários de início e fim para cada dia da semana\n3. Desative os dias que não atende\n\nOs horários configurados serão usados para exibir os slots disponíveis.`,
  },
  {
    id: "professionals",
    icon: Users,
    emoji: "📘",
    title: "Como adicionar profissionais",
    content: `No menu "Equipe", você pode gerenciar seus profissionais.\n\n1. Clique em "Adicionar Profissional"\n2. Preencha o nome e especialidade\n3. Opcionalmente adicione uma foto\n4. Configure os horários de atendimento\n\nCada profissional terá sua própria agenda.`,
  },
  {
    id: "appointments",
    icon: Calendar,
    emoji: "📘",
    title: "Como receber agendamentos",
    content: `Após configurar serviços e profissionais, sua página de agendamentos estará pronta.\n\n1. Compartilhe o link da sua página com seus clientes\n2. Eles poderão escolher serviço, profissional, data e horário\n3. Você receberá notificações de novos agendamentos\n4. Gerencie tudo pelo menu "Agendamentos"`,
  },
  {
    id: "share",
    icon: Share2,
    emoji: "📘",
    title: "Como compartilhar sua página",
    content: `Para compartilhar sua página de agendamentos:\n\n1. Acesse "Landing Page" no menu\n2. Copie o link da sua página\n3. Compartilhe via WhatsApp, redes sociais ou QR Code\n4. Use o menu "QR Code" para gerar um código visual\n\nSeus clientes poderão agendar diretamente pelo link.`,
  },
];

const normalizeVideoUrl = (url: string): string => {
  // Google Drive: convert /view to /preview for embedding
  if (url.includes("drive.google.com")) {
    return url.replace(/\/view(\?.*)?$/, "/preview");
  }
  return url;
};

const VideoEmbed = ({ url }: { url: string }) => {
  if (!url) return null;

  const normalized = normalizeVideoUrl(url);

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        className="w-full aspect-video rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        className="w-full aspect-video rounded-lg"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Google Drive
  if (url.includes("drive.google.com")) {
    return (
      <div className="space-y-2">
        <iframe
          src={normalized}
          className="w-full aspect-video rounded-lg"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
        <button
          onClick={() => window.open(url, "_blank")}
          className="text-xs text-primary hover:underline"
        >
          Abrir no Google Drive ↗
        </button>
      </div>
    );
  }

  // MP4
  if (url.endsWith(".mp4")) {
    return <video src={url} controls className="w-full aspect-video rounded-lg" />;
  }

  // Fallback: open externally
  return (
    <button
      onClick={() => window.open(url, "_blank")}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-6 text-sm text-primary hover:bg-primary/5 transition-colors"
    >
      <PlayCircle className="h-5 w-5" />
      Assistir vídeo ↗
    </button>
  );
};

interface HelpCenterProps {
  onRestartTour?: () => void;
}

const HelpCenter = ({ onRestartTour }: HelpCenterProps) => {
  const [open, setOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const { tenant } = useTenant();

  const { data: helpVideoUrl } = useQuery({
    queryKey: ["help-video-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "help_video_url")
        .maybeSingle();
      return data?.value || "";
    },
  });

  const { data: supportWhatsapp } = useQuery({
    queryKey: ["help-support-whatsapp"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "help_support_whatsapp")
        .maybeSingle();
      return data?.value || "";
    },
  });

  const article = helpArticles.find((a) => a.id === selectedArticle);

  const handleRestartTour = () => {
    if (tenant?.id) {
      localStorage.removeItem(`zaro_tour_done_${tenant.id}`);
    }
    setOpen(false);
    if (onRestartTour) {
      onRestartTour();
    }
  };

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">Ajuda</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-xl">Central de Ajuda Zaro</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {selectedArticle ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {article && <article.icon className="h-5 w-5 text-primary" />}
                    {article?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {article?.content}
                  </p>
                </div>
              ) : (
                <>
                  {/* Video section */}
                  {helpVideoUrl && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-primary" />
                        📺 Vídeo explicativo do sistema
                      </h3>
                      <VideoEmbed url={helpVideoUrl} />
                    </div>
                  )}

                  {/* Help articles */}
                  <div className="space-y-1">
                    {helpArticles.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedArticle(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted transition-colors group"
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <span className="flex-1 text-sm font-medium">{item.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    ))}
                  </div>

                  {/* Restart tutorial */}
                  <div className="pt-2 border-t">
                    <button
                      onClick={handleRestartTour}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted transition-colors group"
                    >
                      <span className="text-lg">🎯</span>
                      <span className="flex-1 text-sm font-medium">Ver tutorial novamente</span>
                      <RotateCcw className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </div>

                  {/* Support */}
                  <div className="pt-2 border-t">
                    {supportWhatsapp ? (
                      <button
                        onClick={() => {
                          window.open(`https://api.whatsapp.com/send?phone=${supportWhatsapp}&text=Preciso de ajuda com o Zaro`, "_blank");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted transition-colors group"
                      >
                        <span className="text-lg">💬</span>
                        <span className="flex-1 text-sm font-medium">Suporte via WhatsApp</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    ) : (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        Suporte indisponível no momento.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default HelpCenter;
