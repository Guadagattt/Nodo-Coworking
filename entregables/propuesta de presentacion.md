# Propuesta de presentación – Sistema de reservas y membresías para Nodo Coworking

**Consultora:** Sierras Dev Studio (nombre ficticio, editable) · **Integrantes:** [completar nombres]
**Cliente:** Valentina, propietaria de Nodo Coworking
**Espacio curricular:** Construcción de Sitios Web II – IRESM Nivel Superior – 3.er año – 2026
**Repositorio:** https://github.com/Guadagattt/Nodo-Coworking

---

## 1. Identificación del negocio

### Cliente y actividad
Nodo Coworking es un espacio de trabajo compartido con **20 puestos** y **3 salas de reuniones**. Sus socios contratan membresías (planes) que incluyen distintos beneficios, entre ellos **horas de uso de las salas**.

### Problema principal
Las reservas y las membresías se administran en **planillas**. Esto provoca:
- **Dobles reservas:** dos socios piden la misma sala en el mismo horario.
- **Falta de control de beneficios:** es difícil saber cuántas horas de su plan consumió cada socio.

### Necesidades de los usuarios
| Usuario | Necesidad |
|---|---|
| **Socios** | Ver la disponibilidad real de las salas, reservar desde el celular sin llamar ni escribir y saber cuántas horas incluidas les quedan. |
| **Valentina (administradora)** | Evitar dobles reservas, controlar los beneficios de cada plan, ver la ocupación de las salas y poder sumar nuevas sedes. |

**Restricciones del cliente:** acceso de los socios desde Internet, actualizaciones frecuentes, posibilidad de abrir nuevas sedes y disponibilidad durante el horario comercial.

### Supuestos declarados
No figuran en el escenario, así que los declaramos nosotros:
- Unos 80 socios activos.
- Horario comercial de lunes a viernes, de 8 a 20 h.
- Menos de 50 reservas por día.
- En la primera etapa, las membresías se siguen cobrando fuera del sistema.
- No hay control de acceso físico (puertas o tarjetas).

### User persona
**Sofía**, socia con **Plan Pro** (20 h de sala por mes). Usa el celular para casi todo y necesita reservar salas para reunirse con clientes. Hoy tiene que escribirle a Valentina para consultar disponibilidad, a veces la sala ya estaba prometida a otro socio y no sabe cuántas horas consumió.

---

## 2. Solución propuesta

Una **aplicación web responsive** (celular y computadora) que centraliza salas, reservas, socios y planes.

**Regla central:** una sala **nunca** puede tener dos reservas superpuestas. Se valida en el backend y, en el sistema completo, también se refuerza en la base de datos con una *exclusion constraint* de PostgreSQL, para que ni siquiera dos pedidos simultáneos puedan generar un conflicto.

### PoC, MVP y producto terminado
| Etapa | Qué incluye |
|---|---|
| **PoC** | Un endpoint que consulta la disponibilidad de una sala (`GET /salas/:id/disponibilidad`). |
| **MVP (primera etapa)** | Registro e inicio de sesión, consulta de disponibilidad, reserva y cancelación sin superposición, planes con descuento de horas, panel de administración y diseño para celulares. |
| **Segunda etapa** | Pagos online (Mercado Pago), avisos por correo o WhatsApp, varias sedes, reserva de puestos, reportes de ocupación, control de acceso físico y facturación. |

---

## 3. Qué está hecho

Hoy el proyecto es un **prototipo navegable** que va más allá de la PoC: cubre casi todo el flujo del MVP, pero con **datos simulados en memoria** (todavía sin base de datos).

### Backend (Node.js + TypeScript + Express)
- ✅ Endpoint de la PoC `GET /salas/:id/disponibilidad`, que responde igual que lo documentado en el Anexo B.
- ✅ Sugerencia de **horarios cercanos libres** cuando el horario pedido está ocupado.
- ✅ Inicio y cierre de sesión con **dos roles**: socio y administradora.
- ✅ **Crear y cancelar reservas**, validando superposición, horario comercial, fecha pasada y días hábiles.
- ✅ **Control de horas del plan:** se descuentan las horas de la reserva y se rechaza si no alcanza el saldo del mes.
- ✅ Endpoints de **administración**: listado de reservas, de socios con su saldo y de planes.
- ✅ Agenda diaria de cada sala, para mostrar su ocupación.

