import { Hono } from "hono";
import { STUDY_REWARD, studyProgress } from "@stillwater/shared";
import { claimStudy, listStudyClaims, listStudyFacts } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const studyRoutes = new Hono();

function studies(userId: string) {
  const claimed = new Set(listStudyClaims(userId));
  return studyProgress(listStudyFacts(userId)).map((study) => ({ ...study, claimed: claimed.has(study.speciesId) }));
}

/** Each landed kind's studies and whether they were paid, read when the field guide opens. */
studyRoutes.get("/studies", (c) => {
  const user = c.get("user") as SessionUser;
  return c.json({ studies: studies(user.id) });
});

/** Pays a kind's studies once all three are done. */
studyRoutes.post("/studies/:speciesId/claim", (c) => {
  const user = c.get("user") as SessionUser;
  const speciesId = c.req.param("speciesId");
  const study = studies(user.id).find((one) => one.speciesId === speciesId);
  if (!study || !study.done) return c.json({ error: "studies not finished" }, 409);
  const paid = claimStudy(user.id, speciesId, STUDY_REWARD);
  if (paid === null) return c.json({ error: "studies already paid" }, 409);
  return c.json({ speciesId, points: paid });
});
