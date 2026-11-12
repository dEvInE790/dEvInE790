import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default configuration: no R2 bucket, KV namespace or other storage needs to
// be created. Pages are rendered by the Worker on request (they are light and
// render in tens of milliseconds); static files are served from Workers assets.
export default defineCloudflareConfig({});
