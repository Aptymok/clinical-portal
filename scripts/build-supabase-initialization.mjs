import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
// Emit a single atomic initialization from the repository's exact migrations.
// The SQL editor can apply this when a management connector is unavailable.
const destination=process.argv[2];
if(!destination)throw new Error('Provide an output SQL path');
const root=resolve('prisma/migrations');
const names=(await readdir(root)).filter(name=>/^\d{14}_/.test(name)).sort();
let sql=`BEGIN;\nSET LOCAL search_path = public;\nDO $empty$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') THEN RAISE EXCEPTION 'Initialization requires an empty public schema. Inspect existing tables before proceeding.'; END IF; END $empty$;\n`;
sql+=`CREATE TABLE public."_prisma_migrations" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0);\n`;
for(const name of names){
 const original=await readFile(resolve(root,name,'migration.sql'),'utf8');
 const checksum=createHash('sha256').update(original).digest('hex');
 sql+=`\n-- Repository migration: ${name}\n`+original.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm,'')+'\n';
 sql+=`INSERT INTO public."_prisma_migrations" (id,checksum,finished_at,migration_name,applied_steps_count) VALUES ('${randomUUID()}','${checksum}',now(),'${name}',1);\n`;
}
sql+=`COMMIT;\nSELECT count(*) AS applied_migrations FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL;\n`;
await writeFile(destination,sql,{mode:0o600});
console.log(JSON.stringify({output:destination,migrations:names.length,containsCredentials:false}));
