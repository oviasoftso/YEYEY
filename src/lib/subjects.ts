/**
 * Compatibility shim — older modules imported a curriculum-aware subject catalog.
 * Waterfalls now derives a student's subject grid directly from their stream
 * (see STREAM_SUBJECTS in constants.ts), so this returns a flat ZIMSEC list.
 */
import type { Curriculum } from "./curriculum";
import { SCHOOL_SUBJECTS } from "./constants";

export interface SubjectDef {
  name: string;
  curricula: Curriculum[];
  syllabi: Partial<Record<Curriculum, string[]>>;
}

export const CORE_SUBJECTS: SubjectDef[] = SCHOOL_SUBJECTS.map((name) => ({
  name,
  curricula: ["ZIMSEC"],
  syllabi: { ZIMSEC: ["ZIMSEC O-Level (HBC)"] },
}));

export const getSubjectsForCurriculum = (_c: Curriculum): SubjectDef[] => CORE_SUBJECTS;
