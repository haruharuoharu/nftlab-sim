import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { freshProgress } from '../lib/scenarios';
test('PostgreSQL persists JSON and isolates sessions and modes',{skip:!process.env.DATABASE_URL},async()=>{
 const pool=new Pool({connectionString:process.env.DATABASE_URL});const id=randomUUID();
 try{await pool.query('INSERT INTO learning_progress(session_id,namespace,progress) VALUES($1,$2,$3)',[id,'demo',JSON.stringify(freshProgress())]);
 const result=await pool.query('SELECT progress FROM learning_progress WHERE session_id=$1 AND namespace=$2',[id,'demo']);assert.deepEqual(result.rows[0].progress,freshProgress());
 for(const [session,namespace] of [[id,'devnet'],[randomUUID(),'demo']]){const other=await pool.query('SELECT progress FROM learning_progress WHERE session_id=$1 AND namespace=$2',[session,namespace]);assert.equal(other.rowCount,0);}
 }finally{await pool.query('DELETE FROM learning_progress WHERE session_id=$1',[id]);await pool.end();}
});
