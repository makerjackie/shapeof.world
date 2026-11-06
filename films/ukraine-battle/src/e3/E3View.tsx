// The three.js 样片E scene as a Remotion layer: waits for the assets once, then renders each frame synchronously.
import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { e3, H, W } from "./engine";

export const E3View: React.FC<{ f: number; style?: React.CSSProperties }> = ({ f, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(() => e3().isReady);
  const [handle] = useState(() => (e3().isReady ? null : delayRender("e3 assets", { timeoutInMilliseconds: 240000 })));
  useLayoutEffect(() => {
    if (ok) return;
    e3()
      .ready.then(() => {
        setOk(true);
        if (handle !== null) continueRender(handle);
      })
      .catch((err) => {
        console.error("e3 load failed", err);
        throw err;
      });
  }, [ok, handle]);
  useLayoutEffect(() => {
    const c = e3().canvas;
    ref.current!.appendChild(c);
    return () => {
      if (c.parentElement === ref.current) ref.current?.removeChild(c);
    };
  }, []);
  useLayoutEffect(() => {
    if (ok) e3().render(f);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, ...style }} />;
};
