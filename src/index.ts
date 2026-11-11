import express, { Request, Response } from "express";
import { Reserva, aMinutos, buscarConflictos } from "./disponibilidad";

const app = express();
const PUERTO = 3000;

// DATOS SIMULADOS EN MEMORIA (en el sistema real vendrían de PostgreSQL con TypeORM)
const salas = [
  { id: 1, nombre: "Sala Córdoba", capacidad: 8 },
  { id: 2, nombre: "Sala Sierras", capacidad: 6 },
  { id: 3, nombre: "Sala Lago", capacidad: 4 },
];

const reservas: Reserva[] = [
  { id: 1, salaId: 1, fecha: "2026-11-20", inicio: "10:00", fin: "11:00" },
  { id: 2, salaId: 1, fecha: "2026-11-20", inicio: "14:00", fin: "16:00" },
  { id: 3, salaId: 2, fecha: "2026-11-20", inicio: "09:00", fin: "10:30" },
];

// GET /salas/:id/disponibilidad?fecha=2026-11-20&inicio=10:30&fin=11:30
app.get("/salas/:id/disponibilidad", (req: Request, res: Response) => {
  const salaId = Number(req.params.id);
  const { fecha, inicio, fin } = req.query as Record<string, string>;

  // 1) Validaciones de los datos que llegan
  if (!fecha || !inicio || !fin) {
    return res.status(400).json({ error: "Faltan parámetros: fecha, inicio y fin" });
  }
  const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
  const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatoFecha.test(fecha) || !formatoHora.test(inicio) || !formatoHora.test(fin)) {
    return res.status(400).json({ error: "Formato inválido. Usar fecha YYYY-MM-DD y hora HH:MM" });
  }
  if (aMinutos(inicio) >= aMinutos(fin)) {
    return res.status(400).json({ error: "La hora de inicio debe ser anterior a la de fin" });
  }

  // 2) La sala tiene que existir
  const sala = salas.find((s) => s.id === salaId);
  if (!sala) {
    return res.status(404).json({ error: "La sala no existe" });
  }

  // 3) Regla de negocio: no puede haber reservas superpuestas
  const conflictos = buscarConflictos(reservas, salaId, fecha, inicio, fin);
  const disponible = conflictos.length === 0;

  return res.status(200).json({
    sala: sala.nombre,
    fecha,
    inicio,
    fin,
    disponible,
    conflictos: conflictos.map((c) => ({ inicio: c.inicio, fin: c.fin })),
  });
});

app.listen(PUERTO, () => {
  console.log(`PoC Nodo Coworking escuchando en http://localhost:${PUERTO}`);
});
