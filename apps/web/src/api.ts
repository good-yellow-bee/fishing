import {
  localDate,
  type BoardView,
  type CatchRecord,
  type CatchStat,
  type CatchSubmission,
  type DailyRequest,
  type Profile,
  type SkillId,
  type SpotId,
} from "@stillwater/shared";

export type Me = {
  user: { id: string; email: string; name: string };
  profile: Profile;
  level: number;
  spots: Record<SpotId, boolean>;
  catches: CatchRecord[];
  speciesStats: CatchStat[];
};

export type DailyRequestRow = DailyRequest & { progress: number; claimed: boolean };

export type DailyBoard = { day: string; requests: DailyRequestRow[] };

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

export function getMe() {
  return request<Me>("/api/me");
}

export function recordCatch(body: CatchSubmission) {
  return request<{ id: string; points: number; speciesId: string; weight: number }>("/api/catches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getBoard() {
  return request<BoardView>("/api/board");
}

export function buyUpgrade(skill: SkillId) {
  return request<{ profile: Profile }>("/api/upgrades", {
    method: "POST",
    body: JSON.stringify({ skill }),
  });
}

/** The server counts catches by this local day, so it also needs the UTC offsets at its midnight and the next. */
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

/** Takes the day the board was read for, so a claim just after midnight still finds its request. */
export function claimDailyRequest(id: string, day: string) {
  return request<{ reward: number }>(`/api/daily-requests/${encodeURIComponent(id)}/claim?${dayQuery(day)}`, {
    method: "POST",
  });
}
