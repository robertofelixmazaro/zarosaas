import { DbAppointment } from "@/lib/api";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, MessageCircle } from "lucide-react";
import { deleteAppointment } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  appointments: DbAppointment[];
  isAdmin: boolean;
  onClickAppointment: (a: DbAppointment) => void;
  onStatusChange: (id: string, status: string) => void;
  onRefresh: () => void;
}

const AppointmentListView = ({ appointments, isAdmin, onClickAppointment, onStatusChange, onRefresh }: Props) => {
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
      await deleteAppointment(id);
      toast.success("Agendamento excluído");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    }
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Serviço</th>
              {isAdmin && <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Profissional</th>}
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onClickAppointment(a)}>
                <td className="p-4">
                  <div className="font-medium text-sm">{a.client_name}</div>
                  <div className="text-xs text-muted-foreground">{a.client_phone}</div>
                </td>
                <td className="p-4 text-sm">{a.services?.name}</td>
                {isAdmin && <td className="p-4 text-sm">{a.barbers?.name}</td>}
                <td className="p-4 text-sm">
                  {a.appointment_date}
                  <br />
                  <span className="text-muted-foreground">{a.appointment_time?.slice(0, 5)}</span>
                </td>
                <td className="p-4"><AppointmentStatusBadge status={a.status} /></td>
                <td className="p-4 font-semibold text-sm">R$ {Number(a.price).toFixed(0)}</td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Confirmar" onClick={() => onStatusChange(a.id, "confirmado")}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar" onClick={() => onStatusChange(a.id, "cancelado")}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                    {a.status === "cancelado" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp" onClick={() => window.open(`https://wa.me/${a.client_phone.replace(/\D/g, "")}`, "_blank")}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {appointments.length === 0 && <div className="text-center py-10 text-muted-foreground">Nenhum agendamento encontrado.</div>}
    </div>
  );
};

export default AppointmentListView;
