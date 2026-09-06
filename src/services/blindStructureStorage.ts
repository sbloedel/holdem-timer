import type { BlindStructure } from '../models/BlindStructure';
import type { TimerLevel } from '../models/TimerLevel';
import { getDefaultBlindStructure, getWsopBlindStructure } from './blindStructureService';

const STRUCTURES_KEY = 'holdem-timer:blindStructures';
const SELECTED_KEY = 'holdem-timer:selectedStructureName';

function isTimerLevel(value: unknown): value is TimerLevel {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const level = value as Record<string, unknown>;
  return (
    typeof level.title === 'string' &&
    typeof level.initialSeconds === 'number' &&
    typeof level.smallBlind === 'number' &&
    typeof level.bigBlind === 'number' &&
    (level.ante === undefined || typeof level.ante === 'number')
  );
}

/** Runtime check that an arbitrary parsed JSON value looks like a BlindStructure. */
export function isBlindStructure(value: unknown): value is BlindStructure {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const structure = value as Record<string, unknown>;
  return (
    typeof structure.name === 'string' &&
    structure.name.trim().length > 0 &&
    typeof structure.description === 'string' &&
    Array.isArray(structure.levels) &&
    structure.levels.length > 0 &&
    structure.levels.every(isTimerLevel)
  );
}

function readRaw(): BlindStructure[] {
  try {
    const raw = localStorage.getItem(STRUCTURES_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBlindStructure) : [];
  } catch {
    return [];
  }
}

function writeRaw(structures: BlindStructure[]): void {
  localStorage.setItem(STRUCTURES_KEY, JSON.stringify(structures));
}

/**
 * Returns all saved blind structures, seeding local storage with the
 * built-in sample structures the first time the app runs.
 */
export function getAllBlindStructures(): BlindStructure[] {
  const existing = readRaw();
  if (existing.length > 0) {
    return existing;
  }
  const seeded = [getDefaultBlindStructure(), getWsopBlindStructure()];
  writeRaw(seeded);
  return seeded;
}

export function getBlindStructureByName(name: string): BlindStructure | undefined {
  return getAllBlindStructures().find((structure) => structure.name === name);
}

/** Whether another structure already uses `name` (case-sensitive, exact match). */
export function structureNameExists(name: string, ignoreName?: string): boolean {
  return getAllBlindStructures().some((structure) => structure.name === name && structure.name !== ignoreName);
}

/**
 * Inserts a new structure, or updates one in place when `previousName` is
 * provided (used when renaming an existing structure).
 */
export function saveBlindStructure(structure: BlindStructure, previousName?: string): void {
  const structures = getAllBlindStructures();
  const keyName = previousName ?? structure.name;
  const index = structures.findIndex((existing) => existing.name === keyName);

  if (index >= 0) {
    structures[index] = structure;
  } else {
    structures.push(structure);
  }
  writeRaw(structures);

  if (previousName && previousName !== structure.name && getSelectedStructureName() === previousName) {
    setSelectedStructureName(structure.name);
  }
}

export function deleteBlindStructure(name: string): void {
  const structures = getAllBlindStructures().filter((structure) => structure.name !== name);
  writeRaw(structures);

  if (getSelectedStructureName() === name) {
    if (structures.length > 0) {
      setSelectedStructureName(structures[0].name);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
  }
}

export function getSelectedStructureName(): string | null {
  return localStorage.getItem(SELECTED_KEY);
}

export function setSelectedStructureName(name: string): void {
  localStorage.setItem(SELECTED_KEY, name);
}

/**
 * Returns the structure that should be shown on the clock page: the
 * previously selected one if it still exists, otherwise the first
 * available structure.
 */
export function getSelectedBlindStructure(): BlindStructure {
  const structures = getAllBlindStructures();
  const selectedName = getSelectedStructureName();
  return structures.find((structure) => structure.name === selectedName) ?? structures[0];
}
