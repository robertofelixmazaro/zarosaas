import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Star, Scissors, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompletedAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  barbers: { name: string } | null;
  services: { name: string } | null;
  reviewed?: boolean;
}

const MinhasAvaliacoes = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["my-completed-appointments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, barbers(name), services(name)")
        .eq("client_user_id", user.id)
        .eq("status", "concluido")
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reviews" as any)
        .select("appointment_id")
        .eq("client_user_id", user.id);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const reviewedIds = new Set(existingReviews.map((r: any) => r.appointment_id));

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const unreviewed = appointments.filter((a: any) => !reviewedIds.has(a.id));
  const reviewed = appointments.filter((a: any) => reviewedIds.has(a.id));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-4 h-16 px-4">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <Scissors className="h-5 w-5" />
          <span className="font-bold tracking-tight">Minhas Avaliações</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Star className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum atendimento concluído para avaliar.</p>
            <Link to="/agendar"><Button>Agendar Horário</Button></Link>
          </div>
        ) : (
          <div className="space-y-8">
            {unreviewed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Pendentes de avaliação</h2>
                <div className="space-y-4">
                  {unreviewed.map((a: any) => (
                    <ReviewCard key={a.id} appointment={a} userId={user.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-reviews"] })} />
                  ))}
                </div>
              </div>
            )}
            {reviewed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Já avaliados</h2>
                <div className="space-y-3">
                  {reviewed.map((a: any) => (
                    <div key={a.id} className="p-4 rounded-lg border bg-card flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.services?.name} com {a.barbers?.name}</p>
                        <p className="text-xs text-muted-foreground">{a.appointment_date}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Avaliado ✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

function ReviewCard({ appointment, userId, onSuccess }: { appointment: any; userId: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      // Fetch appointment details including tenant_id and barber_id
      const { data: apptData } = await supabase
        .from("appointments")
        .select("barber_id, tenant_id")
        .eq("id", appointment.id)
        .single();
      
      if (!apptData) throw new Error("Agendamento não encontrado");

      const { error } = await supabase.from("reviews" as any).insert({
        appointment_id: appointment.id,
        client_user_id: userId,
        barber_id: appointment.barber_id || apptData.barber_id,
        tenant_id: apptData.tenant_id,
        rating,
        comment: comment.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada! Obrigado pelo feedback.");
      onSuccess();
    },
    onError: () => toast.error("Erro ao enviar avaliação. Tente novamente."),
  });

  return (
    <div className="p-5 rounded-lg border bg-card space-y-4">
      <div>
        <p className="font-medium">{appointment.services?.name} com {appointment.barbers?.name}</p>
        <p className="text-sm text-muted-foreground">{appointment.appointment_date} às {appointment.appointment_time}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(s)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star className={cn("h-7 w-7 transition-colors", (hovered || rating) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Como foi sua experiência? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
      />
      <Button onClick={() => mutation.mutate()} disabled={rating === 0 || mutation.isPending} className="w-full">
        {mutation.isPending ? "Enviando..." : "Enviar Avaliação"}
      </Button>
    </div>
  );
}

export default MinhasAvaliacoes;