### Frontend (React + Vite)
- ✅ **Iniciar sesión**, con botones de cuentas de prueba.
- ✅ **Reservar una sala:** sala, fecha, hora de inicio y hora de fin, más «Consultar disponibilidad». Muestra los tres estados del wireframe (Disponible, Ocupado o «Revisá los horarios») y una línea de tiempo con la ocupación del día.
- ✅ **Mis reservas:** las próximas, que se pueden cancelar, y el historial.
- ✅ **Mi membresía:** plan, horas usadas, horas disponibles y vigencia (por ejemplo, Plan Pro con 12 h disponibles de 20).
- ✅ **Panel de administración:** métricas y pestañas de reservas, socios y planes.
- ✅ **Diseño responsive** que respeta el sistema de diseño del prototipo de Figma: tipografía Inter, verde bosque `#183D32`, verde principal `#245C46`, lima `#DCF19A`, rojo `#A33D32` y radios de 8, 10 y 12 px.

### Entorno de desarrollo
- ✅ Se levanta con **un solo comando**, con Docker (`docker compose up --build --watch`) o sin Docker (`npm run dev`).
- ✅ Los cambios en el código se recargan solos.

### Datos de prueba
| Usuario | Email | Contraseña | Plan |
|---|---|---|---|
| Valentina (admin) | valentina@nodo.com | admin123 | — |
| Sofía | sofia@nodo.com | sofia123 | Pro (20 h) |
| Martín | martin@nodo.com | martin123 | Flex (5 h) |
| Lucía | lucia@nodo.com | lucia123 | Equipo (40 h) |

Salas: **Córdoba** (8 personas), **Sierras** (6) y **Lago** (4), todas en la sede «Nodo Centro».

---

## 4. Qué falta por hacer

| # | Tarea | Prioridad |
|---|---|---|
| 1 | **Persistencia real:** PostgreSQL + TypeORM, con entidades `sedes`, `salas`, `socios`, `planes`, `membresias` y `reservas`, y migraciones. | Alta |
| 2 | **Exclusion constraint** en PostgreSQL sobre el rango de tiempo de cada sala, para impedir superposiciones aunque lleguen dos pedidos simultáneos. | Alta |
| 3 | **Seguridad real:** contraseñas con hash (bcrypt), tokens JWT con vencimiento, CORS restringido, límite de pedidos por IP y variables de entorno para las credenciales. | Alta |
| 4 | **Pruebas automatizadas:** Jest (unitarias) y Supertest (integración), según las reglas de la sección 5. | Alta |
| 5 | **Registro de socios** y ABM de socios y planes desde el panel; hoy solo se pueden consultar. | Media |
| 6 | Validar que la fecha exista en el calendario: hoy `2026-02-30` pasa el control de formato. | Media |
| 7 | **Despliegue** en Railway con dos entornos (staging desde `develop` y producción desde `main`), dominio `.com.ar`, DNS en Cloudflare y HTTPS. | Media |
| 8 | **Backups** diarios (`pg_dump`) guardados fuera del proveedor y prueba de restauración trimestral. | Media |
| 9 | Segunda etapa: pagos online, avisos, multi-sede, reserva de puestos y reportes. | Baja (se presupuesta aparte) |

---

## 5. Reglas de validación para las pruebas

Estas son las reglas de negocio que el sistema debe cumplir y que las pruebas deben verificar. El código ya las implementa; las **pruebas automatizadas todavía no están escritas** (tarea 4).

### 5.1 Reglas de negocio
| ID | Regla |
|---|---|
| **RN-01** | Una sala no puede tener dos reservas confirmadas superpuestas. |
| **RN-02** | Dos horarios consecutivos **no** se superponen: si una reserva termina a las 11:00, otra puede empezar a las 11:00. |
| **RN-03** | Las reservas canceladas no ocupan la sala. |
| **RN-04** | La hora de inicio debe ser anterior a la de fin. |
| **RN-05** | La fecha va en formato `YYYY-MM-DD` y las horas en `HH:MM` (00:00 a 23:59). |
| **RN-06** | Solo se reserva de lunes a viernes, entre las 08:00 y las 20:00. |
| **RN-07** | No se puede reservar en una fecha pasada. |
| **RN-08** | Un socio solo reserva si tiene una membresía vigente para esa fecha. |
| **RN-09** | La duración de la reserva no puede superar las horas disponibles del plan en ese mes. |
| **RN-10** | Las horas de las reservas canceladas vuelven al saldo. |
| **RN-11** | Un socio solo puede cancelar sus propias reservas; la administradora puede cancelar cualquiera. |
| **RN-12** | Solo la administradora accede al panel de administración. |
| **RN-13** | Las acciones de reservar, cancelar y ver «mis reservas» requieren iniciar sesión. |
| **RN-14** | Si el horario está ocupado, no se crea la reserva ni se descuentan horas, y se ofrecen hasta 3 horarios cercanos libres de la misma duración. |

