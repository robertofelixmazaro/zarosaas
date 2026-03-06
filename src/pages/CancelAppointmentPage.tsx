import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CancelAppointmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "confirm" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");
  const [appointment, setAppointment] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) { setStatus("error"); setMessage("ID inválido"); return; }

    const load = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-appointment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ appointment_id: id, action: "check" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Agendamento não encontrado.");
          return;
        }
        if (data.status === "cancelado") {
          setStatus("already");
          setMessage("Este agendamento já foi cancelado.");
          return;
        }
        setAppointment(data);
        setStatus("confirm");
      } catch {
        setStatus("error");
        setMessage("Erro de conexão.");
      }
    };
    load();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-appointment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ appointment_id: id, action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Erro ao cancelar.");
      } else {
        setStatus("success");
        setMessage("Agendamento cancelado com sucesso.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão.");
    }
    setCancelling(false);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Carregando...</p>
          </>
        )}
        {status === "confirm" && appointment && (
          <>
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Cancelar Agendamento?</h1>
            <div className="text-muted-foreground space-y-1">
              <p><strong>{appointment.client_name}</strong></p>
              <p>📅 {formatDate(appointment.appointment_date)} às {appointment.appointment_time?.slice(0, 5)}</p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="destructive" disabled={cancelling} onClick={handleCancel}>
                {cancelling ? "Cancelando..." : "Sim, cancelar"}
              </Button>
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
          </>
        )}
        {status === "already" && (
          <>
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
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

export default CancelAppointmentPage;
