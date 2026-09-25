-- CreateEnum
CREATE TYPE "CalendarCanonicalStatus" AS ENUM ('BUSY', 'CANCELLED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "CalendarSyncState" AS ENUM ('RECEIVED', 'RECONCILED', 'PROPAGATION_PENDING', 'COMPLETED', 'CONFLICT', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarPropagationState" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "CalendarSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "readAuthority" BOOLEAN NOT NULL DEFAULT false,
    "writeAuthority" BOOLEAN NOT NULL DEFAULT false,
    "realtimeBookingCheck" BOOLEAN NOT NULL DEFAULT false,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "externalRef" TEXT,
    "config" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalCalendarEvent" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "CalendarCanonicalStatus" NOT NULL DEFAULT 'BUSY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceOfTruthId" TEXT,
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarExternalEvent" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "canonicalEventId" TEXT,
    "correlationKey" TEXT,
    "providerRef" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadHash" TEXT,
    "rawMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarExternalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncEvent" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sourceId" TEXT,
    "externalEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "CalendarSyncState" NOT NULL DEFAULT 'RECEIVED',
    "canonicalEventId" TEXT,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarPropagationJob" (
    "id" TEXT NOT NULL,
    "syncEventId" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "targetSourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "state" "CalendarPropagationState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "externalReturn" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarPropagationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarAlert" (
    "id" TEXT NOT NULL,
    "canonicalEventId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarSource_providerType_idx" ON "CalendarSource"("providerType");

-- CreateIndex
CREATE INDEX "CalendarSource_enabled_idx" ON "CalendarSource"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalCalendarEvent_canonicalKey_key" ON "CanonicalCalendarEvent"("canonicalKey");

-- CreateIndex
CREATE INDEX "CanonicalCalendarEvent_providerRef_startsAt_endsAt_idx" ON "CanonicalCalendarEvent"("providerRef", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CanonicalCalendarEvent_status_idx" ON "CanonicalCalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CanonicalCalendarEvent_conflict_idx" ON "CanonicalCalendarEvent"("conflict");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarExternalEvent_sourceId_externalEventId_key" ON "CalendarExternalEvent"("sourceId", "externalEventId");

-- CreateIndex
CREATE INDEX "CalendarExternalEvent_canonicalEventId_idx" ON "CalendarExternalEvent"("canonicalEventId");

-- CreateIndex
CREATE INDEX "CalendarExternalEvent_providerRef_startsAt_endsAt_idx" ON "CalendarExternalEvent"("providerRef", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncEvent_dedupeKey_key" ON "CalendarSyncEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "CalendarSyncEvent_state_receivedAt_idx" ON "CalendarSyncEvent"("state", "receivedAt");

-- CreateIndex
CREATE INDEX "CalendarSyncEvent_canonicalEventId_idx" ON "CalendarSyncEvent"("canonicalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarPropagationJob_syncEventId_targetSourceId_action_key" ON "CalendarPropagationJob"("syncEventId", "targetSourceId", "action");

-- CreateIndex
CREATE INDEX "CalendarPropagationJob_state_createdAt_idx" ON "CalendarPropagationJob"("state", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarAlert_status_createdAt_idx" ON "CalendarAlert"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CalendarExternalEvent" ADD CONSTRAINT "CalendarExternalEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CalendarSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarExternalEvent" ADD CONSTRAINT "CalendarExternalEvent_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalCalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncEvent" ADD CONSTRAINT "CalendarSyncEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CalendarSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncEvent" ADD CONSTRAINT "CalendarSyncEvent_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalCalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarPropagationJob" ADD CONSTRAINT "CalendarPropagationJob_syncEventId_fkey" FOREIGN KEY ("syncEventId") REFERENCES "CalendarSyncEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarPropagationJob" ADD CONSTRAINT "CalendarPropagationJob_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalCalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarPropagationJob" ADD CONSTRAINT "CalendarPropagationJob_targetSourceId_fkey" FOREIGN KEY ("targetSourceId") REFERENCES "CalendarSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAlert" ADD CONSTRAINT "CalendarAlert_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalCalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
