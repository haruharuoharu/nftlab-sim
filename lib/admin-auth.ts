import {timingSafeEqual} from 'node:crypto';
import {analyticsEnvironment} from './analytics-server';
export function adminEnvironment(request:Request){
 const env=analyticsEnvironment();const actual=Buffer.from(request.headers.get('authorization')||'');const expected=Buffer.from(`Bearer ${env.ANALYTICS_REPORT_TOKEN||''}`);
 return env.ANALYTICS_REPORT_TOKEN&&actual.length===expected.length&&timingSafeEqual(actual,expected)?env:null;
}
