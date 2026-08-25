import { useEffect, useRef, useState } from "react";

type Props = {
  clicks: number;
  ms: number;
  onSuccess: () => void;
  onFail: () => void;
};

export function MashChallenge({ clicks, ms, onSuccess, onFail }: Props) {
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(ms);
  const done = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  onSuccessRef.current = onSuccess;
  onFailRef.current = onFail;

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const remain = ms - (performance.now() - started);
      setLeft(Math.max(0, remain));
      if (remain <= 0 && !done.current) {
        done.current = true;
        onFailRef.current();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [ms]);

  const hit = () => {
    if (done.current) return;
    const next = count + 1;
    setCount(next);
    if (next >= clicks) {
      done.current = true;
      onSuccessRef.current();
    }
  };

  return (
    <div>
      <p>
        {count}/{clicks} clicks · {(left / 1000).toFixed(1)}s
      </p>
      <div className="bar" style={{ margin: "8px 0 12px" }}>
        <div className="fill" style={{ width: `${(left / ms) * 100}%` }} />
      </div>
      <button className="mash-btn" type="button" onClick={hit}>
        Strike
      </button>
    </div>
  );
}
