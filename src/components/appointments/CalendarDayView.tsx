import { DbAppointment } from "@/lib/api";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import { cn } from "@/lib/utils";

interface Props {
  date: string; // yyyy-MM-dd
  appointments: DbAppointment[];
  onClickAppointment: (a: DbAppointment) => void;
  onClickSlot: (time: string) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

const CalendarDayView = ({ date, appointments, onClickAppointment, onClickSlot }: Props) => {
  const dayAppts = appointments
    .filter((a) => a.appointment_date === date && (a.status as string) !== "cancelado")
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const getAppointmentsForHour = (hour: number) => {
    const hStr = hour.toString().padStart(2, "0");
    return dayAppts.filter((a) => a.appointment_time.startsWith(hStr + ":"));
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const appts = getAppointmentsForHour(hour);
          const timeStr = `${hour.toString().padStart(2, "0")}:00`;
          return (
            <div
              key={hour}
              className="flex min-h-[60px] hover:bg-muted/20 transition-colors cursor-pointer group"
              onClick={() => !appts.length && onClickSlot(timeStr)}
            >
              <div className="w-20 flex-shrink-0 p-3 text-sm font-medium text-muted-foreground border-r bg-muted/30">
                {timeStr}
              </div>
              <div className="flex-1 p-2 space-y-1">
                {appts.length > 0 ? (
                  appts.map((a) => (
                    <div
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); onClickAppointment(a); }}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm cursor-pointer transition-all hover:shadow-md border-l-4",
                        a.status === "confirmado" && "bg-info/5 border-l-info",
                        a.status === "pendente" && "bg-warning/5 border-l-warning",
                        a.status === "concluido" && "bg-success/5 border-l-success",
                        (a.status as string) === "no_show" && "bg-muted border-l-muted-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{a.client_name}</span>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{a.services?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{a.appointment_time?.slice(0, 5)}</span>
                          <AppointmentStatusBadge status={a.status} />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.barbers?.name} · R$ {Number(a.price).toFixed(0)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors pt-1">
                    Clique para agendar
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarDayView;
