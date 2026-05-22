# Dominio Cama-Pro

Fuente de verdad del modelo de dominio. Si algo aqui contradice el codigo, **el codigo esta mal**, no este documento. Si el dominio evoluciona, este documento se actualiza en el mismo PR que el cambio.

---

## Glosario (lenguaje ubicuo)

| Termino | Significado |
|---|---|
| **Gestor** | Usuario que publica servicios y administra camareros. Hay 1 (en MVP). |
| **Camarero** | Usuario que ve servicios disponibles y los acepta. Hay N. |
| **Servicio** | Trabajo concreto en una fecha y lugar con N **cupos** a cubrir. NO se llama "Evento" para no chocar con Domain Events. |
| **Asignacion** | Vinculo Camarero-Servicio creado cuando el camarero acepta. Ocupa un cupo. |
| **Cupo** | Plaza de trabajo dentro de un Servicio. Total fijo al crear el Servicio. |

---

## Actores y bounded contexts (MVP)

| Contexto | Responsabilidad | Agregados |
|---|---|---|
| `identity` | Login, registro, roles, sesion | `Usuario` |
| `staff` | Perfil del camarero, ciclo de aprobacion | `Camarero` |
| `bookings` | Servicios publicados, asignaciones, cupos | `Servicio` (raiz), `Asignacion` (parte) |

Comunicacion entre contextos: por **interfaz publica** o **evento de dominio**. Nunca por importacion interna.

---

## Agregado `Servicio`

### Campos

| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID | |
| `fechaInicio` | DateTime | UTC en BD, mostrar en zona local en UI |
| `duracionHoras` | int | 1–24 |
| `lugar` | Value Object `{ nombre, direccion }` | |
| `tipoEvento` | enum | BODA, CORPORATIVO, CENA_PRIVADA, COCTEL, BANQUETE, OTRO |
| `cuposTotales` | int | inmutable tras la creacion |
| `uniforme` | string? | descripcion libre |
| `notas` | string? | instrucciones especiales |
| `estado` | enum | ver maquina de estados |
| `version` | int | bloqueo optimista, +1 en cada `aceptar()` |
| `asignaciones` | List&lt;Asignacion&gt; | dentro del agregado |
| `creadoEn` | DateTime | auditoria |

### Maquina de estados

```
                aceptar() [si cuposOcupados < cuposTotales-1]
              ┌────────────────────────────────────────────┐
              │                                            │
              ▼                                            │
   crear()  ┌───────────┐  aceptar() [ultimo cupo]    ┌───────────┐
  ───────► │ PUBLICADO │ ────────────────────────────► │ CUBIERTO  │
           └───────────┘                              └───────────┘
              │                                            │
              │ cancelar()                  cancelar()     │
              ▼                                            ▼
           ┌────────────┐                          ┌────────────┐
           │ CANCELADO  │                          │ CANCELADO  │
           └────────────┘                          └────────────┘

   (fase 2) CUBIERTO → EN_CURSO → FINALIZADO
```

**MVP implementa:** PUBLICADO, CUBIERTO, CANCELADO.
**Fase 2:** EN_CURSO, FINALIZADO.

### Invariantes (protegidas por el agregado)

1. `asignaciones.length <= cuposTotales` — **siempre**.
2. Un mismo `camareroId` no aparece dos veces en `asignaciones`.
3. `aceptar()` solo es valido si `estado === "PUBLICADO"`.
4. Cuando `asignaciones.length === cuposTotales`, `estado` pasa a `CUBIERTO` (transicion automatica dentro del mismo metodo).
5. `cuposTotales` y `cuposOcupados` (derivado: `asignaciones.length`) nunca son negativos.
6. `cancelar()` valido desde `PUBLICADO` o `CUBIERTO`; no desde `CANCELADO` ni desde estados de fase 2.

### Metodos del agregado (firmas)

```typescript
class Servicio {
  static crear(input: CrearServicioInput): Servicio;
  aceptar(camareroId: CamareroId): Asignacion;   // lanza CupoLlenoError, EstadoInvalidoError, YaAsignadoError
  cancelar(motivo: string): void;                 // lanza EstadoInvalidoError
  get cuposOcupados(): number;
  get estaCompleto(): boolean;
}
```

---

## Agregado `Camarero`

### Campos

| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID | |
| `nombre` | string | 2–80 chars |
| `email` | string | unico |
| `telefono` | string | |
| `estadoCuenta` | enum | PENDIENTE_APROBACION, ACTIVO, SUSPENDIDO |
| `creadoEn` | DateTime | |

### Reglas

- Al registrarse, `estadoCuenta = PENDIENTE_APROBACION`.
- Solo el `Gestor` puede llamar a `aprobar()` o `suspender()`.
- Un `Camarero` con `estadoCuenta !== "ACTIVO"` **no puede** aceptar servicios (validado en el caso de uso `AceptarServicio`).

---

## Agregado `Usuario` (contexto `identity`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID | |
| `email` | string | unico |
| `passwordHash` | string | bcrypt |
| `rol` | enum | GESTOR, CAMARERO |
| `camareroId` | UUID? | si rol = CAMARERO, vincula al agregado en `staff` |
| `creadoEn` | DateTime | |

---

## Reglas MVP confirmadas

- Asignacion **por orden de llegada** (cupo).
- Camareros se **autoregistran** pero el gestor los **aprueba** antes de habilitarlos.
- **Sin cancelacion post-aceptacion** desde la app (camarero llama al gestor; el gestor podra cancelar el Servicio entero).
- **Todos los camareros aprobados ven todos los servicios** (sin filtros de zona/categoria).
- Cliente externo (restaurante/casa de eventos) **NO entra al sistema** en MVP.

---

## Fuera de MVP (apuntado para no perder)

- Facturacion, tarifas, cobros.
- Valoraciones del desempeno.
- Notificaciones (email/push) al publicar servicio.
- Filtros por zona/categoria del camarero.
- Cancelacion del camarero post-aceptacion con politica.
- Cliente externo con acceso al sistema.
- Calendario / vista timeline.
- App movil nativa.
