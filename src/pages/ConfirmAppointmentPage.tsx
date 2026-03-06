import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const ConfirmAppointmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) { setStatus("error"); setMessage("ID inválido"); return; }

    const confirm = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-appointment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ appointment_id: id, action: "confirm" }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.already) {
            setStatus("already");
            setMessage("Presença já confirmada anteriormente!");
          } else {
            setStatus("error");
            setMessage(data.error || "Erro ao confirmar.");
          }
        } else {
          setStatus("success");
          setMessage("Presença confirmada com sucesso! ✅");
        }
      } catch {
        setStatus("error");
        setMessage("Erro de conexão. Tente novamente.");
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
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
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
