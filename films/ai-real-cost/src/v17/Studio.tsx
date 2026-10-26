import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { H, studio, StudioState, W } from "./stage";

let loaded = false;

// The studio's WebGL canvas. The first frame waits for the book lettering's fonts; after that every frame renders
// synchronously inside the layout effect, so it is complete before Remotion takes its screenshot.
export const Studio: React.FC<{ s: StudioState }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => (loaded ? null : delayRender("studio")));
  const done = useRef(false);
  useLayoutEffect(() => {
    const e = studio();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    if (loaded) {
      studio().render(s);
      return;
    }
    studio().ready.then(() => {
      loaded = true;
      studio().render(s);
      if (handle !== null && !done.current) {
        done.current = true;
        continueRender(handle);
      }
    });
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};
