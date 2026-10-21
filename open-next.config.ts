import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No ISR or database is required for the browser-saved educational app.
export default defineCloudflareConfig();
