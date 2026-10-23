import React from "react";
import { AbsoluteFill } from "remotion";
import { Corner } from "../v2/kit";
import { bar } from "../v3/timing";
import { Dust, SkyBg } from "./atmos";
import { Clip, Finish } from "./engine";
import { OpenFine, OpenWorld, Rewind, Title4 } from "./open4";
import { Sound4 } from "./sound4";
import { Coaster, Panic4, Pour, TowerCrack, TowerRise, WallJump } from "./mania4";
import { Bill, Factory4 } from "./bill4";
import { Asking4, Climb4, Notices4 } from "./fear4";
import { Answer4, EndCard4, Hungrier4, Rise4, Sky4 } from "./finale4";
import { But4, Corridor4, Countries4, Faster4, Flat4, Handoff4, Rows4, Seasons4 } from "./truth4";
import { DoorAndMedals, Exam4, Globe, Swarm } from "./wonder4";

// 《AI 到底改变了什么》 v4 (PLAN-v4.md): the v3 story and music cut, new picture. Shots overlap where one hands over
// to the next; each shot decides its own camera and where its words sit.

const B = (n: number) => bar(n);

export const Film4: React.FC<{ until?: number }> = ({ until = Infinity }) => (
  <AbsoluteFill style={{ background: "#050607", overflow: "hidden" }}>
    <SkyBg />
    <Dust />
    <Clip a={0} b={B(8)}>
      <OpenWorld />
    </Clip>
    <Rewind />
    <Title4 />
    <Swarm />
    <DoorAndMedals />
    <Exam4 />
    <Globe />
    <Pour />
    <TowerRise />
    <WallJump />
    <Panic4 />
    <TowerCrack />
    <Coaster />
    <Bill />
    <Factory4 />
    <Climb4 />
    <Asking4 />
    <Notices4 />
    <But4 />
    <Flat4 />
    <Corridor4 />
    <Rows4 />
    <Countries4 />
    <Handoff4 />
    <Seasons4 />
    <Faster4 />
    <Sky4 />
    <Hungrier4 />
    <Rise4 />
    <Answer4 />
    <EndCard4 />
    <OpenFine />
    <Corner until={B(104)} />
    <Finish />
    <Sound4 until={until} />
  </AbsoluteFill>
);

export const SAMPLE4_END = B(36) + 0.3;
export const Sample4: React.FC = () => <Film4 until={SAMPLE4_END} />;
