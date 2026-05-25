# Handoff: Dashboard del Gestor

> **Nota importante:** Los archivos HTML en esta carpeta son **referencias de diseño** — prototipos en HTML que muestran el aspecto y comportamiento pretendidos. La tarea es **recrear estos diseños en el codebase existente** (React + TypeScript + Tailwind, en `apps/web/src/`) usando sus patrones y componentes ya establecidos. No copiar el HTML directamente.

---

## Fidelidad

**Baja fidelidad (wireframe):** Este documento muestra la estructura, layout y lógica de la pantalla. El estilo visual exacto debe aplicarse usando el design system existente del proyecto (tokens Tailwind en `tailwind.config.js`, componentes en `src/shared/ui/`).

---

## Resumen

Añadir una **página de inicio / dashboard** para el rol `GESTOR`, accesible en la ruta `/` (o `/gestor`). Actualmente ese role aterriza en `/gestor/servicios` sin ninguna vista de resumen.

La variante elegida es la **"B · Alertas primero"**: prioriza acciones urgentes arriba, ofrece un panorama semanal de servicios y un panel lateral con stats y accesos rápidos.

---

## Ruta y ficheros a crear/modificar

| Acción | Fichero |
|--------|---------|
| Crear | `src/gestor/DashboardGestorPage.tsx` |
| Modificar | `src/app/routes.tsx` — añadir ruta `/` → `<DashboardGestorPage>` para GESTOR |
| Modificar | `src/app/AppLayout.tsx` — añadir "Inicio" como primer enlace nav del GESTOR |
| Posible añadir | `src/gestor/api.ts` — si hacen falta nuevas queries (ver sección Data) |

---

## Layout general

```
┌─────────────────────────────────────────────────────────────┐
│ NavBar (existente, sticky)                                  │
├─────────────────────────────────────────────────────────────┤
│ [BANNER ALERTA — solo si hay pendientes]                    │
├─────────────────────────────────────────────────────────────┤
│ max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14      │
│                                                             │
│  PageHeader                     [Btn "Nuevo servicio"]     │
│  eyebrow: fecha de hoy                                      │
│  título:  "Esta semana."                                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Strip semanal — 7 columnas, lun→dom de la semana     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────┐  ┌──────────────────────┐      │
│  │  Lista de servicios    │  │  Sidebar de stats    │      │
│  │  activos (flex col)    │  │  + accesos rápidos   │      │
│  └────────────────────────┘  └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Sección 1: Banner de alerta

**Condición de visibilidad:** solo renderizar si `pendientes.length > 0` (camareros con `estadoCuenta === "PENDIENTE_APROBACION"`).

**Posición:** inmediatamente después del `<header>` sticky del AppLayout, antes del contenido de la página. Opciones de implementación:
- Renderizarlo dentro de `DashboardGestorPage` con margen negativo top y padding lateral que cubra todo el ancho, o
- Usar un `<div className="bg-wine text-bone">` de ancho completo antes del wrapper `max-w-6xl`.

**Contenido:**
```
[eyebrow: "ACCIÓN REQUERIDA"]  [N camareros esperan aprobación — no pueden aceptar servicios]  [Btn ghost: "Aprobar ahora →"]
```

- Fondo: `bg-wine` (`#7C2D2A`)
- Texto: `text-bone` (`#FAF7F2`)
- El botón ghost tiene borde semitransparente (`border-bone/40 text-bone`)
- El botón navega a `/gestor/camareros` (con filtro de pendientes si es posible)
- Padding: `px-8 py-2.5`
- Layout: `flex items-center justify-between gap-4`

---

## Sección 2: PageHeader

Usar el componente `<PageHeader>` existente:

```tsx
<PageHeader
  eyebrow={`${diaSemana} ${diaNumero} de ${mes} · Panel del gestor`}
  titulo="Esta semana."
  accion={
    <Link to="/gestor/servicios/nuevo">
      <Button>Nuevo servicio</Button>
    </Link>
  }
/>
```

El eyebrow muestra la fecha actual en español: _"Sábado 24 de mayo · Panel del gestor"_.

