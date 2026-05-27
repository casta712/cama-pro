-- Generaliza notificaciones de camareroId -> usuarioId (cualquier Usuario,
-- incluyendo gestores) y agrega el nuevo tipo SERVICIO_LIBERADO para los
-- avisos al gestor cuando un camarero abandona su asignacion.

-- 1) Nueva columna nullable (backfill antes de marcar NOT NULL).
ALTER TABLE "notificaciones" ADD COLUMN "usuarioId" TEXT;

-- 2) Backfill: cada notificacion existente apunta al Usuario que tiene
--    ese camareroId. Todas las notificaciones actuales son de camareros,
--    asi que la traduccion es 1-1.
UPDATE "notificaciones" n
SET "usuarioId" = u.id
FROM "usuarios" u
WHERE u."camareroId" = n."camareroId";

-- 3) Si quedo alguna huerfana (camarero borrado), no podemos cumplir el
--    NOT NULL. En MVP no deberia pasar; si ocurre, descartamos esos avisos.
DELETE FROM "notificaciones" WHERE "usuarioId" IS NULL;

-- 4) Bloquear futuros nulls.
ALTER TABLE "notificaciones" ALTER COLUMN "usuarioId" SET NOT NULL;

-- 5) Indices nuevos sobre usuarioId, y limpieza de los viejos.
DROP INDEX "notificaciones_camareroId_leidaEn_idx";
DROP INDEX "notificaciones_camareroId_creadaEn_idx";

CREATE INDEX "notificaciones_usuarioId_leidaEn_idx" ON "notificaciones"("usuarioId", "leidaEn");
CREATE INDEX "notificaciones_usuarioId_creadaEn_idx" ON "notificaciones"("usuarioId", "creadaEn" DESC);

-- 6) Borrar la columna antigua.
ALTER TABLE "notificaciones" DROP COLUMN "camareroId";

-- 7) Nuevo valor del enum.
ALTER TYPE "TipoNotificacion" ADD VALUE 'SERVICIO_LIBERADO';
