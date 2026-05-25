-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('SERVICIO_CANCELADO', 'SERVICIO_EDITADO');

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "camareroId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "servicioId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "leidaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_camareroId_leidaEn_idx" ON "notificaciones"("camareroId", "leidaEn");

-- CreateIndex
CREATE INDEX "notificaciones_camareroId_creadaEn_idx" ON "notificaciones"("camareroId", "creadaEn" DESC);
