export interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
  icone: string;
}

export interface Barber {
  id: string;
  nome: string;
  especialidade: string;
  foto: string;
  ativo: boolean;
  availability: BarberAvailability[];
}

export interface BarberAvailability {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}

export interface Appointment {
  id: string;
  clienteNome: string;
  clienteWhatsapp: string;
  barbeiro: string;
  servico: string;
  data: string;
  horario: string;
  status: "confirmado" | "cancelado" | "concluido" | "pendente";
  valor: number;
}

export interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  imagem: string;
}

export const services: Service[] = [
  { id: "1", nome: "Corte Masculino", preco: 45, duracao: 30, descricao: "Corte moderno com acabamento perfeito", icone: "✂️" },
  { id: "2", nome: "Barba", preco: 30, duracao: 20, descricao: "Barba modelada com toalha quente", icone: "🧔" },
  { id: "3", nome: "Corte + Barba", preco: 65, duracao: 50, descricao: "Combo completo com desconto", icone: "💈" },
  { id: "4", nome: "Degradê", preco: 55, duracao: 40, descricao: "Degradê com máquina e tesoura", icone: "🔥" },
  { id: "5", nome: "Pigmentação", preco: 80, duracao: 45, descricao: "Pigmentação capilar profissional", icone: "🎨" },
  { id: "6", nome: "Hidratação", preco: 40, duracao: 30, descricao: "Tratamento capilar completo", icone: "💧" },
];

export const barbers: Barber[] = [
  {
    id: "1", nome: "Caetano", especialidade: "Degradê & Cortes Modernos", foto: "", ativo: true,
    availability: [
      { diaSemana: 1, horaInicio: "08:00", horaFim: "18:00", ativo: true },
      { diaSemana: 2, horaInicio: "08:00", horaFim: "18:00", ativo: true },
      { diaSemana: 3, horaInicio: "08:00", horaFim: "18:00", ativo: true },
      { diaSemana: 4, horaInicio: "08:00", horaFim: "18:00", ativo: true },
      { diaSemana: 5, horaInicio: "08:00", horaFim: "17:00", ativo: true },
      { diaSemana: 6, horaInicio: "09:00", horaFim: "14:00", ativo: true },
    ],
  },
  {
    id: "2", nome: "Rafael", especialidade: "Barba & Acabamentos", foto: "", ativo: true,
    availability: [
      { diaSemana: 1, horaInicio: "09:00", horaFim: "19:00", ativo: true },
      { diaSemana: 2, horaInicio: "09:00", horaFim: "19:00", ativo: true },
      { diaSemana: 3, horaInicio: "09:00", horaFim: "19:00", ativo: true },
      { diaSemana: 4, horaInicio: "09:00", horaFim: "19:00", ativo: true },
      { diaSemana: 5, horaInicio: "09:00", horaFim: "17:00", ativo: true },
    ],
  },
  {
    id: "3", nome: "Lucas", especialidade: "Cortes Clássicos & Pigmentação", foto: "", ativo: true,
    availability: [
      { diaSemana: 1, horaInicio: "10:00", horaFim: "20:00", ativo: true },
      { diaSemana: 2, horaInicio: "10:00", horaFim: "20:00", ativo: true },
      { diaSemana: 3, horaInicio: "10:00", horaFim: "20:00", ativo: true },
      { diaSemana: 4, horaInicio: "10:00", horaFim: "20:00", ativo: true },
      { diaSemana: 5, horaInicio: "10:00", horaFim: "18:00", ativo: true },
      { diaSemana: 6, horaInicio: "10:00", horaFim: "15:00", ativo: true },
    ],
  },
];

export const appointments: Appointment[] = [
  { id: "1", clienteNome: "João Silva", clienteWhatsapp: "(11) 99999-0001", barbeiro: "Caetano", servico: "Corte Masculino", data: "2026-02-22", horario: "09:00", status: "confirmado", valor: 45 },
  { id: "2", clienteNome: "Pedro Santos", clienteWhatsapp: "(11) 99999-0002", barbeiro: "Rafael", servico: "Corte + Barba", data: "2026-02-22", horario: "10:00", status: "confirmado", valor: 65 },
  { id: "3", clienteNome: "Carlos Oliveira", clienteWhatsapp: "(11) 99999-0003", barbeiro: "Lucas", servico: "Degradê", data: "2026-02-22", horario: "11:00", status: "pendente", valor: 55 },
  { id: "4", clienteNome: "André Costa", clienteWhatsapp: "(11) 99999-0004", barbeiro: "Caetano", servico: "Barba", data: "2026-02-22", horario: "14:00", status: "concluido", valor: 30 },
  { id: "5", clienteNome: "Felipe Souza", clienteWhatsapp: "(11) 99999-0005", barbeiro: "Rafael", servico: "Pigmentação", data: "2026-02-22", horario: "15:00", status: "cancelado", valor: 80 },
  { id: "6", clienteNome: "Marcos Lima", clienteWhatsapp: "(11) 99999-0006", barbeiro: "Lucas", servico: "Hidratação", data: "2026-02-22", horario: "16:00", status: "confirmado", valor: 40 },
  { id: "7", clienteNome: "Ricardo Alves", clienteWhatsapp: "(11) 99999-0007", barbeiro: "Caetano", servico: "Corte + Barba", data: "2026-02-23", horario: "09:00", status: "confirmado", valor: 65 },
  { id: "8", clienteNome: "Bruno Ferreira", clienteWhatsapp: "(11) 99999-0008", barbeiro: "Rafael", servico: "Corte Masculino", data: "2026-02-23", horario: "10:30", status: "pendente", valor: 45 },
];

export const products: Product[] = [
  { id: "1", nome: "Pomada Modeladora", descricao: "Fixação forte, acabamento matte", preco: 45, estoque: 23, imagem: "" },
  { id: "2", nome: "Óleo para Barba", descricao: "Hidratação e brilho para barba", preco: 35, estoque: 15, imagem: "" },
  { id: "3", nome: "Shampoo Anti-Caspa", descricao: "Limpeza profunda e controle", preco: 28, estoque: 30, imagem: "" },
  { id: "4", nome: "Cera Capilar", descricao: "Fixação média, acabamento natural", preco: 38, estoque: 18, imagem: "" },
  { id: "5", nome: "Balm para Barba", descricao: "Hidratação e modelagem", preco: 42, estoque: 12, imagem: "" },
  { id: "6", nome: "Pós-Barba", descricao: "Refrescância e cicatrização", preco: 25, estoque: 40, imagem: "" },
];

export const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function generateTimeSlots(horaInicio: string, horaFim: string, duracaoMinutos: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = horaInicio.split(":").map(Number);
  const [endH, endM] = horaFim.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + duracaoMinutos <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += duracaoMinutos;
  }
  return slots;
}