---

## Sección 3: Strip semanal

**Propósito:** mostrar los 7 días de la semana actual (lunes a domingo, o día actual + 6 días), con cuántos servicios tiene cada día.

**Layout:** `grid grid-cols-7 gap-1.5 mb-8`

**Cada celda:**
```
┌───────────┐
│  SAB      │  ← eyebrow (Geist Mono, 9px, uppercase, tracking-wider2)
│    24     │  ← Fraunces, ~30px, tracking-editorial
│ [badge]   │  ← Badge "2 serv." tono ambar / o texto "libre" si 0
└───────────┘
```

**Celda de hoy** (día actual): fondo `bg-ink`, texto `text-bone`, borde `border-ink`. Resto: `bg-cream border-line`.

**Cómo calcular servicios por día:**
```ts
// Con la lista de servicios activos (PUBLICADO + CUBIERTO), agrupar por fecha:
const serviciosPorDia = servicios.reduce((acc, s) => {
  const dia = new Date(s.fechaInicio).toDateString();
  acc[dia] = (acc[dia] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

---

## Sección 4: Lista de servicios activos

**Query:** `listarServiciosGestor()` sin filtro (o filtrar client-side por `["PUBLICADO", "CUBIERTO"]`). Mostrar máximo los ~5 más próximos ordenados por `fechaInicio` ascendente.

**Layout de cada fila:** `flex items-center gap-4 bg-white border border-line rounded-card p-4`

```
┌────────────────────────────────────────────────────────────┐
│ [DateChip] │ [Nombre + lugar + badge] │ [CupoBar] │ [···] │
└────────────────────────────────────────────────────────────┘
```

### DateChip (nuevo subcomponente)
Un pequeño bloque `bg-cream border border-line rounded-card` de ~72px de ancho mínimo:
```
Dom 25     ← eyebrow
 18:00     ← Geist Mono 13px, color ink
```

### Nombre + lugar + badge
```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-baseline gap-2 flex-wrap">
    <span className="font-display text-[19px] tracking-editorial">{etiquetaEvento(s.tipoEvento)}</span>
    <Badge tono={tonoEstado[s.estado]}>{etiquetaEstado[s.estado]}</Badge>
  </div>
  <p className="text-xs text-ash mt-0.5">{s.lugar.nombre} · {s.duracionHoras}h</p>
</div>
```

### CupoBar
Reutilizar el componente `<CupoBar>` que ya existe dentro de `ServicioCard.tsx` (extraerlo o duplicarlo). Ancho fijo `w-36 shrink-0`.

### Botón de acción
Un botón `···` (`variante="ghost" tamano="sm"`) que despliega las acciones: Ver equipo, Editar, Cancelar (igual que en `ServiciosGestorPage`). Puede reusar la lógica de `ServicioGestorCard`.

---

## Sección 5: Sidebar de stats y accesos rápidos

**Layout:** `flex flex-col gap-3` dentro de una columna de `w-72 shrink-0`.

### Stats cards (3)
Cada una: `flex justify-between items-center bg-cream border border-line rounded-card px-4 py-3`
```
[eyebrow "Publicados"]     [número Fraunces 38px terra]
[eyebrow "Cubiertos"]      [número Fraunces 38px sage]
[eyebrow "Activos"]        [número Fraunces 38px ink]
```

Valores derivados de la lista de servicios + lista de camareros:
- **Publicados:** `servicios.filter(s => s.estado === "PUBLICADO").length`
- **Cubiertos:** `servicios.filter(s => s.estado === "CUBIERTO").length`
- **Activos:** `camareros.filter(c => c.estadoCuenta === "ACTIVO").length`

### Accesos rápidos
```tsx
<div className="bg-cream border border-line rounded-card p-4 mt-1">
  <p className="eyebrow mb-3">Accesos rápidos</p>
  <div className="flex flex-col gap-2">
    <Link to="/gestor/servicios/nuevo"><Button className="w-full">+ Nuevo servicio</Button></Link>
    <Link to="/gestor/camareros"><Button variante="ghost" className="w-full">Ver todos los camareros</Button></Link>
  </div>
