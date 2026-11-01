export function databaseUrl(raw, env = process.env) {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.username || !url.password || url.hash) throw new Error();
    const ref = env.SUPABASE_PROJECT_REF;
    const host = env.DATABASE_POOLER_HOST;
    if (!ref && !host) return raw;
    if (!/^[a-z]{20}$/.test(ref || '') || !/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host || '')) throw new Error();
    if (url.pathname !== '/postgres') throw new Error();
    if (url.hostname === `db.${ref}.supabase.co`) {
      if (!/^[a-zA-Z_]\w*$/.test(url.username)) throw new Error();
      url.hostname = host;
      url.port = '5432';
      url.username = `${url.username}.${ref}`;
    } else if (url.hostname !== host || !url.username.endsWith(`.${ref}`)) {
      throw new Error();
    }
    if (!['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))) url.searchParams.set('sslmode', 'require');
    url.searchParams.set('connection_limit', '1');
    return url.toString();
  } catch {
    // Never allow a parser/driver exception to echo a connection string.
    throw new Error('DATABASE_URL configuration is invalid');
  }
}
