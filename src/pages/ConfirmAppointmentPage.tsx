import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const ConfirmAppointmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) { setStatus("error"); setMessage("ID inválido"); return; }

    const confirm = async () => {
      const { data, error } = await supabase
        .from("appointments" as any)
        .select("id, status, attendance_confirmation_status")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setStatus("error");
        setMessage("Agendamento não encontrado.");
        return;
      }

      if ((data as any).attendance_confirmation_status === "confirmed") {
        setStatus("already");
        setMessage("Presença já confirmada anteriormente!");
        return;
      }

      const { error: updateErr } = await supabase
        .from("appointments" as any)
        .update({
          attendance_confirmation_status: "confirmed",
          status: "confirmado",
        } as any)
        .eq("id", id);

      if (updateErr) {
        setStatus("error");
        setMessage("Erro ao confirmar. Tente novamente.");
      } else {
        setStatus("success");
        setMessage("Presença confirmada com sucesso! ✅");
      }
    };
    confirm();
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Confirmando presença...</p>
          </>
        )}
        {(status === "success" || status === "already") && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Obrigado! Nos vemos em breve. 😄</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Erro</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmAppointmentPage;
