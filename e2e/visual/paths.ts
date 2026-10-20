import { join } from "node:path";

const here = __dirname;
export const STATE_FILE = join(here, ".auth", "state.json");
export const ANGLER_FILE = join(here, ".auth", "angler.json");
