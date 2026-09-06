import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/** A level as edited in the form: numeric fields are raw strings so the
 * user can freely clear/retype them (e.g. delete a leading "0") without
 * the input snapping back to a coerced value on every keystroke. */
interface LevelDraft {
  id: string;
  title: string;
  minutes: string;
  smallBlind: string;
  bigBlind: string;
  ante: string;
}

interface StructureDraft {
  /** The structure's name before editing started; null when creating a new one. */
  originalName: string | null;
  name: string;
  description: string;
  levels: LevelDraft[];
}

function generateId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function createLevelDraft(index: number, previous?: LevelDraft): LevelDraft {
  if (previous) {
    return {
      id: generateId(),
      title: `Level ${index + 1}`,
      minutes: previous.minutes,
      smallBlind: String((Number.parseInt(previous.smallBlind, 10) || 0) * 2),
      bigBlind: String((Number.parseInt(previous.bigBlind, 10) || 0) * 2),
      ante: previous.ante,
    };
  }
  return { id: generateId(), title: `Level ${index + 1}`, minutes: '5', smallBlind: '10', bigBlind: '20', ante: '0' };
}

function toLevelDraft(level: TimerLevel): LevelDraft {
  return {
    id: generateId(),
    title: level.title,
    minutes: String(level.initialSeconds / 60),
    smallBlind: String(level.smallBlind),
    bigBlind: String(level.bigBlind),
    ante: String(level.ante ?? 0),
  };
}

