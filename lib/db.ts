import { Pool } from 'pg';
const globalDb=globalThis as unknown as {nftlabPool?:Pool};
export function db(){if(!process.env.DATABASE_URL)return null;return globalDb.nftlabPool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000});}
