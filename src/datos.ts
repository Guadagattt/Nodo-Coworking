// DATOS SIMULADOS EN MEMORIA (en el sistema real vendrían de PostgreSQL con TypeORM).
// Se reinician cada vez que se reinicia el servidor.
import { Reserva } from "./disponibilidad";

export interface Sede { id: number; nombre: string; direccion: string }
export interface Sala { id: number; sedeId: number; nombre: string; capacidad: number }
export interface Plan { id: number; nombre: string; horasSala: number; precioMensual: number }
export interface Socio {
  id: number;
  nombre: string;
  email: string;
  password: string; // DEMO: en el sistema real se guarda un hash (bcrypt), nunca el texto plano
  rol: "socio" | "admin";
}
export interface Membresia { id: number; socioId: number; planId: number; desde: string; hasta: string }

export const sedes: Sede[] = [{ id: 1, nombre: "Nodo Centro", direccion: "Av. Colón 1234, Córdoba" }];

export const salas: Sala[] = [
  { id: 1, sedeId: 1, nombre: "Sala Córdoba", capacidad: 8 },
  { id: 2, sedeId: 1, nombre: "Sala Sierras", capacidad: 6 },
  { id: 3, sedeId: 1, nombre: "Sala Lago", capacidad: 4 },
];

export const planes: Plan[] = [
  { id: 1, nombre: "Plan Flex", horasSala: 5, precioMensual: 60 },
  { id: 2, nombre: "Plan Pro", horasSala: 20, precioMensual: 120 },
  { id: 3, nombre: "Plan Equipo", horasSala: 40, precioMensual: 250 },
];

export const socios: Socio[] = [
  { id: 1, nombre: "Valentina", email: "valentina@nodo.com", password: "admin123", rol: "admin" },
  { id: 2, nombre: "Sofía Paredes", email: "sofia@nodo.com", password: "sofia123", rol: "socio" },
  { id: 3, nombre: "Martín Gómez", email: "martin@nodo.com", password: "martin123", rol: "socio" },
  { id: 4, nombre: "Lucía Ferreyra", email: "lucia@nodo.com", password: "lucia123", rol: "socio" },
];

export const membresias: Membresia[] = [
  { id: 1, socioId: 2, planId: 2, desde: "2026-01-01", hasta: "2026-12-31" },
  { id: 2, socioId: 3, planId: 1, desde: "2026-03-01", hasta: "2026-12-31" },
  { id: 3, socioId: 4, planId: 3, desde: "2026-06-01", hasta: "2027-05-31" },
];

// Sofía tiene 8 h usadas en noviembre → le quedan 12 h de 20 (como en el prototipo)
export const reservas: Reserva[] = [
  { id: 1, salaId: 1, socioId: 3, fecha: "2026-11-20", inicio: "10:00", fin: "11:00", estado: "confirmada" },
  { id: 2, salaId: 1, socioId: 4, fecha: "2026-11-20", inicio: "14:00", fin: "16:00", estado: "confirmada" },
  { id: 3, salaId: 2, socioId: 4, fecha: "2026-11-20", inicio: "09:00", fin: "10:30", estado: "confirmada" },
  { id: 4, salaId: 2, socioId: 2, fecha: "2026-11-04", inicio: "09:00", fin: "12:00", estado: "confirmada" },
  { id: 5, salaId: 3, socioId: 2, fecha: "2026-11-10", inicio: "14:00", fin: "17:00", estado: "confirmada" },
  { id: 6, salaId: 1, socioId: 2, fecha: "2026-11-19", inicio: "15:00", fin: "17:00", estado: "confirmada" },
  { id: 7, salaId: 3, socioId: 3, fecha: "2026-11-19", inicio: "09:00", fin: "10:00", estado: "cancelada" },
];

let ultimoId = reservas.length;
export function nuevoIdReserva(): number {
  return ++ultimoId;
}
