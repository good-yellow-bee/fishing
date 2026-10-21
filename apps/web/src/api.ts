import {
  localDate,
  type Derby,
  type Rumor,
  type WeeklyChallenge,
  type BoardView,
  type BadgeProgress,
  type BoardPeriod,
  type LodgeRelease,
  type LodgeTrack,
  type LodgeLost,
  type LostFound,
  type Giant,
  type StudyProgress,
  type TagReturn,
  type SpeciesRecord,
  type CatchRecord,
  type CatchStat,
  type CatchSubmission,
  type DailyRequest,
  type Profile,
  type SkillId,
  type SpotId,
} from "@stillwater/shared";
import { t } from "./i18n";

export type Me = {
  user: { id: string; email: string; name: string };
  profile: Profile;
  level: number;
  spots: Record<SpotId, boolean>;
  catches: CatchRecord[];
  speciesStats: CatchStat[];
  badges: BadgeProgress[];
  /** The angler's longest run of consecutive days with a fish. */
  longestStreak: number;
  /** The last 60 local days with a fish, oldest first, for the current streak on this device's calendar. */
  recentDays: string[];
  /** The UTC day's bag as it stood when read: the day's start, and its weights, heaviest first. */
  todayBag: { day: string; weights: number[] };
  /** The angler's let-go fish other anglers landed again this past week, newest first. */
  tagReturns: TagReturn[];
  /** The slam kinds the angler landed on each of the last few local days. */
  recentSlams: { day: string; speciesId: string }[];
};

export type DailyRequestRow = DailyRequest & { progress: number; claimed: boolean };

export type DailyBoard = { day: string; requests: DailyRequestRow[] };
export type WeeklyChallengeRow = WeeklyChallenge & { progress: number; claimed: boolean };
export type WeeklyBoard = { week: string; weekFish: string; challenges: WeeklyChallengeRow[]; rumor: Rumor & { clues: [boolean, boolean, boolean] } };

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * An error from the lodge or the sign-in service, in the player's language.
 * The server speaks English (and the code compares those words), so the
 * message is translated only here, where it is shown.
 */
export function errorText(message: string): string {
  const failed = /^request failed \((\d+)\)$/.exec(message);
  if (failed) return t("Request failed ({status})", { status: failed[1]! });
  return t(message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new ApiError(data.error ?? `request failed (${response.status})`, response.status);
  }
  return data;
}

let earlyMe: { at: number; me: Promise<Me> } | null = null;

/** A page load of the lake asks for the profile while the lake's code downloads; a getMe within 30 s takes that answer. */
export function prefetchMe() {
  const me = request<Me>("/api/me");
  me.catch(() => undefined);
  earlyMe = { at: Date.now(), me };
}

export function getMe() {
  const early = earlyMe;
  earlyMe = null;
  if (!early || Date.now() - early.at > 30_000) return request<Me>("/api/me");
  // Asked before the sign-in check, a signed-out answer is asked again; any other failure stands.
  return early.me.catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) return request<Me>("/api/me");
    throw err;
  });
}

