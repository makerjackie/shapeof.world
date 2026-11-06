// The three.js town as a Remotion layer: renders the frame synchronously from film time.
// The models load once (async); the first frame waits for them.
import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { town, W, H } from "./town/engine";

export const TownView: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => (town().isReady ? null : delayRender("town models", { timeoutInMilliseconds: 180000 })));
  useLayoutEffect(() => {
    const c = town().canvas;
    ref.current!.appendChild(c);
    if (handle !== null)
      town()
        .ready.then(() => {
          town().render(town().lastT);
          continueRender(handle);
        })
        .catch((e) => {
          console.error("town load failed", e);
          continueRender(handle);
        });
    return () => {
      if (c.parentElement === ref.current) ref.current?.removeChild(c);
    };
  }, []);
  useLayoutEffect(() => {
    town().render(t);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};
