import path from "node:path";
import { config } from "dotenv";

// Scripts run outside Next.js, so load the repo-root .env ourselves.
config({ path: path.join(import.meta.dirname, "../../../.env"), quiet: true });