export function recordCatch(body: CatchSubmission) {
  return request<{ id: string; points: number; speciesId: string; weight: number }>("/api/catches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Lets a saved catch go; it keeps its points. */
export function releaseCatch(requestId: string) {
  return request<{ id: string; released: true; bonus: number }>(`/api/catches/${encodeURIComponent(requestId)}/release`, { method: "POST" });
}

export function getBoard(period: BoardPeriod = "all") {
  return request<BoardView>(period === "all" ? "/api/board" : `/api/board?period=${period}`);
}

export type Study = StudyProgress & { claimed: boolean };

export function getStudies() {
  return request<{ studies: Study[] }>("/api/studies").then((body) => body.studies);
}

export function claimStudy(speciesId: string) {
  return request<{ speciesId: string; points: number }>(`/api/studies/${encodeURIComponent(speciesId)}/claim`, { method: "POST" });
}

/** A week's giant on the lodge board: who landed it, who let it go back if anyone did, and what landing it now pays. */
export type GiantStatus = Giant & { landedBy: string | null; landedAt: string | null; letGoBy: string | null; letGoByYou: boolean; bonus: number };

export function getGiants() {
  return request<{ giants: GiantStatus[] }>("/api/lodge/giants").then((body) => body.giants);
}

export function getBankWeek() {
  return request<{ counts: Partial<Record<SpotId, number>> }>("/api/lodge/bank-week").then((body) => body.counts);
}

export function getLodgeLost() {
  return request<{ lost: LodgeLost[]; mineFound: LostFound[] }>("/api/lodge/lost");
}

export function reportLost(fish: { id: string; speciesId: string; weight: number; spot: SpotId }) {
  return request<{ id: string }>("/api/lodge/lost", { method: "POST", body: JSON.stringify(fish) });
}

export function getLodgeReleased() {
  return request<{ released: LodgeRelease[] }>("/api/lodge/released").then((body) => body.released);
}

export function getLodgeTracks() {
  return request<{ tracks: LodgeTrack[] }>("/api/lodge/recent").then((body) => body.tracks);
}

export type DerbyBoard = {
  derby: Derby;
  running: boolean;
  entries: { rank: number; userId: string; displayName: string; weight: number }[];
  you: { rank: number; weight: number } | null;
  lastChampion: { fishId: string; displayName: string; weight: number } | null;
};

export type DayBagBoard = {
  day: string;
  entries: { rank: number; userId: string; displayName: string; total: number; count: number }[];
  you: { rank: number; total: number; count: number } | null;
};

export function getDayBag() {
  return request<DayBagBoard>("/api/board/bag");
}

export type StewardsBoard = {
  entries: { rank: number; userId: string; displayName: string; count: number }[];
  you: { rank: number; count: number } | null;
};

export function getStewards() {
  return request<StewardsBoard>("/api/board/stewards");
}

export function getDerby() {
  return request<DerbyBoard>("/api/board/derby");
}

export function getSpeciesRecords() {
  return request<{ records: SpeciesRecord[] }>("/api/board/records").then((body) => body.records);
}

export function buyUpgrade(skill: SkillId) {
  return request<{ profile: Profile }>("/api/upgrades", {
    method: "POST",
    body: JSON.stringify({ skill }),
  });
}

export function buyGroundbait() {
  return request<{ profile: Profile }>("/api/groundbait", { method: "POST" });
}

export function buyShiner() {
  return request<{ profile: Profile }>("/api/shiner", { method: "POST" });
}

export function buyWorm() {
  return request<{ profile: Profile }>("/api/worm", { method: "POST" });
}

export function buyAerator() {
  return request<{ profile: Profile }>("/api/aerator", { method: "POST" });
}

/** The local day as the instants it starts and ends, which stay right where clocks jump at midnight. */
export function dayQuery(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const from = new Date(year!, month! - 1, date!).toISOString();
  const to = new Date(year!, month! - 1, date! + 1).toISOString();
  return `day=${day}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export function getDailyRequests(day = localDate(new Date())) {
  return request<DailyBoard>(`/api/daily-requests?${dayQuery(day)}`);
}

export function getWeeklyChallenges(day = localDate(new Date())) {
  return request<WeeklyBoard>(`/api/weekly-challenges?day=${day}`);
}

/** Takes a day of the week the board was read for, so a claim just after Sunday midnight still finds its week. */
export function claimWeeklyChallenge(id: string, day: string) {
  return request<{ reward: number }>(`/api/weekly-challenges/${encodeURIComponent(id)}/claim?day=${day}`, { method: "POST" });
}

/** Takes the day the board was read for, so a claim just after midnight still finds its request. */
export function claimDailyRequest(id: string, day: string) {
  return request<{ reward: number; boardBonus: number }>(`/api/daily-requests/${encodeURIComponent(id)}/claim?${dayQuery(day)}`, {
    method: "POST",
  });
}
