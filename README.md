# PoC – Nodo Coworking: disponibilidad de salas

Prueba de concepto del endpoint que consulta si una sala de reuniones está disponible en una fecha y horario.

**Datos:** simulados y almacenados en memoria (no hay base de datos real en esta PoC).
**Stack:** Node.js + TypeScript + Express.

## Cómo ejecutarla
```bash
npm install
npm run dev
```
El servidor queda en `http://localhost:3000`.

## Endpoint
`GET /salas/:id/disponibilidad?fecha=YYYY-MM-DD&inicio=HH:MM&fin=HH:MM`

**Regla de negocio:** una sala no puede estar disponible para dos reservas que se superponen.
Si una reserva termina justo cuando empieza otra (11:00 y 11:00), no se considera superposición.

### Ejemplo: sala ocupada
`GET /salas/1/disponibilidad?fecha=2026-11-20&inicio=10:30&fin=11:30`
```json
{
  "sala": "Sala Córdoba",
  "fecha": "2026-11-20",
  "inicio": "10:30",
  "fin": "11:30",
  "disponible": false,
  "conflictos": [{ "inicio": "10:00", "fin": "11:00" }]
}
```

### Ejemplo: sala libre
`GET /salas/1/disponibilidad?fecha=2026-11-20&inicio=11:00&fin=12:00` → `"disponible": true`

### Errores
| Caso | Código |
|---|---|
| Faltan parámetros, formato inválido o inicio >= fin | 400 |
| La sala no existe | 404 |

## Qué falta para una aplicación completa
Persistencia con PostgreSQL + TypeORM, endpoint para crear reservas, login y roles de socios, membresías y beneficios por plan, frontend, y despliegue en producción.
