/**
 * Legacy curriculum context — Waterfalls only runs ZIMSEC.
 * Kept as a stable no-op shim so existing imports compile.
 */
import { ReactNode } from "react";

export type Curriculum = "ZIMSEC";

export interface CurriculumMeta {
  id: Curriculum;
  label: string;
  fullLabel: string;
  description: string;
}

export const CURRICULA: CurriculumMeta[] = [
  {
    id: "ZIMSEC",
    label: "ZIMSEC",
    fullLabel: "ZIMSEC O-Level (HBC)",
    description: "Heritage-Based Curriculum — Waterfalls Academy.",
  },
];

export const CurriculumProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useCurriculum = () => ({
  curriculum: "ZIMSEC" as Curriculum,
  setCurriculum: (_: Curriculum) => {},
  meta: CURRICULA[0],
});
