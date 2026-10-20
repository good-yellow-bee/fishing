import { useEffect, useState } from "react";
import { errorText } from "../api";

/** A lodge board card's data, read once when it shows, and the error it failed with, said in the reader's language. */
export function useBoardRead<T>(read: () => Promise<T>): { board: T | null; error: string } {
  const [board, setBoard] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    read()
      .then((next) => live && setBoard(next))
      .catch((err: Error) => live && setError(errorText(err.message)));
    return () => {
      live = false;
    };
    // Read once a mount: each card passes the same fetcher for its whole life.
  }, []);
  return { board, error };
}

/** A board's top ten, the angler's own row marked, each row worded by the card. */
export function RankedList<T extends { rank: number; userId: string }>({ entries, youRank, row }: { entries: readonly T[]; youRank: number | null; row: (entry: T) => string }) {
  return (
    <ol className="derby-entries">
      {entries.map((entry) => (
        <li key={entry.userId} data-you={youRank === entry.rank ? "1" : "0"}>
          {row(entry)}
        </li>
      ))}
    </ol>
  );
}