</div>
```

---

## Data requirements

| Dato | Fuente | Nota |
|------|--------|------|
| Servicios activos | `listarServiciosGestor()` | Ya existe en `gestor/api.ts`. Filtrar client-side por PUBLICADO+CUBIERTO |
| Camareros pendientes | `listarCamareros("PENDIENTE_APROBACION")` | Ya existe en `gestor/api.ts` |
| Camareros activos (count) | `listarCamareros("ACTIVO")` | Ya existe — solo necesitar el `.length` |

No se requieren nuevas rutas de API.

**Query keys sugeridas:**
```ts
useQuery({ queryKey: ["gestor", "servicios", ""], queryFn: () => listarServiciosGestor() })
useQuery({ queryKey: ["gestor", "camareros", "PENDIENTE_APROBACION"], queryFn: () => listarCamareros("PENDIENTE_APROBACION") })
useQuery({ queryKey: ["gestor", "camareros", "ACTIVO"], queryFn: () => listarCamareros("ACTIVO") })
```

---

## Interacciones y navegación

| Elemento | Acción |
|----------|--------|
| Banner "Aprobar ahora →" | Navega a `/gestor/camareros` |
| Día del strip semanal (click) | Navega a `/gestor/servicios` con filtro de fecha — **opcional para MVP** |
| Botón "···" en fila de servicio | Muestra menú inline con: Ver equipo, Editar, Cancelar (igual que `ServicioGestorCard`) |
| "Nuevo servicio" | Navega a `/gestor/servicios/nuevo` |
| "Ver todos los camareros" | Navega a `/gestor/camareros` |

---

## Design tokens usados

Todos ya definidos en `tailwind.config.js`:

| Token | Valor | Uso |
|-------|-------|-----|
| `bone` | `#FAF7F2` | Fondo página |
| `cream` | `#F2EDE3` | Fondo tarjetas secundarias, date chip |
| `ink` | `#1A1815` | Texto principal, hoy en el strip |
| `ash` | `#6B655C` | Texto secundario, eyebrows |
| `line` | `#E3DCCC` | Bordes |
| `terra` | `#C2410C` | Acento, stat publicados, cupo bar |
| `sage` | `#5B6B4D` | Stat cubiertos, badge verde |
| `wine` | `#7C2D2A` | Banner alerta, stat pendientes |
| `font-display` | Fraunces | Títulos y números grandes |
| `font-mono` | Geist Mono | Eyebrows, badges, monospaced |
| `rounded-card` | `2px` | Todos los bordes |
| `tracking-editorial` | `-0.02em` | Títulos Fraunces |
| `tracking-wider2` | `0.18em` | Eyebrows mono |

---

## Componentes existentes a reutilizar

| Componente | Path | Uso |
|------------|------|-----|
| `<PageHeader>` | `shared/ui/PageHeader.tsx` | Header de la sección |
| `<Button>` | `shared/ui/Button.tsx` | Todos los botones |
| `<Badge>` | `shared/ui/Badge.tsx` | Estado servicio, conteo días |
| `<Card>` | `shared/ui/Card.tsx` | Wrapper opcional para tarjetas |
| `formatearFecha`, `formatearHora`, `etiquetaEvento` | `shared/format.ts` | Formateo de datos |
| `listarServiciosGestor`, `cancelarServicio` | `gestor/api.ts` | Queries ya implementadas |
| `listarCamareros`, `aprobarCamarero` | `gestor/api.ts` | Queries ya implementadas |

---

## Archivos de referencia

- `Dashboard Gestor.html` — Wireframe interactivo con las 3 variantes. La variante B es la elegida.

---

## Estado vacío

Si no hay servicios activos:
```tsx
<EmptyState
  titulo="Sin servicios activos."
  descripcion="Publica un nuevo servicio para que aparezca aquí."
  accion={<Link to="/gestor/servicios/nuevo"><Button>Publicar el primero</Button></Link>}
/>
```
