import { describe, expect, it } from 'vitest';
import { databaseUrl } from './database-url.mjs';

const options = { SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', DATABASE_POOLER_HOST: 'aws-1-us-west-2.pooler.supabase.com' };
describe('server database connection', () => {
  it('preserves encoded credentials while routing the same project through its IPv4 session pooler', () => {
    const result = new URL(databaseUrl('postgresql://postgres:a%40b%3Ac%2F%23@db.abcdefghijklmnopqrst.supabase.co:5432/postgres', options)!);
    expect(result.hostname).toBe('aws-1-us-west-2.pooler.supabase.com');
    expect(result.username).toBe('postgres.abcdefghijklmnopqrst');
    expect(result.password).toBe('a%40b%3Ac%2F%23');
    expect(result.searchParams.get('sslmode')).toBe('require');
    expect(result.searchParams.get('connection_limit')).toBe('1');
  });
  it('refuses mismatched projects or malformed credentials without disclosing secrets', () => {
    for (const raw of ['postgresql://postgres:private-value@db.wrong.supabase.co:5432/postgres', 'postgresql://private-value@db.abcdefghijklmnopqrst.supabase.co:5432/postgres', 'not-a-url-private-value']) {
      expect(() => databaseUrl(raw, options)).toThrow('DATABASE_URL configuration is invalid');
      try { databaseUrl(raw, options); } catch (error) { expect(String(error)).not.toContain('private-value'); }
    }
  });
  it('does not redirect a local database or require a database for static builds', () => {
    expect(databaseUrl(undefined, {})).toBeUndefined();
    expect(databaseUrl('postgresql://postgres:test@localhost:5432/clinic_qa', {})).toBe('postgresql://postgres:test@localhost:5432/clinic_qa');
  });
  it('does not double suffix an already pooled user or weaken TLS', () => {
    const result = new URL(databaseUrl('postgresql://postgres.abcdefghijklmnopqrst:example@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=verify-full', options)!);
    expect(result.username).toBe('postgres.abcdefghijklmnopqrst');
    expect(result.searchParams.get('sslmode')).toBe('verify-full');
  });
});