### 5.2 Prueba unitaria (Jest): `seSuperponen(inicioA, finA, inicioB, finB)`
| Caso | Entrada | Esperado | Regla |
|---|---|---|---|
| U-01 | `("10:30", "11:30", "10:00", "11:00")` | `true` | RN-01 |
| U-02 (límite) | `("11:00", "12:00", "10:00", "11:00")` | `false` | RN-02 |
| U-03 | `("09:00", "10:00", "10:00", "11:00")` | `false` | RN-02 |
| U-04 (contenido) | `("10:15", "10:45", "10:00", "11:00")` | `true` | RN-01 |
| U-05 (envolvente) | `("09:00", "12:00", "10:00", "11:00")` | `true` | RN-01 |

**Errores que detecta:** si alguien cambia `<` por `<=`, U-02 y U-03 fallan, porque se rechazarían reservas consecutivas válidas. Si se elimina una de las dos condiciones, U-02 o U-03 fallan, porque el sistema marcaría como superpuestos horarios que no lo son.

También son candidatas a pruebas unitarias: `buscarConflictos` (que ignore las canceladas y las de otra sala o fecha, RN-03) y `horariosCercanos` (máximo 3 resultados, todos libres y dentro de 08:00–20:00, RN-14).

### 5.3 Pruebas de integración (Supertest)
| Caso | Pedido | Código | Respuesta esperada |
|---|---|---|---|
| I-01 | `GET /salas/1/disponibilidad?fecha=2026-11-20&inicio=10:30&fin=11:30` | 200 | `disponible: false`, `conflictos: [{inicio:"10:00", fin:"11:00"}]` |
| I-02 | `GET /salas/1/disponibilidad?fecha=2026-11-20&inicio=11:00&fin=12:00` | 200 | `disponible: true` |
| I-03 | Igual a I-01 pero con `inicio=12:00&fin=11:00` | 400 | Error: inicio posterior al fin |
| I-04 | `GET /salas/99/disponibilidad?...` | 404 | «La sala no existe» |
| I-05 | Disponibilidad sin el parámetro `fecha` | 400 | «Faltan parámetros» |
| I-06 | `POST /reservas` sin token | 401 | «Tenés que iniciar sesión» |
| I-07 | `POST /reservas` (Sofía) sala 1, 20/11, 10:30–11:30 | 409 | Conflicto y sugerencias; el saldo no cambia |
| I-08 | `POST /reservas` (Sofía) sala 1, 20/11, 11:00–12:00 | 201 | Reserva confirmada; `GET /me` muestra 1 h menos |
| I-09 | `POST /reservas` en sábado | 400 | «de lunes a viernes» |
| I-10 | `POST /reservas` de 07:00 a 09:00 | 400 | «horario comercial» |
| I-11 | `POST /reservas` de más horas que el saldo | 403 | «Te quedan X h…» |
| I-12 | `DELETE /reservas/:id` de otro socio | 403 | «No podés cancelar reservas de otra persona» |
| I-13 | `DELETE /reservas/:id` propia | 200 | `estado: "cancelada"`; las horas vuelven al saldo |
| I-14 | `GET /admin/socios` con token de socio | 403 | «Solo la administradora…» |
| I-15 | `POST /auth/login` con contraseña incorrecta | 401 | «Email o contraseña incorrectos» |

