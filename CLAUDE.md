# CLAUDE.md — Reglas obligatorias para agentes en Cama-Pro

Este archivo es **vinculante** para cualquier agente (Claude u otro) que escriba codigo en este repositorio. Leelo antes de tocar nada. Las reglas no son sugerencias.

---

## 0. Contexto del proyecto en una frase

Cama-Pro gestiona un grupo de **camareros** que se ofrecen a **restaurantes y casas de eventos**. El **gestor** publica **servicios** (trabajos con fecha, lugar, N cupos) y los **camareros** los aceptan por orden de llegada. MVP enfocado en quitar trabajo manual al gestor.

Glosario, agregados, estados e invariantes: ver `docs/dominio.md` y memoria del proyecto. **El lenguaje ubicuo es en espanol** (`Servicio`, `Camarero`, `Gestor`, `Asignacion`, `cuposTotales`, `cuposOcupados`). No traducir terminos del dominio a ingles en el codigo.

---

## 1. Arquitectura — reglas duras

### 1.1 Capas (Clean Architecture)

Cada modulo (`identity`, `staff`, `bookings`, ...) tiene exactamente cuatro capas, en este orden de dependencia:

```
presentation  →  application  →  domain
       ↘             ↗
        infrastructure
```

- **`domain/`** — entidades, value objects, agregados, eventos de dominio, INTERFACES de repositorio. **No importa nada de fuera del dominio.** Cero `express`, cero `prisma`, cero `zod`, cero HTTP. Solo TypeScript puro.
- **`application/`** — casos de uso (un caso de uso = una clase con un metodo `execute`). Orquesta el dominio. Puede usar interfaces de repositorio (que viven en `domain/`).
- **`infrastructure/`** — implementaciones concretas: repositorios con Prisma, adaptadores de email, JWT, etc. Es la unica capa que puede importar Prisma.
- **`presentation/`** — controllers, routes, validacion de entrada con Zod. Llama a casos de uso. No contiene logica de negocio.

**Regla de oro:** si una capa interior importa de una exterior, es un bug. Sin excepciones.

### 1.2 Modulos (bounded contexts)

Un modulo **NUNCA** importa codigo interno de otro modulo. Si necesitas algo de otro contexto:

1. Publica una **interfaz publica** en `modules/<otro>/index.ts` y consumela.
2. O comunica por **evento de dominio** via el `EventBus` compartido.

Importar `modules/staff/domain/Camarero` desde `modules/bookings/...` esta **prohibido**. Esto es lo que garantiza extraer modulos a microservicios sin reescribir.

### 1.3 Dominio sin framework

- El dominio **no sabe** que existe HTTP, Express, Prisma, JWT, Zod, ni React.
- Los agregados protegen sus invariantes en sus propios metodos (`Servicio.aceptar(camareroId)`), no en el caso de uso ni en el controller.
- Si una invariante depende de datos de otro agregado, la valida un **Domain Service**, no el caso de uso.

---

## 2. Codigo limpio — reglas concretas (no genericas)

### 2.1 Lo que NO se hace

- **No `any`**. Si crees que necesitas `any`, lo que necesitas es modelar mejor. Usa `unknown` + narrowing si la entrada es realmente desconocida.
- **No comentarios obvios.** `// crea un usuario` arriba de `crearUsuario()` es ruido. Solo se comenta el **por que** no-obvio (un workaround, una invariante sutil, una decision con contexto).
- **No codigo muerto.** Nada de `// TODO`, funciones sin usar, imports comentados. Si no se usa, se borra. El git history existe.
- **No abstraccion prematura.** Tres lineas duplicadas estan bien. Un `BaseGenericRepository<T>` con cinco capas de generics para tres entidades **no** esta bien.
- **No defensive coding sin causa.** No validar lo que ya validaste en el borde. No envolver todo en `try/catch` por costumbre. Solo se valida en los limites del sistema (entrada HTTP, lectura de BD, llamada externa).
- **No mezclar idiomas en el dominio.** `Service`, `Waiter`, `assignWaiter()` esta prohibido. Es `Servicio`, `Camarero`, `aceptarServicio()`. En infraestructura/tecnico esta bien usar ingles (`Repository`, `UseCase`, `findById`).
- **No emojis en codigo, commits, ni nombres de archivo.**
- **No archivos `utils.ts` ni `helpers.ts`.** Si una funcion no tiene hogar claro, todavia no entendiste el dominio. Pon la funcion donde pertenece.

### 2.2 Lo que SI se hace

- **Naming explicito.** `aceptarServicio` > `accept` > `doIt`. Un nombre de funcion debe leer como una intencion de negocio.
- **Funciones cortas con un proposito.** Si una funcion necesita scroll para verse entera, casi siempre esta haciendo dos cosas.
- **Errores tipados.** Lanza errores de dominio especificos (`CupoLlenoError`, `CamareroNoAprobadoError`), no `throw new Error("algo paso")`. Define una jerarquia en `shared/errors/`.
- **Result pattern donde aporte.** Para casos de uso con multiples salidas esperadas (no excepcionales), devolver `Result<Exito, Fallo>` es mas claro que excepciones.
- **Validacion en el borde.** Zod en `presentation/` para entrada HTTP. Una vez dentro, los tipos son confiables. No re-validar en cada capa.
- **DTOs separados de entidades.** La entidad `Servicio` no se serializa a JSON tal cual. Hay un mapper a `ServicioDTO` (definido en `@cama-pro/shared-types`).

---

## 3. Concurrencia e integridad

### 3.1 Aceptacion de servicio (caso critico)

Dos camareros aceptando el ultimo cupo al mismo tiempo **NO PUEDE** resultar en sobreasignacion. Implementacion obligatoria:

