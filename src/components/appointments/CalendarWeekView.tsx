import { DbAppointment } from "@/lib/api";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  weekStart: Date;
  appointments: DbAppointment[];
  onClickAppointment: (a: DbAppointment) => void;
  onClickSlot: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const CalendarWeekView = ({ weekStart, appointments, onClickAppointment, onClickSlot }: Props) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppts = (dateStr: string, hour: number) => {
    const hStr = hour.toString().padStart(2, "0");
    return appointments
      .filter((a) => a.appointment_date === dateStr && a.appointment_time.startsWith(hStr + ":") && (a.status as string) !== "cancelado")
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-20 p-2 text-xs font-semibold text-muted-foreground">Hora</th>
            {days.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
              return (
                <th key={dateStr} className={cn("p-2 text-center text-xs font-semibold", isToday ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                  <div className="capitalize">{format(d, "EEE", { locale: ptBR })}</div>
                  <div className={cn("text-lg font-bold", isToday && "text-primary")}>{format(d, "dd")}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {HOURS.map((hour) => (
            <tr key={hour} className="divide-x">
              <td className="p-2 text-xs font-medium text-muted-foreground bg-muted/30 text-center">
                {hour.toString().padStart(2, "0")}:00
              </td>
              {days.map((d) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const appts = getAppts(dateStr, hour);
                return (
                  <td
                    key={dateStr}
                    className="p-1 align-top min-h-[50px] hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => !appts.length && onClickSlot(dateStr, `${hour.toString().padStart(2, "0")}:00`)}
                  >
                    {appts.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onClickAppointment(a); }}
                        className={cn(
                          "rounded px-1.5 py-1 text-xs mb-1 cursor-pointer truncate border-l-2",
                          a.status === "confirmado" && "bg-info/10 border-l-info text-info",
                          a.status === "pendente" && "bg-warning/10 border-l-warning text-warning",
                          a.status === "concluido" && "bg-success/10 border-l-success text-success",
                          (a.status as string) === "no_show" && "bg-muted border-l-muted-foreground text-muted-foreground",
                        )}
                      >
                        <div className="font-medium truncate">{a.appointment_time?.slice(0, 5)} {a.client_name}</div>
                        <div className="truncate text-[10px] opacity-75">{a.services?.name}</div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarWeekView;
