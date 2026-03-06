import { useState } from "react";
import { Share2, Copy, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface ShareButtonProps {
  url: string;
  title?: string;
  className?: string;
}

const ShareButton = ({ url, title = "Confira este negócio!", className }: ShareButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setOpen(false);
      } catch {
        // user cancelled
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
      setOpen(false);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={className} title="Compartilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <div className="space-y-1">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            Copiar link
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-green-500" />
            WhatsApp
          </button>
          {typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Mais opções
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareButton;
