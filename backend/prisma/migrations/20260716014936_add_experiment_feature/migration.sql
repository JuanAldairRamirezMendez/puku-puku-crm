-- CreateTable
CREATE TABLE "experiment_runs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "bestModel" TEXT,
    "nCustomers" INTEGER,
    "nFeatures" INTEGER,
    "churnRate" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1" DOUBLE PRECISION,
    "rocAuc" DOUBLE PRECISION,
    "targetsMet" BOOLEAN,
    "metrics" TEXT,
    "parameters" TEXT,
    "log" TEXT,
    "modelPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "experiment_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'behavioral',
    "dataType" TEXT NOT NULL DEFAULT 'numeric',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_values" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiment_runs_status_idx" ON "experiment_runs"("status");

-- CreateIndex
CREATE INDEX "experiment_runs_createdAt_idx" ON "experiment_runs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_name_key" ON "feature_definitions"("name");

-- CreateIndex
CREATE INDEX "feature_values_clienteId_idx" ON "feature_values"("clienteId");

-- CreateIndex
CREATE INDEX "feature_values_featureId_idx" ON "feature_values"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_values_featureId_clienteId_key" ON "feature_values"("featureId", "clienteId");

-- AddForeignKey
ALTER TABLE "feature_values" ADD CONSTRAINT "feature_values_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
