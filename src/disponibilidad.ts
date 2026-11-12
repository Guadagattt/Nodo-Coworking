// REGLA DE NEGOCIO (separada del servidor para poder probarla sola con Jest)

export interface Reserva {
  id: number;
  salaId: number;
  socioId?: number;
  fecha: string;  // "2026-11-20"
  inicio: string; // "10:00"
  fin: string;    // "11:00"
  estado?: "confirmada" | "cancelada";
}

// Convierte "10:30" en minutos desde medianoche (630) para poder comparar números
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Convierte minutos desde medianoche en "HH:MM"
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Dos intervalos se superponen si cada uno empieza antes de que termine el otro.
// Si uno termina justo cuando empieza el otro (11:00 y 11:00), NO se superponen.
export function seSuperponen(
  inicioA: string, finA: string,
  inicioB: string, finB: string
): boolean {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(finA) > aMinutos(inicioB);
}

// Devuelve las reservas activas que chocan con el horario pedido (lista vacía = sala libre)
export function buscarConflictos(
  reservas: Reserva[],
  salaId: number,
  fecha: string,
  inicio: string,
  fin: string
): Reserva[] {
  return reservas.filter(
    (r) =>
      r.salaId === salaId &&
      r.fecha === fecha &&
      r.estado !== "cancelada" &&
      seSuperponen(inicio, fin, r.inicio, r.fin)
  );
}

// Horario comercial (supuesto de la propuesta: lunes a viernes de 8 a 20 h)
export const APERTURA = 8 * 60;
export const CIERRE = 20 * 60;

// Busca hasta `cantidad` horarios libres de la misma duración, los más cercanos al pedido
export function horariosCercanos(
  reservas: Reserva[],
  salaId: number,
  fecha: string,
  inicio: string,
  fin: string,
  cantidad = 3
): { inicio: string; fin: string }[] {
  const duracion = aMinutos(fin) - aMinutos(inicio);
  const pedido = aMinutos(inicio);
  const candidatos: number[] = [];
  for (let m = APERTURA; m + duracion <= CIERRE; m += 30) {
    if (m === pedido) continue;
    const libre = buscarConflictos(reservas, salaId, fecha, aHora(m), aHora(m + duracion)).length === 0;
    if (libre) candidatos.push(m);
  }
  return candidatos
    .sort((a, b) => Math.abs(a - pedido) - Math.abs(b - pedido) || a - b)
    .slice(0, cantidad)
    .sort((a, b) => a - b)
    .map((m) => ({ inicio: aHora(m), fin: aHora(m + duracion) }));
}
