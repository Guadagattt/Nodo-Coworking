import express, { NextFunction, Request, Response, Router } from "express";
import { randomUUID } from "crypto";
import { APERTURA, CIERRE, aMinutos, buscarConflictos, horariosCercanos } from "./disponibilidad";
import { membresias, nuevoIdReserva, planes, reservas, salas, sedes, Socio, socios } from "./datos";

const app = express();
const PUERTO = Number(process.env.PORT) || 3000;
app.use(express.json());

const api = Router();

// ---------- Utilidades ----------
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

function validarHorario(fecha?: string, inicio?: string, fin?: string): string | null {
  if (!fecha || !inicio || !fin) return "Faltan parámetros: fecha, inicio y fin";
  if (!formatoFecha.test(fecha) || !formatoHora.test(inicio) || !formatoHora.test(fin)) {
    return "Formato inválido. Usar fecha YYYY-MM-DD y hora HH:MM";
  }
  if (aMinutos(inicio) >= aMinutos(fin)) return "La hora de inicio debe ser anterior a la de fin";
  return null;
}

function hoy(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function horasDe(inicio: string, fin: string): number {
  return (aMinutos(fin) - aMinutos(inicio)) / 60;
}

// Membresía vigente y saldo de horas del mes de `fecha`
function resumenMembresia(socioId: number, fecha = hoy()) {
  const m = membresias.find((x) => x.socioId === socioId && x.desde <= fecha && fecha <= x.hasta);
  if (!m) return null;
  const plan = planes.find((p) => p.id === m.planId)!;
  const mes = fecha.slice(0, 7);
  const usadas = reservas
    .filter((r) => r.socioId === socioId && r.estado !== "cancelada" && r.fecha.startsWith(mes))
    .reduce((total, r) => total + horasDe(r.inicio, r.fin), 0);
  return {
    plan: plan.nombre,
    horasIncluidas: plan.horasSala,
    horasUsadas: usadas,
    horasDisponibles: Math.max(plan.horasSala - usadas, 0),
    mes,
    vigencia: { desde: m.desde, hasta: m.hasta },
  };
}

function detalleReserva(r: (typeof reservas)[number]) {
  const sala = salas.find((s) => s.id === r.salaId);
  const socio = socios.find((s) => s.id === r.socioId);
  return { ...r, sala: sala?.nombre, socio: socio?.nombre, horas: horasDe(r.inicio, r.fin) };
}

// ---------- Autenticación (DEMO: tokens en memoria; en el sistema real, JWT con vencimiento) ----------
const sesiones = new Map<string, number>(); // token → socioId

interface ReqAuth extends Request { socio?: Socio }

function requiereLogin(req: ReqAuth, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const socioId = token ? sesiones.get(token) : undefined;
  const socio = socios.find((s) => s.id === socioId);
  if (!socio) return res.status(401).json({ error: "Tenés que iniciar sesión" });
  req.socio = socio;
  next();
}

function requiereAdmin(req: ReqAuth, res: Response, next: NextFunction) {
  if (req.socio?.rol !== "admin") return res.status(403).json({ error: "Solo la administradora puede ver esto" });
  next();
}

const publico = (s: Socio) => ({ id: s.id, nombre: s.nombre, email: s.email, rol: s.rol });

api.post("/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const socio = socios.find((s) => s.email === String(email).toLowerCase().trim() && s.password === password);
  if (!socio) return res.status(401).json({ error: "Email o contraseña incorrectos" });
  const token = randomUUID();
  sesiones.set(token, socio.id);
  res.json({ token, usuario: publico(socio) });
});

api.post("/auth/logout", requiereLogin, (req, res) => {
  sesiones.delete(req.headers.authorization!.replace("Bearer ", ""));
  res.status(204).end();
});

api.get("/me", requiereLogin, (req: ReqAuth, res) => {
  res.json({ usuario: publico(req.socio!), membresia: resumenMembresia(req.socio!.id) });
});

// ---------- Salas ----------
api.get("/salas", (_req, res) => {
  res.json(salas.map((s) => ({ ...s, sede: sedes.find((x) => x.id === s.sedeId)?.nombre })));
});

// PoC: GET /salas/:id/disponibilidad?fecha=2026-11-20&inicio=10:30&fin=11:30
api.get("/salas/:id/disponibilidad", (req: Request, res: Response) => {
  const salaId = Number(req.params.id);
  const { fecha, inicio, fin } = req.query as Record<string, string>;

  // 1) Validaciones de los datos que llegan
  const error = validarHorario(fecha, inicio, fin);
  if (error) return res.status(400).json({ error });

  // 2) La sala tiene que existir
  const sala = salas.find((s) => s.id === salaId);
  if (!sala) return res.status(404).json({ error: "La sala no existe" });

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
    sugerencias: disponible ? [] : horariosCercanos(reservas, salaId, fecha, inicio, fin),
  });
});

