import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { statusConfig } from "./AppointmentStatusBadge";
import { DbBarber, DbService } from "@/lib/api";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: string;
  onStatusChange: (v: string) => void;
  filterBarberId: string;
  onBarberChange: (v: string) => void;
  filterServiceId: string;
  onServiceChange: (v: string) => void;
  dateFrom: Date | undefined;
  onDateFromChange: (d: Date | undefined) => void;
  dateTo: Date | undefined;
  onDateToChange: (d: Date | undefined) => void;
  barbers: DbBarber[];
  services: DbService[];
}

const AppointmentFilters = ({
  search, onSearchChange,
  filterStatus, onStatusChange,
  filterBarberId, onBarberChange,
  filterServiceId, onServiceChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  barbers, services,
}: Props) => {
  const hasFilters = filterStatus !== "todos" || filterBarberId !== "todos" || filterServiceId !== "todos" || dateFrom || dateTo;

  const clearFilters = () => {
    onStatusChange("todos");
    onBarberChange("todos");
    onServiceChange("todos");
    onDateFromChange(undefined);
    onDateToChange(undefined);
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou serviço..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBarberId} onValueChange={onBarberChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos profissionais</SelectItem>
            {barbers.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterServiceId} onValueChange={onServiceChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos serviços</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-sm">até</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
};

export default AppointmentFilters;
