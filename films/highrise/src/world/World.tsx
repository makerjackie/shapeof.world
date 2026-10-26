import React, { useLayoutEffect, useRef } from "react";
import { H, W } from "./camera";
import { engine, WorldState } from "./engine";

// The one WebGL world of the film. Rendering is synchronous inside the layout effect, so the frame is complete
// before Remotion takes its screenshot.
export const World: React.FC<{ s: WorldState }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = engine();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    engine().render(s);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

// Household state for the hero: 132 homes x [lit, yes, no, gone].
export const makeHH = (f: (i: number, floor: number, unit: number) => [number, number, number, number]) => {
  const a = new Float32Array(132 * 4);
  for (let i = 0; i < 132; i++) a.set(f(i, Math.floor(i / 4), i % 4), i * 4);
  return a;
};