### 5.4 Prueba manual (Testiny)
**CP-001 – Rechazar una reserva en un horario superpuesto (desde la interfaz)**
- **Precondiciones:** la app está levantada y existe una reserva de la Sala Córdoba el 20/11/2026 de 10:00 a 11:00.
- **Pasos:**
  1. Iniciar sesión como Sofía.
  2. Ir a «Reservar».
  3. Elegir la Sala Córdoba, el 20/11/2026, de 10:30 a 11:30.
  4. Tocar «Consultar disponibilidad».
- **Resultado esperado:** aparece el estado **Ocupado**, con el conflicto de 10:00 a 11:00 y botones de horarios cercanos libres. El saldo sigue siendo de 12 h.

**CP-002 – Reservar y cancelar devuelve las horas**
- **Pasos:**
  1. Como Sofía, reservar la Sala Lago el próximo día hábil de 09:00 a 10:00.
  2. Verificar que «Mi membresía» muestre 11 h disponibles.
  3. Cancelar la reserva en «Mis reservas».
- **Resultado esperado:** el saldo vuelve a 12 h.

### 5.5 Verificación y validación
- **Verificación** (¿construimos el sistema correctamente?): las pruebas unitarias y de integración comprueban que el código cumple las reglas RN-01 a RN-14. Además, una prueba con dos pedidos simultáneos comprobará que la base de datos también impide la superposición.
- **Validación** (¿construimos el sistema correcto?): una prueba piloto de dos semanas con Valentina y algunos socios reservando salas reales, para confirmar que ya no hay dobles reservas y que los socios reservan sin pedir ayuda.

---

## 6. Herramientas a utilizar

| Área | Herramienta | Estado |
|---|---|---|
| Frontend | **React 19** + **Vite** + **React Router** | En uso |
| Backend | **Node.js** + **TypeScript** + **Express** | En uso |
| Base de datos | **PostgreSQL** + **TypeORM** | Pendiente |
| Contenedores | **Docker** + **Docker Compose** | En uso (desarrollo local) |
| Control de versiones | **Git** + **GitHub** | En uso |
| Pruebas unitarias | **Jest** | Pendiente |
| Pruebas de integración | **Supertest** | Pendiente |
| Pruebas manuales | **Testiny** | Pendiente |
| Pruebas de API a mano | **Thunder Client** o **Postman** | En uso |
| Diseño UX/UI | **Figma** (wireframes y prototipo) | En uso |
| Hosting (PaaS) | **Railway**: staging y producción con PostgreSQL administrado | Propuesto |
| DNS | **Cloudflare** (plan gratuito) | Propuesto |
| Dominio | **NIC Argentina** (`.com.ar`) | Propuesto |
| Segunda etapa | **Mercado Pago**, correo transaccional, WhatsApp | Propuesto |

---

## 7. Arquitectura y despliegue (resumen)

```
Socios / Administradora (navegador o celular)
        │  HTTPS + JSON
        ▼
Frontend React (sitio estático)
        │  HTTPS + JSON (token de sesión)
        ▼
API REST Express + TypeScript
        │  red privada
        ▼
PostgreSQL administrado (TypeORM)
```

- **Dos entornos:** *staging* (rama `develop`) y *producción* (rama `main`). Nada llega a producción sin probarse antes en staging.
- **Actualizar sin cortar las reservas:** despliegue automático desde GitHub con *health check*, migraciones compatibles con la versión anterior, cambios grandes fuera del horario comercial y vuelta atrás desde el panel del proveedor.
- **Proveedor recomendado:** **Railway**, unos USD 25 por mes con dos entornos. La alternativa es Render, unos USD 50 por mes, con un costo fijo más predecible.

### Presupuesto (resumen)
| Concepto | Monto |
|---|---|
| Implementación (220 h × USD 15) | USD 3.300 |
| Infraestructura (Railway) | USD 300/año |
| Mantenimiento (6 h/mes) | USD 1.080/año |
| **Total del primer año** | **unos USD 4.700**, más el dominio (ARS 8.500/año) |
| Costo recurrente desde el segundo año | unos USD 1.400/año |

---

## 8. Cómo ver la demo

```bash
git clone https://github.com/Guadagattt/Nodo-Coworking.git
cd Nodo-Coworking
docker compose up --build --watch
```
Abrir **http://localhost:5173** e ingresar como Sofía o Valentina. Las cuentas están en la sección 3.

Sin Docker hace falta Node.js 20 o superior: `npm install` y después `npm run dev`.