1. Transaccion explicita.
2. **Bloqueo optimista** con campo `version` en `Servicio`, O **bloqueo pesimista** (`SELECT ... FOR UPDATE` via Prisma `$queryRaw` si hace falta).
3. Re-leer el agregado dentro de la transaccion.
4. Validar invariantes (`cuposOcupados < cuposTotales`, `estado === "PUBLICADO"`).
5. Insertar `Asignacion` y actualizar `Servicio.version + 1` en la misma transaccion.
6. Si la version cambio, abortar y devolver error de concurrencia.

No "ya lo arreglamos despues". **Desde la primera version.**

### 3.2 Migraciones de BD

- Toda evolucion de esquema pasa por `prisma migrate dev` en local y `prisma migrate deploy` en produccion.
- **Prohibido** `prisma db push` fuera de prototipado ultra-temprano.
- Una migracion = un cambio cohesivo con nombre descriptivo (`add_servicio_version_for_optimistic_lock`).

---

## 4. Tests

- **Dominio:** tests unitarios obligatorios para todo agregado con invariantes no triviales. Vitest. Sin base de datos.
- **Casos de uso:** tests con repositorios en memoria (fakes), no mocks de Prisma. Si el dominio cambia, los tests no deben cambiar por razones tecnicas.
- **Integracion (API + Postgres):** tests para los caminos felices y los conflictos de concurrencia del modulo `bookings`. Aqui SI hay BD real (o testcontainers).
- **NO mockear la BD en tests de integracion.** Si un test "pasa con mock pero falla en prod", el test no vale.
- **Cobertura no es objetivo.** Tests que prueban getters no aportan. Tests que prueban invariantes y reglas de transicion si.

---

## 5. Frontend — reglas especificas

### 5.1 Skills obligatorios (lectura previa a tocar `apps/web/`)

Dos skills viven en `.agents/skills/` y son **lectura obligatoria** antes de escribir o modificar cualquier codigo en `apps/web/`:

- **`.agents/skills/frontend-design/SKILL.md`** — direccion estetica del proyecto.
  Resumen vinculante: tipografia distintiva (no Inter ni Roboto), color con jerarquia clara (no gradientes morados sobre blanco), motion con proposito (page load orquestado mejor que micro-interacciones dispersas), composicion intencional. **Prohibido el "AI slop" generico.**
- **`.agents/skills/vercel-react-best-practices/SKILL.md`** — 70 reglas de performance ordenadas por impacto.
  Aplicar **al menos** las categorias CRITICAL (`async-*`, `bundle-*`) y HIGH (`server-*`). Si una regla concreta aplica al codigo que estas escribiendo, no la ignores con "es solo un MVP".

Si el codigo nuevo no cumple ambos skills, **no esta terminado** (ver seccion 8).

### 5.2 Reglas tecnicas duras

- React + TypeScript estricto. **Cero `any`** tambien aqui.
- Estado servidor con **React Query**. No `useState` para datos del backend.
- Componentes de presentacion **separados** de contenedores con logica. Un componente que hace fetch Y renderiza Y maneja formularios necesita partirse.
- Validacion de formularios con los Zod schemas de `@cama-pro/shared-types`. **No duplicar reglas** entre front y back.
- Tailwind para estilos. **No CSS modules ni styled-components.** Decision tomada, no se debate por componente.
- Mobile-first. Si un componente no funciona en 360px de ancho, no esta terminado.
- Accesibilidad basica: roles ARIA, labels en inputs, contraste suficiente. No despues, ahora.
- **Sin barrel imports** (`import { x } from "./lib"` que reexporta todo) — rompen tree-shaking; ver `vercel-react-best-practices/rules/bundle-barrel-imports.md`.

---

## 6. Git y commits

- Mensajes en **espanol**, modo imperativo. `agregar login de camarero` no `feat: added login`.
- Convencional commits opcional pero coherente: si se usa, se usa siempre.
- Un commit = un cambio logico. No mezclar refactor + feature + fix en un solo commit.
- **Nunca** `--no-verify` para saltar hooks. Si el hook falla, se arregla la causa.
- No commitear `.env`, secretos, binarios, o `node_modules`.

---

## 7. Comunicacion con el usuario

- **Idioma: espanol siempre.**
- El usuario actua como PM/intermediario con el cliente final. Espera analisis y propuestas, no formularios genericos de "elige una opcion".
- Antes de escribir codigo nuevo: confirmar que encaja con el modelo de dominio y los bounded contexts existentes. Si no encaja, **proponer** como extender el dominio, no improvisar.
- Si una decision del usuario rompe una regla de este archivo, **avisar explicitamente** del trade-off antes de implementar. No silenciar la regla por complacer.

---

## 8. Definicion de "terminado"

Una tarea esta **terminada** solo si:

1. Cumple las reglas de este archivo.
2. Tipa estrictamente (sin `any`, sin `@ts-ignore` sin justificacion en comentario).
3. Tiene tests donde el punto 4 los exige.
4. `npm run build` y `npm test` pasan.
5. Si toca UI: probada manualmente en mobile (devtools 360px) y desktop, **Y** los dos skills de la seccion 5.1 aplicados (no aspiracionalmente, en el codigo).
6. Si toca BD: la migracion aplica limpia desde cero (`db:migrate` desde BD vacia).

"Funciona en mi maquina" no es terminado.

---

## 9. Cuando dudes

Lee el dominio (`docs/dominio.md`), lee el agregado, lee el caso de uso. Si la duda persiste, **pregunta al usuario** antes de inventar. Improvisar arquitectura es como se pudren los proyectos.