function toTimerLevel(levelDraft: LevelDraft): TimerLevel {
  const minutes = Math.max(1, Number.parseInt(levelDraft.minutes, 10) || 0);
  return {
    title: levelDraft.title.trim() || 'Level',
    initialSeconds: minutes * 60,
    smallBlind: Number.parseInt(levelDraft.smallBlind, 10) || 0,
    bigBlind: Number.parseInt(levelDraft.bigBlind, 10) || 0,
    ante: Number.parseInt(levelDraft.ante, 10) || 0,
  };
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9 8h2V6H9v2zm4 0h2V6h-2v2zM9 13h2v-2H9v2zm4 0h2v-2h-2v2zm-4 5h2v-2H9v2zm4 0h2v-2h-2v2z"
      />
    </svg>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  // Snapshot of the draft as it looked when editing/creating started, used to
  // detect unsaved changes (ignoring the `id` fields, which are re-generated
  // and would otherwise always look "different").
  const draftBaselineRef = useRef<StructureDraft | null>(null);

  const [structures, setStructures] = useState<BlindStructure[]>(() => getAllBlindStructures());
  const [selectedName, setSelectedName] = useState<string | null>(() => getSelectedStructureName());
  const [draft, setDraft] = useState<StructureDraft | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // Set while a navigation away from a dirty draft is pending confirmation
  // (see `guardNavigation`/`isDraftDirty`). Holding the action itself (as
  // opposed to just a boolean) lets the Save/Discard/Cancel dialog resume
  // whichever navigation triggered it once the user has decided.
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const refresh = () => {
    setStructures(getAllBlindStructures());
    setSelectedName(getSelectedStructureName());
  };

  const handleCreateNew = () => {
    guardNavigation(() => {
      const newDraft: StructureDraft = { originalName: null, name: '', description: '', levels: [createLevelDraft(0)] };
      setDraft(newDraft);
      draftBaselineRef.current = newDraft;
      setNameError(null);
    });
  };

  const handleEdit = (structure: BlindStructure) => {
    guardNavigation(() => {
      const newDraft: StructureDraft = {
        originalName: structure.name,
        name: structure.name,
        description: structure.description,
        levels: structure.levels.map(toLevelDraft),
      };
      setDraft(newDraft);
      draftBaselineRef.current = newDraft;
      setNameError(null);
    });
  };

  const discardDraft = () => {
    setDraft(null);
    draftBaselineRef.current = null;
    setNameError(null);
  };

  const handleCancelEdit = () => {
    guardNavigation(discardDraft);
  };

  const handleSelectAndGoToClock = (name: string) => {
    guardNavigation(() => {
      setSelectedStructureName(name);
      navigate('/');
    });
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
      draftBaselineRef.current = null;
    }
    refresh();
  };

  const normalizeLevelForCompare = (level: LevelDraft) => ({
    title: level.title,
    minutes: level.minutes,
    smallBlind: level.smallBlind,
    bigBlind: level.bigBlind,
    ante: level.ante,
  });

  const isDraftDirty = (): boolean => {
    const baseline = draftBaselineRef.current;
    if (!draft || !baseline) {
      return false;
    }
    return (
      draft.name !== baseline.name ||
      draft.description !== baseline.description ||
      JSON.stringify(draft.levels.map(normalizeLevelForCompare)) !==
        JSON.stringify(baseline.levels.map(normalizeLevelForCompare))
    );
  };

  /** Runs `action` immediately if there are no unsaved changes to the
   * current draft. Otherwise, defers it and shows the Save/Discard/Cancel
   * dialog so the user decides what happens to those changes first. */
  const guardNavigation = (action: () => void): void => {
    if (!isDraftDirty()) {
      action();
      return;
    }
    setPendingNavigation(() => action);
  };

  const handleDialogSave = () => {
    if (saveDraftInternal()) {
      const action = pendingNavigation;
      setPendingNavigation(null);
      action?.();
    }
    // If saving failed validation (e.g. duplicate/blank name), keep the
    // dialog closed and the editor open with the error so the user can fix
    // it, without losing or applying the pending navigation.
    else {
      setPendingNavigation(null);
    }
  };

  const handleDialogDiscard = () => {
    const action = pendingNavigation;
    setPendingNavigation(null);
    discardDraft();
    action?.();
  };

  const handleDialogCancel = () => {
    setPendingNavigation(null);
  };

  const saveDraftInternal = (): boolean => {
    if (!draft) {
      return true;
    }
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return false;
    }
    if (structureNameExists(trimmedName, draft.originalName ?? undefined)) {
      setNameError('A blind structure with this name already exists.');
      return false;
    }
    if (draft.levels.length === 0) {
      window.alert('Add at least one level.');
      return false;
    }

    const newStructure: BlindStructure = {
      name: trimmedName,
      description: draft.description.trim(),
      levels: draft.levels.map(toTimerLevel),
    };
    saveBlindStructure(newStructure, draft.originalName ?? undefined);
    setDraft(null);
    draftBaselineRef.current = null;
    setNameError(null);
    refresh();
    return true;
  };

  const handleSaveDraft = () => {
    saveDraftInternal();
  };

  const updateLevelField = (id: string, field: keyof Omit<LevelDraft, 'id'>, value: string) => {
    setDraft((current) =>
      current
        ? { ...current, levels: current.levels.map((level) => (level.id === id ? { ...level, [field]: value } : level)) }
        : current,
    );
  };

  const handleNumericFieldChange =
    (id: string, field: 'minutes' | 'smallBlind' | 'bigBlind' | 'ante') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // Strip anything that isn't a digit so the field always allows being
      // fully cleared (including a leading "0") without snapping back.
      updateLevelField(id, field, event.target.value.replace(/[^0-9]/g, ''));
    };

  // Auto-select a numeric field's text on focus so the user can type over
  // the existing value directly instead of having to clear it first.
  const handleNumericFieldFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const addLevel = () => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const previous = current.levels[current.levels.length - 1];
      return { ...current, levels: [...current.levels, createLevelDraft(current.levels.length, previous)] };
    });
  };

  const removeLevel = (id: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      if (current.levels.length <= 1) {
        window.alert('A blind structure needs at least one level.');
        return current;
      }
      return { ...current, levels: current.levels.filter((level) => level.id !== id) };
    });
  };

  const setRowRef = (id: string) => (el: HTMLTableRowElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  };

  // Determines where a dragged row would land if dropped at `clientY`, by
  // comparing it against the vertical midpoint of each row still in the
  // list (using Pointer Events so this works for both mouse and touch,
  // unlike the native HTML5 drag-and-drop API which iOS Safari doesn't
  // support for touch input).
  const getInsertionIndex = (clientY: number): number => {
    const levels = draft?.levels ?? [];
    for (let i = 0; i < levels.length; i++) {
      const el = rowRefs.current.get(levels[i].id);
      if (!el) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return i;
      }
    }
    return levels.length;
  };

  const handleHandlePointerDown = (id: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    const index = draft?.levels.findIndex((level) => level.id === id) ?? null;
    setDraggedId(id);
    setHoverIndex(index === -1 ? null : index);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Some environments (or synthetic pointer events) don't have an
      // active pointer to capture; dragging still works via document-wide
      // pointermove/up handling below.
    }
  };

  const handleHandlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!draggedId) {
      return;
    }
    setHoverIndex(getInsertionIndex(event.clientY));
  };

  const finishDrag = () => {
    setDraft((current) => {
      if (!current || !draggedId || hoverIndex === null) {
        return current;
      }
      const fromIndex = current.levels.findIndex((level) => level.id === draggedId);
      if (fromIndex === -1 || fromIndex === hoverIndex) {
        return current;
      }
      const levels = [...current.levels];
      const [moved] = levels.splice(fromIndex, 1);
      const toIndex = hoverIndex > fromIndex ? hoverIndex - 1 : hoverIndex;
      levels.splice(toIndex, 0, moved);
      return { ...current, levels };
    });
    setDraggedId(null);
    setHoverIndex(null);
  };

  const handleHandlePointerUp = () => finishDrag();
  const handleHandlePointerCancel = () => {
    setDraggedId(null);
    setHoverIndex(null);
  };

  const handleExportAll = () => {
    downloadJson('blind-structures.json', structures);
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
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.newButton}`}
          onClick={handleCreateNew}
          aria-label="New Blind Structure"
        >
          <PlusIcon />
        </button>
        <button type="button" className={styles.button} onClick={handleImportButtonClick}>
          Import
        </button>
        <button type="button" className={styles.button} onClick={handleExportAll}>
          Export
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
            <button
              type="button"
              className={styles.listItemMain}
              onClick={() => handleSelectAndGoToClock(structure.name)}
            >
              <div className={styles.listItemName}>
                {structure.name}
                {structure.name === selectedName && <span className={styles.selectedBadge}>Selected</span>}
              </div>
              <div className={styles.listItemDescription}>{structure.description}</div>
              <div className={styles.listItemLevels}>
                {structure.levels.length} level{structure.levels.length === 1 ? '' : 's'}
              </div>
            </button>

            <div className={styles.listItemActions}>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.rowIconButton}`}
                onClick={() => handleEdit(structure)}
                aria-label={`Edit ${structure.name}`}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.rowIconButton}`}
                onClick={() => handleDelete(structure.name)}
                aria-label={`Delete ${structure.name}`}
              >
                <XIcon />
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
                  <th />
                  <th>Title</th>
                  <th>Minutes</th>
                  <th>Small Blind</th>
                  <th>Big Blind</th>
                  <th>Ante</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.levels.map((levelDraft, index) => {
                  const isLastRow = index === draft.levels.length - 1;
                  const isDropTarget =
                    Boolean(draggedId) &&
                    (hoverIndex === index || (isLastRow && hoverIndex === draft.levels.length));
                  return (
                  <tr
                    key={levelDraft.id}
                    ref={setRowRef(levelDraft.id)}
                    className={[
                      styles.levelRow,
                      draggedId === levelDraft.id ? styles.dragging : '',
                      isDropTarget ? styles.dropTarget : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td>
                      <span
                        className={styles.dragHandle}
                        role="button"
                        tabIndex={-1}
                        aria-label={`Reorder level ${index + 1}`}
                        onPointerDown={handleHandlePointerDown(levelDraft.id)}
                        onPointerMove={handleHandlePointerMove}
                        onPointerUp={handleHandlePointerUp}
                        onPointerCancel={handleHandlePointerCancel}
                      >
                        <GripIcon />
                      </span>
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        value={levelDraft.title}
                        aria-label={`Level ${index + 1} title`}
                        onChange={(event) => updateLevelField(levelDraft.id, 'title', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.input}
                        value={levelDraft.minutes}
                        aria-label={`Level ${index + 1} minutes`}
                        onChange={handleNumericFieldChange(levelDraft.id, 'minutes')}
                        onFocus={handleNumericFieldFocus}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.input}
                        value={levelDraft.smallBlind}
                        aria-label={`Level ${index + 1} small blind`}
                        onChange={handleNumericFieldChange(levelDraft.id, 'smallBlind')}
                        onFocus={handleNumericFieldFocus}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.input}
                        value={levelDraft.bigBlind}
                        aria-label={`Level ${index + 1} big blind`}
                        onChange={handleNumericFieldChange(levelDraft.id, 'bigBlind')}
                        onFocus={handleNumericFieldFocus}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.input}
                        value={levelDraft.ante}
                        aria-label={`Level ${index + 1} ante`}
                        onChange={handleNumericFieldChange(levelDraft.id, 'ante')}
                        onFocus={handleNumericFieldFocus}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.removeLevelButton}
                        aria-label={`Remove level ${index + 1}`}
                        onClick={() => removeLevel(levelDraft.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className={`${styles.iconButton} ${styles.addLevelButton}`}
            onClick={addLevel}
            aria-label="Add Level"
          >
            <PlusIcon />
          </button>

          <div className={styles.editorActions}>
            <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={handleSaveDraft}>
              Save
            </button>
            <button type="button" className={styles.button} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingNavigation && (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalDialog} role="alertdialog" aria-modal="true" aria-labelledby="unsaved-changes-title">
            <h2 id="unsaved-changes-title" className={styles.modalTitle}>
              Unsaved changes
            </h2>
            <p className={styles.modalBody}>
              You have unsaved changes. Save before switching?
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={handleDialogSave}>
                Save
              </button>
              <button type="button" className={styles.button} onClick={handleDialogDiscard}>
                Discard
              </button>
              <button type="button" className={styles.button} onClick={handleDialogCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
