import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminAvaliacoes = () => {
  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews" as any)
        .select("*, appointments(client_name, appointment_date, barbers(name), services(name)), barbers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reviews" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir avaliação");
    } else {
      toast.success("Avaliação excluída");
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Avaliações</h2>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Avaliações</h2>
        <div className="text-sm text-muted-foreground">
          {reviews.length} avaliações · Média: <span className="font-semibold text-foreground">{avgRating} ★</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Nenhuma avaliação recebida ainda.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="p-5 rounded-lg border bg-card">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  {r.client_photo_url ? (
                    <img src={r.client_photo_url} alt={r.client_name || "Cliente"} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {(r.client_name || r.appointments?.client_name || "?")?.[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("h-4 w-4", s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")} />
                      ))}
                    </div>
                    <p className="font-medium text-sm">{r.client_name || r.appointments?.client_name || "Cliente"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.appointments ? (
                        <>{r.appointments.services?.name} com {r.appointments.barbers?.name} · {r.appointments.appointment_date}</>
                      ) : (
                        <>com {r.barbers?.name} · Avaliação direta</>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              {r.comment && <p className="mt-3 text-sm text-muted-foreground ml-13">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAvaliacoes;