// Agenda del día de una sala (para dibujar la grilla de ocupación)
api.get("/salas/:id/agenda", (req, res) => {
  const salaId = Number(req.params.id);
  const fecha = String(req.query.fecha ?? "");
  if (!formatoFecha.test(fecha)) return res.status(400).json({ error: "Fecha inválida" });
  if (!salas.some((s) => s.id === salaId)) return res.status(404).json({ error: "La sala no existe" });
  res.json(
    reservas
      .filter((r) => r.salaId === salaId && r.fecha === fecha && r.estado !== "cancelada")
      .map((r) => ({ inicio: r.inicio, fin: r.fin }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
  );
});

// ---------- Reservas ----------
api.get("/reservas/mias", requiereLogin, (req: ReqAuth, res) => {
  res.json(
    reservas
      .filter((r) => r.socioId === req.socio!.id)
      .map(detalleReserva)
      .sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio))
  );
});

api.post("/reservas", requiereLogin, (req: ReqAuth, res) => {
  const { salaId, fecha, inicio, fin } = req.body ?? {};
  const error = validarHorario(fecha, inicio, fin);
  if (error) return res.status(400).json({ error });

  const sala = salas.find((s) => s.id === Number(salaId));
  if (!sala) return res.status(404).json({ error: "La sala no existe" });

  if (fecha < hoy()) return res.status(400).json({ error: "No se puede reservar en una fecha pasada" });
  const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    return res.status(400).json({ error: "Las salas se reservan de lunes a viernes" });
  }
  if (aMinutos(inicio) < APERTURA || aMinutos(fin) > CIERRE) {
    return res.status(400).json({ error: "El horario comercial es de 08:00 a 20:00" });
  }

  const conflictos = buscarConflictos(reservas, sala.id, fecha, inicio, fin);
  if (conflictos.length > 0) {
    return res.status(409).json({
      error: "La sala ya está reservada en ese horario",
      conflictos: conflictos.map((c) => ({ inicio: c.inicio, fin: c.fin })),
      sugerencias: horariosCercanos(reservas, sala.id, fecha, inicio, fin),
    });
  }

  // La administradora reserva sin descontar horas; los socios consumen las de su plan
  if (req.socio!.rol === "socio") {
    const resumen = resumenMembresia(req.socio!.id, fecha);
    if (!resumen) return res.status(403).json({ error: "No tenés una membresía vigente para esa fecha" });
    const horas = horasDe(inicio, fin);
    if (horas > resumen.horasDisponibles) {
      return res.status(403).json({
        error: `Te quedan ${resumen.horasDisponibles} h en tu plan y la reserva es de ${horas} h`,
      });
    }
  }

  const nueva = {
    id: nuevoIdReserva(),
    salaId: sala.id,
    socioId: req.socio!.id,
    fecha,
    inicio,
    fin,
    estado: "confirmada" as const,
  };
  reservas.push(nueva);
  res.status(201).json(detalleReserva(nueva));
});

api.delete("/reservas/:id", requiereLogin, (req: ReqAuth, res) => {
  const r = reservas.find((x) => x.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: "La reserva no existe" });
  if (r.socioId !== req.socio!.id && req.socio!.rol !== "admin") {
    return res.status(403).json({ error: "No podés cancelar reservas de otra persona" });
  }
  if (r.estado === "cancelada") return res.status(400).json({ error: "La reserva ya estaba cancelada" });
  r.estado = "cancelada";
  res.json(detalleReserva(r));
});

// ---------- Panel de administración ----------
api.get("/admin/reservas", requiereLogin, requiereAdmin, (_req, res) => {
  res.json(
    reservas.map(detalleReserva).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio))
  );
});

api.get("/admin/socios", requiereLogin, requiereAdmin, (_req, res) => {
  res.json(
    socios
      .filter((s) => s.rol === "socio")
      .map((s) => ({ ...publico(s), membresia: resumenMembresia(s.id) }))
  );
});

api.get("/admin/planes", requiereLogin, requiereAdmin, (_req, res) => {
  res.json(
    planes.map((p) => ({
      ...p,
      socios: membresias.filter((m) => m.planId === p.id).length,
    }))
  );
});

// La API responde tanto en /api/... (lo usa el frontend) como en la raíz (rutas originales de la PoC)
app.use("/api", api);
app.use("/", api);

app.listen(PUERTO, () => {
  console.log(`API Nodo Coworking escuchando en http://localhost:${PUERTO}`);
});
