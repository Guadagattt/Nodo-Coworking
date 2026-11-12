# Nodo Coworking – Sistema de reservas de salas

Aplicación web para que los socios de Nodo Coworking reserven salas de reuniones sin superposiciones y controlen las horas incluidas en su plan, y para que la administradora vea reservas, socios y planes.

> **Estado:** prototipo navegable con **datos simulados en memoria**. Todavía no hay base de datos: al reiniciar el servidor, todo vuelve a los datos iniciales.
> La propuesta completa (negocio, alcance, reglas de prueba y herramientas) está en [`entregables/propuesta de presentacion.md`](entregables/propuesta%20de%20presentacion.md).

**Stack:** React 19 + Vite (frontend) · Node.js + TypeScript + Express (API) · Docker Compose (entorno local).

---

## Índice
1. [Cómo levantarlo](#1-cómo-levantarlo)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Backend: qué hace cada archivo](#3-backend-qué-hace-cada-archivo)
4. [API: endpoints](#4-api-endpoints)
5. [Frontend: qué hace cada archivo](#5-frontend-qué-hace-cada-archivo)
6. [Docker: qué hace cada archivo](#6-docker-qué-hace-cada-archivo)
7. [Flujo completo de una reserva](#7-flujo-completo-de-una-reserva)
8. [Limitaciones conocidas y próximos pasos](#8-limitaciones-conocidas-y-próximos-pasos)

---

## 1. Cómo levantarlo

### Con Docker (recomendado)
```bash
docker compose up --build --watch
```
- Web: **http://localhost:5173**
- API: **http://localhost:3000**
- Con `--watch`, los cambios en `src/` y `frontend/src/` se aplican solos, sin reiniciar.
- Para apagar: `Ctrl+C` y después `docker compose down`.

### Sin Docker (requiere Node.js 20 o superior)
```bash
npm install     # instala la raíz y, por el script postinstall, también frontend/
npm run dev     # levanta la API (3000) y la web (5173) juntas
```

> No levantes las dos formas a la vez, porque usan los mismos puertos.

### Cuentas de prueba
| Rol | Email | Contraseña | Plan |
|---|---|---|---|
| Administradora | valentina@nodo.com | admin123 | — |
| Socia | sofia@nodo.com | sofia123 | Pro: 20 h/mes (8 h usadas en noviembre) |
| Socio | martin@nodo.com | martin123 | Flex: 5 h/mes |
| Socia | lucia@nodo.com | lucia123 | Equipo: 40 h/mes |

### Scripts de `package.json` (raíz)
| Script | Qué hace |
|---|---|
| `npm run dev` | Corre `dev:api` y `dev:web` en paralelo con `concurrently`. |
| `npm run dev:api` | Levanta la API con `ts-node`, sin compilar antes. |
| `npm run dev:web` | Levanta el servidor de desarrollo de Vite en `frontend/`. |
| `npm run build` | Compila la API a `dist/` con `tsc` y genera el build de producción del frontend en `frontend/dist/`. |
| `npm start` | Ejecuta la API compilada (`node dist/index.js`). |

---

## 2. Estructura del proyecto

```
Nodo-Coworking/
├── src/                        ← BACKEND (API Express + TypeScript)
│   ├── index.ts                  servidor, autenticación y todos los endpoints
│   ├── disponibilidad.ts         reglas de negocio puras (superposición, horarios cercanos)
│   └── datos.ts                  datos simulados en memoria (sedes, salas, planes, socios, reservas)
├── frontend/                   ← FRONTEND (React + Vite)
│   ├── index.html                página base; carga la fuente Inter
│   ├── vite.config.ts            servidor de desarrollo y proxy /api → backend
│   ├── Dockerfile
│   └── src/
│       ├── main.tsx              punto de entrada: monta React, el router y la sesión
│       ├── App.tsx               rutas, encabezado y protección de páginas
│       ├── api.ts                cliente HTTP, tipos compartidos y formateo de fechas
│       ├── auth.tsx              contexto de sesión (usuario, membresía, login y logout)
│       ├── styles.css            sistema de diseño y estilos responsive
│       └── pages/
│           ├── Login.tsx         iniciar sesión
│           ├── Reservar.tsx      consultar disponibilidad y reservar
│           ├── MisReservas.tsx   próximas reservas, cancelación e historial
│           ├── MiMembresia.tsx   saldo de horas del plan
│           └── Admin.tsx         panel de la administradora
├── entregables/
│   └── propuesta de presentacion.md
├── Dockerfile                  imagen de la API
├── docker-compose.yml          levanta API + web juntas
├── package.json / tsconfig.json
└── .gitignore / .dockerignore
```

---

## 3. Backend: qué hace cada archivo

### `src/disponibilidad.ts`: reglas de negocio
Funciones **puras**: no dependen de Express ni de la base de datos, y por eso se pueden probar solas con Jest.

| Función | Qué hace |
|---|---|
| `aMinutos("10:30")` → `630` | Pasa una hora a minutos desde medianoche para poder comparar números. |
| `aHora(630)` → `"10:30"` | La conversión inversa. |
| `seSuperponen(iniA, finA, iniB, finB)` | **Regla central.** Devuelve `true` si cada intervalo empieza antes de que termine el otro: `iniA < finB && finA > iniB`. Por usar `<` estricto, los horarios consecutivos (uno termina 11:00 y el otro empieza 11:00) **no** chocan. |
| `buscarConflictos(reservas, salaId, fecha, inicio, fin)` | Filtra las reservas de la misma sala y fecha, **no canceladas**, que se superponen con el horario pedido. Si devuelve una lista vacía, la sala está libre. |
| `horariosCercanos(...)` | Recorre el día de 08:00 a 20:00 en pasos de 30 min y busca franjas libres de la misma duración. Devuelve las 3 más cercanas al horario pedido, ordenadas por hora. |
| `APERTURA` / `CIERRE` | Horario comercial: 8 × 60 y 20 × 60 minutos. |

La interfaz `Reserva` define `id`, `salaId`, `socioId`, `fecha`, `inicio`, `fin` y `estado` (`"confirmada"` o `"cancelada"`).

### `src/datos.ts`: datos simulados
Reemplaza a la base de datos mientras tanto. Exporta arreglos que **se modifican en memoria**:
- `sedes`: una sede, «Nodo Centro».
- `salas`: Córdoba (8 personas), Sierras (6) y Lago (4).
- `planes`: Flex (5 h), Pro (20 h) y Equipo (40 h), con su precio mensual.
- `socios`: la administradora y tres socios. La contraseña está en texto plano solo para la demo.
- `membresias`: qué plan tiene cada socio y su vigencia (`desde` y `hasta`).
- `reservas`: reservas iniciales. Incluyen la del Anexo B (Sala Córdoba, 20/11/2026, 10:00–11:00) y 8 h usadas por Sofía en noviembre, para que le queden 12 h como en el prototipo.
- `nuevoIdReserva()`: genera IDs incrementales.

Cada interfaz (`Sede`, `Sala`, `Plan`, `Socio`, `Membresia`) corresponde a una tabla del modelo de datos propuesto. Cuando se agregue TypeORM, cada una pasa a ser una entidad.

### `src/index.ts`: servidor y endpoints
Está organizado en bloques:

1. **Configuración.** Crea la app Express, lee el puerto de `PORT` (por defecto 3000) y activa `express.json()` para leer cuerpos JSON.
2. **Utilidades:**
   - `validarHorario(fecha, inicio, fin)`: controla que no falten datos, que la fecha sea `YYYY-MM-DD`, que las horas sean `HH:MM` válidas y que el inicio sea anterior al fin. Devuelve el mensaje de error o `null`.
   - `hoy()`: la fecha local en formato `YYYY-MM-DD`.
   - `horasDe(inicio, fin)`: la duración en horas.
   - `resumenMembresia(socioId, fecha)`: busca la membresía vigente en esa fecha, suma las horas de las reservas **no canceladas** del mismo mes y devuelve el plan, las horas incluidas, usadas y disponibles, y la vigencia. Devuelve `null` si no hay membresía.
   - `detalleReserva(r)`: agrega a la reserva el nombre de la sala, el del socio y las horas.
3. **Autenticación (demo):**
   - `POST /auth/login`: compara email y contraseña, genera un token aleatorio (`randomUUID`) y lo guarda en el `Map` `sesiones` (token → socioId).
   - Middleware `requiereLogin`: lee el encabezado `Authorization: Bearer <token>`, busca al socio y lo guarda en `req.socio`. Si no lo encuentra, responde **401**.
   - Middleware `requiereAdmin`: si el rol no es `admin`, responde **403**.
4. **Salas:** listado, disponibilidad (el endpoint original de la PoC, ahora con `sugerencias`) y agenda del día.
5. **Reservas:** «mis reservas», crear (con todas las validaciones de la sección 7) y cancelar. Cancelar **no borra** la reserva: le cambia el estado a `cancelada`, así queda en el historial y sus horas vuelven al saldo.
6. **Administración:** reservas de todos, socios con su saldo y planes con la cantidad de socios.
7. **Montaje:** el mismo router se monta en `/api` (lo usa el frontend) y en `/` (mantiene la ruta original de la PoC, `GET /salas/1/disponibilidad`).

---

## 4. API: endpoints

Todas las rutas existen con y sin el prefijo `/api`. Las que requieren autenticación esperan el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | — | Cuerpo `{ email, password }`. Devuelve `{ token, usuario }`. |
| POST | `/auth/logout` | sí | Invalida el token. |
| GET | `/me` | sí | Usuario logueado y resumen de su membresía. |
| GET | `/salas` | — | Listado de salas con su sede. |
| GET | `/salas/:id/disponibilidad?fecha&inicio&fin` | — | `{ disponible, conflictos, sugerencias }`. |
| GET | `/salas/:id/agenda?fecha` | — | Franjas ocupadas de esa sala en el día. |
| GET | `/reservas/mias` | sí | Reservas del usuario, ordenadas por fecha. |
| POST | `/reservas` | sí | Cuerpo `{ salaId, fecha, inicio, fin }`. Crea la reserva. |
| DELETE | `/reservas/:id` | sí | Cancela (dueño o admin). |
| GET | `/admin/reservas` | admin | Todas las reservas. |
| GET | `/admin/socios` | admin | Socios con plan y saldo de horas. |
| GET | `/admin/planes` | admin | Planes con la cantidad de socios. |

### Códigos de respuesta
| Código | Cuándo |
|---|---|
| 200 / 201 | Consulta correcta / reserva creada. |
| 400 | Faltan datos, formato inválido, inicio ≥ fin, fecha pasada, fin de semana, fuera de 08–20 h o reserva ya cancelada. |
| 401 | Sin sesión o credenciales incorrectas. |
| 403 | No es admin, la reserva es de otra persona, no tiene membresía vigente o no le alcanzan las horas. |
| 404 | Sala o reserva inexistente. |
| 409 | El horario ya está reservado (incluye `conflictos` y `sugerencias`). |

### Ejemplo: el caso de prueba de la PoC
```
GET http://localhost:3000/salas/1/disponibilidad?fecha=2026-11-20&inicio=10:30&fin=11:30
```
```json
{
  "sala": "Sala Córdoba",
  "fecha": "2026-11-20",
  "inicio": "10:30",
  "fin": "11:30",
  "disponible": false,
  "conflictos": [{ "inicio": "10:00", "fin": "11:00" }],
  "sugerencias": [
    { "inicio": "09:00", "fin": "10:00" },
    { "inicio": "11:00", "fin": "12:00" },
    { "inicio": "11:30", "fin": "12:30" }
  ]
}
```

---

## 5. Frontend: qué hace cada archivo

### `frontend/src/main.tsx`
El punto de entrada. Monta `<App />` dentro de `BrowserRouter` (navegación sin recargar la página) y de `AuthProvider` (sesión disponible en toda la app), e importa los estilos.

### `frontend/src/api.ts`
- **Tipos** compartidos (`Usuario`, `Membresia`, `Sala`, `Disponibilidad`, `Reserva`, `Franja`), que reflejan lo que devuelve la API.
- **`api<T>(ruta, opciones)`**: envoltorio de `fetch` que antepone `/api`, agrega el token guardado en `localStorage` y, si la respuesta no es 2xx, lanza un `ApiError` con el código, el mensaje y los datos (por ejemplo, las sugerencias de un 409).
- **Utilidades:** `fechaLarga("2026-11-20")` devuelve `"viernes 20/11/2026"`, `hoyISO()` devuelve la fecha de hoy y `horas(1.5)` devuelve `"1.5 h"`.

### `frontend/src/auth.tsx`
Un **contexto de React** con el usuario logueado y su membresía.
- Al iniciar, si hay un token guardado, llama a `/me` para recuperar la sesión. Si el token ya no sirve (por ejemplo, porque se reinició el servidor), lo borra.
- `login()` guarda el token y carga el usuario. `logout()` lo invalida.
- `refrescar()` vuelve a pedir `/me`. Se usa después de reservar o cancelar para actualizar el saldo de horas.
- Se usa desde cualquier componente con `useAuth()`.

### `frontend/src/App.tsx`
- **Rutas:** `/login`, `/reservar`, `/mis-reservas`, `/membresia` y `/admin`. Cualquier otra ruta redirige a `/reservar`.
- **`<Protegida>`:** si no hay sesión, redirige a `/login`. Con `soloAdmin`, un socio que entra a `/admin` vuelve a `/reservar`.
- **`<Encabezado>`:** la barra de navegación. Muestra «Mi membresía» solo a los socios y «Administración» solo a la admin. En el celular se pliega en un menú ☰.

### `frontend/src/pages/Login.tsx`
Formulario de email y contraseña, con botones que completan las cuentas de prueba. Muestra el error de la API (por ejemplo, «Email o contraseña incorrectos»).

### `frontend/src/pages/Reservar.tsx`: pantalla principal
Implementa el wireframe del Anexo A:
1. **Formulario** con cuatro campos: sala, fecha, hora de inicio y hora de fin, en pasos de 30 min entre 08:00 y 20:00.
2. **Validación en el cliente** (`validar()`), antes de consultar: fecha pasada, fin de semana, inicio ≥ fin. Marca en rojo el campo a corregir.
3. **«Consultar disponibilidad»** llama a `GET /salas/:id/disponibilidad` y muestra uno de estos estados (componente `Panel`):
   - **Disponible:** repite sala, fecha y horario, avisa cuánto se va a descontar del saldo y muestra «Confirmar reserva». Si no alcanzan las horas, lo avisa y no deja confirmar.
   - **Ocupado:** muestra los conflictos y botones con los **horarios cercanos libres**. Al tocar uno, se completa el horario y se vuelve a consultar.
   - **Revisá los horarios:** el error 400 de la API.
   - **Reserva confirmada:** con enlace a «Mis reservas».
4. **Confirmar** llama a `POST /reservas`. Si otra persona tomó la sala entre la consulta y la confirmación (409), pasa al estado *Ocupado* con las sugerencias que devolvió la API.
5. **`LineaDeTiempo`:** una barra de 8 a 20 h con las franjas ocupadas (rayadas en rojo) y el horario elegido (en lima), cargada desde `/salas/:id/agenda`.

Los estados se comunican con **texto y no solo con color** (✓ Disponible, ✕ Ocupado), como pide la justificación de diseño.

### `frontend/src/pages/MisReservas.tsx`
Separa las reservas **próximas** (confirmadas y de hoy en adelante), que tienen botón «Cancelar» con confirmación, del **historial** (canceladas o ya pasadas). Después de cancelar, recarga la lista y actualiza el saldo.

### `frontend/src/pages/MiMembresia.tsx`
Muestra el plan, las horas disponibles de las incluidas, una barra de progreso con las horas usadas y la vigencia.

### `frontend/src/pages/Admin.tsx`
- **Métricas:** socios activos, reservas próximas y horas reservadas.
- **Pestaña Reservas:** una tabla con filtro «solo próximas» y la opción de cancelar cualquier reserva.
- **Pestaña Socios:** plan, horas usadas y horas disponibles de cada socio.
- **Pestaña Planes:** tarjetas con el precio, las horas incluidas y la cantidad de socios.

### `frontend/src/styles.css`
Sistema de diseño del prototipo de Figma, definido como variables CSS:
- Colores: verde bosque `#183D32`, verde principal `#245C46`, lima `#DCF19A` y rojo `#A33D32`.
- Radios de 8, 10 y 12 px. Espaciados de 8, 16, 24 y 32 px. Tipografía Inter.
- Debajo de 760 px de ancho, la grilla de reserva pasa a una columna y la navegación a menú desplegable.

### `frontend/vite.config.ts`
En desarrollo, Vite reenvía todo lo que empieza con `/api` al backend. Así el frontend y la API se ven como el mismo origen y no hace falta configurar CORS. El destino sale de la variable `API_URL`: `http://localhost:3000` en local y `http://api:3000` dentro de Docker.

---

## 6. Docker: qué hace cada archivo

| Archivo | Qué hace |
|---|---|
| `Dockerfile` (raíz) | Imagen `node:24-alpine` para la API. Instala las dependencias con `npm ci --ignore-scripts` y arranca con `node --watch -r ts-node/register src/index.ts`, que reinicia la API cuando cambia un archivo. |
| `frontend/Dockerfile` | Imagen `node:24-alpine` para la web. Instala las dependencias y arranca `vite`. |
| `docker-compose.yml` | Define dos servicios: `api` (puerto 3000) y `web` (puerto 5173, con `API_URL=http://api:3000`). La sección `develop.watch` copia al contenedor los cambios de `src/` y `frontend/src/` y reconstruye la imagen si cambia un `package.json`. |
| `.dockerignore` | Evita copiar `node_modules`, `dist`, `.git` y (en la imagen de la API) la carpeta `frontend`. |

Cuando se agregue PostgreSQL, alcanza con sumar un servicio `db` al `docker-compose.yml`.

---

## 7. Flujo completo de una reserva

```
Sofía completa sala, fecha y horario
   │
   ├─ validar() en el navegador ── falla ──▶ marca el campo en rojo
   │
   ▼
GET /api/salas/1/disponibilidad
   │
   ├─ 400 ──▶ «Revisá los horarios»
   ├─ disponible: false ──▶ «Ocupado» + horarios cercanos (vuelve a consultar)
   │
   ▼  disponible: true
«Confirmar reserva» ──▶ POST /api/reservas
   │
   │  El backend vuelve a validar todo, en este orden:
   │   1. ¿hay sesión?                      no → 401
   │   2. formato y inicio < fin            no → 400
   │   3. ¿existe la sala?                  no → 404
   │   4. ¿la fecha no pasó?                no → 400
   │   5. ¿es de lunes a viernes?           no → 400
   │   6. ¿está entre las 08:00 y las 20:00? no → 400
   │   7. ¿no hay superposición?            no → 409 + sugerencias
   │   8. (socios) ¿membresía vigente?      no → 403
   │   9. (socios) ¿alcanzan las horas?     no → 403
   ▼
201: reserva confirmada ──▶ se actualiza el saldo de horas y la línea de tiempo
```

El backend **no confía** en la validación del navegador y repite todos los controles. La superposición (paso 7) se vuelve a verificar al confirmar, porque otra persona pudo reservar entre la consulta y la confirmación.

---

## 8. Limitaciones conocidas y próximos pasos

- **Sin base de datos:** los datos se pierden al reiniciar. El siguiente paso es PostgreSQL + TypeORM, con una *exclusion constraint* sobre el rango horario de cada sala.
- **Autenticación de demo:** las contraseñas están en texto plano y los tokens en memoria, sin vencimiento. Hay que pasar a bcrypt + JWT.
- **Sin pruebas automatizadas todavía:** los casos de Jest y Supertest están definidos en la propuesta, sección 5.
- La validación de fecha controla el formato pero no que la fecha exista (por ejemplo, `2026-02-30`).
- No hay registro de socios ni ABM de planes desde el panel.
- Falta el despliegue (Railway con staging y producción), el dominio y el HTTPS.

El detalle completo está en [`entregables/propuesta de presentacion.md`](entregables/propuesta%20de%20presentacion.md).
