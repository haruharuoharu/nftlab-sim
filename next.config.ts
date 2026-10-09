import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // Next's Node trace selects pg-cloudflare's empty export; Workers need its workerd files too.
  outputFileTracingIncludes: { '/api/progress': ['./node_modules/pg-cloudflare/**/*'] },
};
export default config;
