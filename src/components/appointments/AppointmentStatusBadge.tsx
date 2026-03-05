import { Badge } from "@/components/ui/badge";

export const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Agendado", className: "bg-warning/10 text-warning border-warning/20" },
  confirmado: { label: "Confirmado", className: "bg-info/10 text-info border-info/20" },
  concluido: { label: "Concluído", className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  no_show: { label: "Não compareceu", className: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

export const allStatuses = ["pendente", "confirmado", "concluido", "cancelado", "no_show"] as const;

interface Props {
  status: string;
}

const AppointmentStatusBadge = ({ status }: Props) => {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

export default AppointmentStatusBadge;
