-- CreateEnum
CREATE TYPE "CanalOrigen" AS ENUM ('PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA');

-- CreateEnum
CREATE TYPE "EstadoInteraccion" AS ENUM ('RESUELTO', 'EN_SEGUIMIENTO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "Satisfaccion" AS ENUM ('SATISFECHO', 'NEUTRO', 'INSATISFECHO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('COLABORADOR', 'ADMINISTRADOR', 'GERENTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'COLABORADOR',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "canalOrigen" "CanalOrigen" NOT NULL,
    "productoFavorito" TEXT,
    "restriccionesAlergias" TEXT,
    "consentimientoLey29733" BOOLEAN NOT NULL DEFAULT false,
    "fechaConsentimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacciones" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canal" "CanalOrigen" NOT NULL,
    "resumenPedido" TEXT,
    "montoSoles" DECIMAL(10,2),
    "colaboradorId" TEXT NOT NULL,
    "estado" "EstadoInteraccion" NOT NULL DEFAULT 'PENDIENTE',
    "actualizoPreferencia" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "satisfaccion" "Satisfaccion",
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "interacciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_key" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "clientes_nombreCompleto_idx" ON "clientes"("nombreCompleto");

-- CreateIndex
CREATE INDEX "interacciones_clienteId_idx" ON "interacciones"("clienteId");

-- CreateIndex
CREATE INDEX "interacciones_fecha_idx" ON "interacciones"("fecha");

-- AddForeignKey
ALTER TABLE "interacciones" ADD CONSTRAINT "interacciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacciones" ADD CONSTRAINT "interacciones_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
