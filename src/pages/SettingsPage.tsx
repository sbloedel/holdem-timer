import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BlindStructure } from '../models/BlindStructure';
import type { TimerLevel } from '../models/TimerLevel';
import {
  deleteBlindStructure,
  getAllBlindStructures,
  getSelectedStructureName,
  isBlindStructure,
  saveBlindStructure,
  setSelectedStructureName,
  structureNameExists,
} from '../services/blindStructureStorage';
import styles from './SettingsPage.module.css';

interface StructureDraft {
  /** The structure's name before editing started; null when creating a new one. */
  originalName: string | null;
  name: string;
  description: string;
  levels: TimerLevel[];
}

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

function createLevel(index: number): TimerLevel {
  return { title: `Level ${index + 1}`, initialSeconds: FIVE_MINUTES_IN_SECONDS, smallBlind: 10, bigBlind: 20, ante: 0 };
}

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return cleaned || 'blind-structure';
}

function downloadJson(fileName: string, structures: BlindStructure[]): void {
  const blob = new Blob([JSON.stringify(structures, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [structures, setStructures] = useState<BlindStructure[]>(() => getAllBlindStructures());
  const [selectedName, setSelectedName] = useState<string | null>(() => getSelectedStructureName());
  const [draft, setDraft] = useState<StructureDraft | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());

  const refresh = () => {
    setStructures(getAllBlindStructures());
    setSelectedName(getSelectedStructureName());
  };

  const handleCreateNew = () => {
    setDraft({ originalName: null, name: '', description: '', levels: [createLevel(0)] });
    setNameError(null);
  };

  const handleEdit = (structure: BlindStructure) => {
    setDraft({
      originalName: structure.name,
      name: structure.name,
      description: structure.description,
      levels: structure.levels.map((level) => ({ ...level })),
    });
    setNameError(null);
  };

  const handleCancelEdit = () => {
    setDraft(null);
    setNameError(null);
  };

  const handleDelete = (name: string) => {
    if (structures.length <= 1) {
      window.alert('You must keep at least one blind structure.');
      return;
    }
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }
    deleteBlindStructure(name);
    if (draft?.originalName === name) {
      setDraft(null);
    }
    setExportSelection((previous) => {
      const next = new Set(previous);
      next.delete(name);
      return next;
    });
    refresh();
  };

  const handleUseOnClock = (name: string) => {
    setSelectedStructureName(name);
    setSelectedName(name);
  };

  const handleSaveDraft = () => {
    if (!draft) {
      return;
    }
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }
    if (structureNameExists(trimmedName, draft.originalName ?? undefined)) {
      setNameError('A blind structure with this name already exists.');
      return;
    }
    if (draft.levels.length === 0) {
      window.alert('Add at least one level.');
      return;
    }

    const newStructure: BlindStructure = {
      name: trimmedName,
      description: draft.description.trim(),
      levels: draft.levels,
    };
    saveBlindStructure(newStructure, draft.originalName ?? undefined);
    setDraft(null);
    setNameError(null);
    refresh();
  };

  const updateLevel = (index: number, patch: Partial<TimerLevel>) => {
    setDraft((current) =>
      current
        ? { ...current, levels: current.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)) }
        : current,
    );
  };

  const addLevel = () => {
    setDraft((current) => (current ? { ...current, levels: [...current.levels, createLevel(current.levels.length)] } : current));
  };

  const removeLevel = (index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      if (current.levels.length <= 1) {
        window.alert('A blind structure needs at least one level.');
        return current;
      }
      return { ...current, levels: current.levels.filter((_, i) => i !== index) };
    });
  };

  const toggleExportSelection = (name: string) => {
    setExportSelection((previous) => {
      const next = new Set(previous);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleExportSelected = () => {
    const selected = structures.filter((structure) => exportSelection.has(structure.name));
    if (selected.length === 0) {
      return;
    }
    const fileName = selected.length === 1 ? `${sanitizeFileName(selected[0].name)}.json` : 'blind-structures.json';
    downloadJson(fileName, selected);
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        window.alert('That file is not valid JSON.');
        return;
      }

      const candidates = (Array.isArray(parsed) ? parsed : [parsed]).filter(isBlindStructure);
      if (candidates.length === 0) {
        window.alert('No valid blind structures were found in that file.');
        return;
      }

      let importedCount = 0;
      for (const candidate of candidates) {
        if (structureNameExists(candidate.name)) {
          const overwrite = window.confirm(`A blind structure named "${candidate.name}" already exists. Overwrite it?`);
          if (!overwrite) {
            continue;
          }
          saveBlindStructure(candidate, candidate.name);
        } else {
          saveBlindStructure(candidate);
        }
        importedCount++;
      }

      refresh();
      if (importedCount > 0) {
        window.alert(`Imported ${importedCount} blind structure${importedCount === 1 ? '' : 's'}.`);
      }
    };
    reader.onerror = () => window.alert('Could not read that file.');
    reader.readAsText(file);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Blind Structures</h1>
        <Link to="/" className={styles.backLink}>
          ← Back to Clock
        </Link>
      </div>

      <div className={styles.toolbar}>
        <button type="button" className={styles.button} onClick={handleCreateNew}>
          + New Blind Structure
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={handleExportSelected}
          disabled={exportSelection.size === 0}
        >
          Export Selected ({exportSelection.size})
        </button>
        <button type="button" className={styles.button} onClick={handleImportButtonClick}>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className={styles.hiddenInput}
          onChange={handleImportFile}
          aria-label="Import blind structures from JSON"
        />
      </div>

      <ul className={styles.list}>
        {structures.map((structure) => (
          <li key={structure.name} className={styles.listItem}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={exportSelection.has(structure.name)}
              onChange={() => toggleExportSelection(structure.name)}
              aria-label={`Select ${structure.name} for export`}
            />

            <div className={styles.listItemInfo}>
              <div className={styles.listItemName}>
                {structure.name}
                {structure.name === selectedName && <span className={styles.selectedBadge}>Selected</span>}
              </div>
              <div className={styles.listItemDescription}>{structure.description}</div>
              <div className={styles.listItemLevels}>
                {structure.levels.length} level{structure.levels.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className={styles.listItemActions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => handleUseOnClock(structure.name)}
                disabled={structure.name === selectedName}
              >
                Use on Clock
              </button>
              <button type="button" className={styles.button} onClick={() => handleEdit(structure)}>
                Edit
              </button>
              <button type="button" className={styles.button} onClick={() => handleDelete(structure.name)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {draft && (
        <div className={styles.editor}>
          <h2 className={styles.editorTitle}>{draft.originalName ? 'Edit Blind Structure' : 'New Blind Structure'}</h2>

          <label className={styles.field}>
            Name
            <input
              className={styles.input}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          {nameError && <p className={styles.errorText}>{nameError}</p>}

          <label className={styles.field}>
            Description
            <input
              className={styles.input}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>

          <div className={styles.levelsTableWrapper}>
            <table className={styles.levelsTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Minutes</th>
                  <th>Small Blind</th>
                  <th>Big Blind</th>
                  <th>Ante</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.levels.map((level, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        className={styles.input}
                        value={level.title}
                        aria-label={`Level ${index + 1} title`}
                        onChange={(event) => updateLevel(index, { title: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className={styles.input}
                        value={level.initialSeconds / 60}
                        aria-label={`Level ${index + 1} minutes`}
                        onChange={(event) =>
                          updateLevel(index, { initialSeconds: Math.max(1, Number(event.target.value) || 0) * 60 })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className={styles.input}
                        value={level.smallBlind}
                        aria-label={`Level ${index + 1} small blind`}
                        onChange={(event) => updateLevel(index, { smallBlind: Number(event.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className={styles.input}
                        value={level.bigBlind}
                        aria-label={`Level ${index + 1} big blind`}
                        onChange={(event) => updateLevel(index, { bigBlind: Number(event.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className={styles.input}
                        value={level.ante ?? 0}
                        aria-label={`Level ${index + 1} ante`}
                        onChange={(event) => updateLevel(index, { ante: Number(event.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.removeLevelButton}
                        aria-label={`Remove level ${index + 1}`}
                        onClick={() => removeLevel(index)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className={styles.button} onClick={addLevel}>
            + Add Level
          </button>

          <div className={styles.editorActions}>
            <button type="button" className={styles.button} onClick={handleSaveDraft}>
              Save
            </button>
            <button type="button" className={styles.button} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
