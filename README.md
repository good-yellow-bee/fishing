# Stillwater

A local field log for after the trip, and a browser fishing game on a northern lake.

Open [http://localhost:5173](http://localhost:5173). The book stays in this browser: spots, trips, and catches, with a sample week already written in. Nothing in the log is sent to a server.

The lake game is at [http://localhost:5173/play](http://localhost:5173/play). Register locally, then walk the shore, cast, and fight whatever takes the hook.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=000)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)

## Play

- Walk the path from the shack to the **dock**, **reeds**, or **drop-off**
- Cast into the water that belongs to that stance (range-limited)
- Dawn / day / dusk / night change which fish are likely to bite
- Land fish for points; firsts and personal bests stamp the field guide
- Spend points on **strength**, **accuracy**, and **patience** at the shack (`E`)
- Drop-off unlocks at angler level 3
- Catch log and lodge board are in the HUD

Thirteen species, from golden shiner up to sturgeon.

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrows | Walk (idle or after a result) |
| Right-drag | Look |
| Click water and hold, or hold `Space` | Charge a cast; release to throw |
| Click / `Space` on the nibble | Set the hook |
| Hold click / `Space` during the fight | Reel |
| `E` or click the shack | Open the shop |
| `Esc` | Close the shop |

Walk only on shore. Casts fail if you are on the trail, out of range, or aiming at a different basin.

## Quick start

Needs [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) 10.

```bash
pnpm install
pnpm dev
```

That starts:

- web — [http://localhost:5173](http://localhost:5173)
- api — [http://127.0.0.1:3001](http://127.0.0.1:3001)

The field log needs only the web app. For the lake, register an account at `/play`. Sessions are cookies; SQLite lives at `apps/api/data/stillwater.sqlite` (gitignored).

```bash
pnpm test        # shared lake / catch / board rules
pnpm typecheck
```

Force a lake hour while developing: `http://localhost:5173/?hour=dawn` (`day`, `dusk`, `night`).

## Layout

```
apps/web            Vite + React + Three.js client
apps/api            Hono API, better-auth, SQLite
packages/shared     Lake geometry, fish, hours, progression (source of truth)
```

Vite proxies `/api` to the API. Catch validation and upgrades run on the server against the same shared rules as the client.

Dev auth defaults (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`) are fine on localhost. Change the secret before exposing the API.

## Credits

Nature kit, character, and rod models from [Kenney](https://kenney.nl).
