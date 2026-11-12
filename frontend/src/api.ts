// Cliente HTTP mínimo: agrega el token y convierte los errores de la API en excepciones
export interface Usuario { id: number; nombre: string; email: string; rol: "socio" | "admin" }
export interface Membresia {
  plan: string; horasIncluidas: number; horasUsadas: number; horasDisponibles: number;
  mes: string; vigencia: { desde: string; hasta: string };
}
export interface Sala { id: number; nombre: string; capacidad: number; sede?: string }
export interface Franja { inicio: string; fin: string }
export interface Disponibilidad {
  sala: string; fecha: string; inicio: string; fin: string;
  disponible: boolean; conflictos: Franja[]; sugerencias: Franja[];
}
export interface Reserva {
  id: number; salaId: number; socioId: number; fecha: string; inicio: string; fin: string;
  estado: "confirmada" | "cancelada"; sala: string; socio: string; horas: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public datos: any) { super(message); }
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, datos.error ?? "Error inesperado", datos);
  return datos as T;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const dia = DIAS[new Date(a, m - 1, d).getDay()];
  return `${dia} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const horas = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} h`;
