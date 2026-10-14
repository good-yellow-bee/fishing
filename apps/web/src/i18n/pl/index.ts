import { PL_CONTENT } from "./content";
import { PL_FIELD } from "./field";
import { PL_GAME } from "./game";
import { PL_PAGES } from "./pages";

/** A Polish line, or [one, few, many] for a line counted with `tn`. */
export type PlLine = string | readonly [string, string, string];
export type PlBook = Record<string, PlLine>;

export const PL: PlBook = { ...PL_CONTENT, ...PL_GAME, ...PL_FIELD, ...PL_PAGES };
