-- CreateTable
CREATE TABLE "experiment_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetMetric" TEXT NOT NULL DEFAULT 'roc_auc',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "experiment_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_variants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trafficPct" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_assigns" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted" BOOLEAN,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "test_assigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiment_tests_status_idx" ON "experiment_tests"("status");

-- CreateIndex
CREATE INDEX "test_assigns_clienteId_idx" ON "test_assigns"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "test_assigns_variantId_clienteId_key" ON "test_assigns"("variantId", "clienteId");

-- AddForeignKey
ALTER TABLE "test_variants" ADD CONSTRAINT "test_variants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiment_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_assigns" ADD CONSTRAINT "test_assigns_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "test_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
