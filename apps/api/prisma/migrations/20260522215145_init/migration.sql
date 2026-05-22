-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('GESTOR', 'CAMARERO');

-- CreateEnum
CREATE TYPE "EstadoCuentaCamarero" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('PUBLICADO', 'CUBIERTO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('BODA', 'CORPORATIVO', 'CENA_PRIVADA', 'COCTEL', 'BANQUETE', 'OTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "camareroId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camareros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "estadoCuenta" "EstadoCuentaCamarero" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camareros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "duracionHoras" INTEGER NOT NULL,
    "lugarNombre" TEXT NOT NULL,
    "lugarDireccion" TEXT NOT NULL,
    "tipoEvento" "TipoEvento" NOT NULL,
    "cuposTotales" INTEGER NOT NULL,
    "uniforme" TEXT,
    "notas" TEXT,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'PUBLICADO',
    "version" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "camareroId" TEXT NOT NULL,
    "aceptadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_camareroId_key" ON "usuarios"("camareroId");

-- CreateIndex
CREATE UNIQUE INDEX "camareros_email_key" ON "camareros"("email");

-- CreateIndex
CREATE INDEX "servicios_estado_fechaInicio_idx" ON "servicios"("estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "asignaciones_camareroId_idx" ON "asignaciones"("camareroId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_servicioId_camareroId_key" ON "asignaciones"("servicioId", "camareroId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_camareroId_fkey" FOREIGN KEY ("camareroId") REFERENCES "camareros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_camareroId_fkey" FOREIGN KEY ("camareroId") REFERENCES "camareros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
