import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Star, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminAvaliacoes = () => {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("reviews" as any)
        .select("*, appointments(client_name, appointment_date, barbers(name), services(name)), barbers(name)")
        .order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });

  const pendingReviews = reviews.filter((r: any) => !r.approved);
  const approvedReviews = reviews.filter((r: any) => r.approved);

  const avgRating = approvedReviews.length
    ? (approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
    : "—";

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("reviews" as any).update({ approved: true } as any).eq("id", id);
    if (error) {
      toast.error("Erro ao aprovar avaliação");
    } else {
      toast.success("Avaliação aprovada e publicada!");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("reviews" as any).update({ approved: false } as any).eq("id", id);
    if (error) {
      toast.error("Erro ao rejeitar avaliação");
    } else {
      toast.success("Avaliação removida da página pública");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir permanentemente esta avaliação?")) return;
    const { error } = await supabase.from("reviews" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir avaliação");
    } else {
      toast.success("Avaliação excluída");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    }
  };

  const ReviewCard = ({ r, showActions = true }: { r: any; showActions?: boolean }) => (
    <div className="p-5 rounded-lg border bg-card">
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
                <>com {r.barbers?.name} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showActions && !r.approved && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleApprove(r.id)} title="Aprovar">
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {showActions && r.approved && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600" onClick={() => handleReject(r.id)} title="Despublicar">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)} title="Excluir">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
      {r.comment && <p className="mt-3 text-sm text-muted-foreground ml-13">{r.comment}</p>}
    </div>
  );

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
          {approvedReviews.length} publicadas · Média: <span className="font-semibold text-foreground">{avgRating} ★</span>
        </div>
      </div>

      <Tabs defaultValue={pendingReviews.length > 0 ? "pending" : "approved"}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-3.5 w-3.5" /> Pendentes
            {pendingReviews.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{pendingReviews.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-3.5 w-3.5" /> Aprovadas ({approvedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingReviews.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Nenhuma avaliação pendente de aprovação.</p>
          ) : (
            pendingReviews.map((r: any) => <ReviewCard key={r.id} r={r} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {approvedReviews.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Nenhuma avaliação aprovada ainda.</p>
          ) : (
            approvedReviews.map((r: any) => <ReviewCard key={r.id} r={r} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAvaliacoes;
