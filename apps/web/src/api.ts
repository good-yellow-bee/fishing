import type { BoardView, CatchRecord, CatchStat, Profile, SkillId, SpotId } from "@stillwater/shared";

export type Me = {
  user: { id: string; email: string; name: string };
  profile: Profile;
  level: number;
  spots: Record<SpotId, boolean>;
  catches: CatchRecord[];
  speciesStats: CatchStat[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `request failed (${response.status})`);
  }
  return data;
}

export function getMe() {
  return request<Me>("/api/me");
}

export function recordCatch(body: { speciesId: string; weight: number; spot: SpotId }) {
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
