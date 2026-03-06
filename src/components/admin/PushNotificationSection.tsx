import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const PushNotificationSection = () => {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notificações Push</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Notificações push não estão disponíveis neste navegador. Instale o aplicativo para receber notificações.
        </p>
      </div>
    );
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await subscribe();
      if (ok) toast.success("Notificações ativadas!");
      else toast.error("Não foi possível ativar notificações. Verifique as permissões do navegador.");
    } else {
      await unsubscribe();
      toast.info("Notificações desativadas.");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5" />
        <h3 className="font-semibold">Notificações Push</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Receba notificações no celular quando um novo agendamento for realizado.
      </p>
      <div className="flex items-center gap-3">
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
        <span className="text-sm font-medium">
          {isSubscribed ? "Notificações ativadas" : "Ativar notificações"}
        </span>
      </div>
    </div>
  );
};

export default PushNotificationSection;
