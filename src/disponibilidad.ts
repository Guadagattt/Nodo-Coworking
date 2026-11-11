// REGLA DE NEGOCIO (separada del servidor para poder probarla sola con Jest)

export interface Reserva {
  id: number;
  salaId: number;
  fecha: string;  // "2026-11-20"
  inicio: string; // "10:00"
  fin: string;    // "11:00"
}

// Convierte "10:30" en minutos desde medianoche (630) para poder comparar números
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Dos intervalos se superponen si cada uno empieza antes de que termine el otro.
// Si uno termina justo cuando empieza el otro (11:00 y 11:00), NO se superponen.
export function seSuperponen(
  inicioA: string, finA: string,
  inicioB: string, finB: string
): boolean {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(finA) > aMinutos(inicioB);
}

// Devuelve las reservas que chocan con el horario pedido (lista vacía = sala libre)
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
      seSuperponen(inicio, fin, r.inicio, r.fin)
  );
}
