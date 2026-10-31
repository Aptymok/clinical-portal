-- The application accesses these tables through server-side Prisma/Auth.js.
-- Supabase public clients must not read accounts, tokens or clinical records.
-- PostgreSQL table owners retain access; this does not grant any new access.
BEGIN;
DO $privacy$
DECLARE
  clinical_table text;
  public_role text;
BEGIN
  FOREACH clinical_table IN ARRAY ARRAY[
    'User',
    'Account',
    'Session',
    'Person',
    'Patient',
    'Provider',
    'Appointment',
    'Encounter',
    'Observation',
    'Diagnosis',
    'MedicationCatalog',
    'Medication',
    'Prescription',
    'PrescriptionItem',
    'LabResult',
    'Document',
    'Consent',
    'Reminder',
    'AuditLog',
    'DomainEvent',
    'AIInsight',
    'ResearchDataset',
    'ResearchDatasetVersion',
    'clinic_settings',
    'CalendarSource',
    'CanonicalCalendarEvent',
    'CalendarExternalEvent',
    'CalendarSyncEvent',
    'CalendarPropagationJob',
    'CalendarAlert',
    'CalendarConnectionSecret',
    '_prisma_migrations'
  ]
  LOOP
    IF to_regclass(format('public.%I', clinical_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', clinical_table);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', clinical_table);
      FOREACH public_role IN ARRAY ARRAY['anon', 'authenticated']
      LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = public_role) THEN
          EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', clinical_table, public_role);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END
$privacy$;
COMMIT;
