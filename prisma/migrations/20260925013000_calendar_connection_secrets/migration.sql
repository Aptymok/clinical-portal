-- CreateTable
CREATE TABLE "CalendarConnectionSecret" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnectionSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnectionSecret_sourceId_key" ON "CalendarConnectionSecret"("sourceId");

-- AddForeignKey
ALTER TABLE "CalendarConnectionSecret" ADD CONSTRAINT "CalendarConnectionSecret_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "CalendarSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
