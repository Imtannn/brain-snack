import { useEffect, useRef, useState } from 'react'
import { Button, IconButton, Modal, Stack, TextField } from '@shared/ui'
import {
  dropSnackFromPacks,
  packMembers,
  snackFromPack,
  unfiledSnacks,
  type SavedPack,
} from '../../lib/snacks/packRecord'
import type { SavedSnack } from '../../lib/snacks/snackRecord'
import {
  deletePack,
  deleteSnack,
  listPacks,
  listSnacks,
  savePack,
  snackErrorMessage,
  updatePack,
  updateSnack,
} from '../../lib/snacks/store'

export function SavedSnacks({
  uid,
  onRestudy,
}: {
  uid: string
  onRestudy: (snack: SavedSnack) => void
}) {
  const [snacks, setSnacks] = useState<SavedSnack[]>([])
  const [packs, setPacks] = useState<SavedPack[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ kind: 'snack' | 'pack'; id: string } | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [renameError, setRenameError] = useState('')
  const [editor, setEditor] = useState<PackEditor | null>(null)
  const editingRef = useRef(editing)
  const editorRef = useRef(editor)
  editingRef.current = editing
  editorRef.current = editor

  useEffect(() => {
    let active = true

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true)
      try {
        const nextSnacks = await listSnacks(uid)
        const nextPacks = await listPacks(uid).catch(() => [] as SavedPack[])
        if (!active) return
        setSnacks(nextSnacks)
        setPacks(nextPacks)
        setError('')
      } catch (err: unknown) {
        if (!active) return
        setError(snackErrorMessage(err))
      } finally {
        if (active && showLoading) setLoading(false)
      }
    }

    void load(true)
    const refresh = () => {
      if (document.visibilityState === 'visible' && !editingRef.current && !editorRef.current) void load(false)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [uid])

  const loose = unfiledSnacks(snacks, packs)

  function startRename(kind: 'snack' | 'pack', id: string, title: string) {
    setEditing({ kind, id })
    setDraftTitle(title)
    setRenameError('')
    setError('')
  }

  function cancelRename() {
    setEditing(null)
    setRenameError('')
  }

  async function saveRename(kind: 'snack' | 'pack', id: string, previous: string) {
    const title = draftTitle.trim()
    if (!title) {
      setRenameError(kind === 'pack' ? 'Name this pack before saving.' : 'Name this snack before saving.')
      return
    }
    if (title === previous) {
      cancelRename()
      return
    }
    setSavingId(id)
    try {
      if (kind === 'pack') {
        await updatePack(uid, id, { title })
        setPacks((current) => current.map((item) => (item.id === id ? { ...item, title } : item)))
      } else {
        await updateSnack(uid, id, { title })
        setSnacks((current) => current.map((item) => (item.id === id ? { ...item, title } : item)))
      }
      cancelRename()
      setError('')
    } catch (err) {
      setRenameError(snackErrorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  async function removeSnack(snack: SavedSnack) {
    if (!window.confirm(`Delete “${snack.title}”?`)) return
    try {
      await deleteSnack(uid, snack.id)
      setSnacks((current) => current.filter((item) => item.id !== snack.id))
      setPacks((current) => dropSnackFromPacks(current, snack.id))
      if (editing?.kind === 'snack' && editing.id === snack.id) setEditing(null)
      setError('')
    } catch (err) {
      setError(snackErrorMessage(err))
    }
  }

  async function removePack(pack: SavedPack) {
    if (!window.confirm(`Delete pack “${pack.title}”? Snacks stay in your vault.`)) return
    try {
      await deletePack(uid, pack.id)
      setPacks((current) => current.filter((item) => item.id !== pack.id))
      if (editing?.kind === 'pack' && editing.id === pack.id) setEditing(null)
      setError('')
    } catch (err) {
      setError(snackErrorMessage(err))
    }
  }

  async function takeOut(pack: SavedPack, snackId: string) {
    const snackIds = pack.snackIds.filter((id) => id !== snackId)
    try {
      await updatePack(uid, pack.id, { snackIds })
      setPacks((current) => current.map((item) => (item.id === pack.id ? { ...item, snackIds } : item)))
      setError('')
    } catch (err) {
      setError(snackErrorMessage(err))
    }
  }

  function crunchPack(pack: SavedPack) {
    const play = snackFromPack(pack, snacks)
    if (!play) {
      setError('Add a snack with questions before crunching this pack.')
      return
    }
    setError('')
    onRestudy(play)
  }

  async function commitEditor() {
    if (!editor) return
    const title = editor.title.trim()
    if (!title) {
      setEditor({ ...editor, error: 'Name this pack before saving.' })
      return
    }
    setEditor({ ...editor, saving: true, error: '' })
    try {
      if (editor.mode === 'create') {
        const id = await savePack(uid, title, editor.selected)
        const pack = {
          id,
          ownerId: uid,
          title,
          snackIds: editor.selected.slice(),
          createdAt: Date.now(),
        }
        setPacks((current) => [pack, ...current.filter((item) => item.id !== id)])
      } else {
        const snackIds = uniqueIds([...editor.existingIds, ...editor.selected])
        await updatePack(uid, editor.packId, { snackIds })
        setPacks((current) =>
          current.map((item) => (item.id === editor.packId ? { ...item, snackIds } : item)),
        )
      }
      setEditor(null)
      setError('')
    } catch (err) {
      setEditor({ ...editor, saving: false, error: snackErrorMessage(err) })
    }
  }

  return (
    <section className="vocab-snacks" aria-label="Your Snack Vault">
      <div className="vocab-sample-row">
        <h2 className="vocab-section-heading">Your Snack Vault</h2>
        <button
          type="button"
          className="vocab-quick-btn"
          onClick={() =>
            setEditor({
              mode: 'create',
              title: '',
              selected: [],
              existingIds: [],
              choices: snacks,
              saving: false,
              error: '',
            })
          }
        >
          New pack
        </button>
      </div>
      {loading ? <p className="ds-subtitle">Loading your snacks…</p> : null}
      {error ? (
        <p className="vocab-auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && snacks.length === 0 && packs.length === 0 && !error ? (
        <p className="ds-subtitle">Save a snack, then crunch it again here.</p>
      ) : null}

      <Stack gap="3">
        {packs.map((pack) => {
          const members = packMembers(pack, snacks)
          const renaming = editing?.kind === 'pack' && editing.id === pack.id
          return (
            <article key={pack.id} className="vocab-pack">
              {renaming ? (
                <RenameForm
                  label="Pack name"
                  value={draftTitle}
                  error={renameError}
                  busy={savingId === pack.id}
                  onChange={setDraftTitle}
                  onSave={() => void saveRename('pack', pack.id, pack.title)}
                  onCancel={cancelRename}
                />
              ) : (
                <div className="vocab-pack__head">
                  <div className="vocab-snack__copy">
                    <div className="vocab-snack__title-row">
                      <p className="vocab-snack__title">{pack.title}</p>
                      <IconButton
                        label={`Rename ${pack.title}`}
                        className="vocab-snack__edit"
                        onClick={() => startRename('pack', pack.id, pack.title)}
                      >
                        <PencilIcon />
                      </IconButton>
                    </div>
                    <p className="ds-subtitle">{packMeta(members)}</p>
                  </div>
                  <div className="vocab-snack__actions">
                    <Button size="sm" className="btn-pop" onClick={() => crunchPack(pack)}>
                      Crunch pack
                    </Button>
                    <IconButton
                      label={`Delete pack ${pack.title}`}
                      className="vocab-snack__delete"
                      onClick={() => void removePack(pack)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </div>
              )}
              <ul className="vocab-pack__snacks">
                {members.map((snack) => (
                  <li key={snack.id}>
                    <SnackRow
                      snack={snack}
                      editing={editing?.kind === 'snack' && editing.id === snack.id}
                      draftTitle={draftTitle}
                      renameError={renameError}
                      saving={savingId === snack.id}
                      onDraftTitle={setDraftTitle}
                      onStartRename={() => startRename('snack', snack.id, snack.title)}
                      onSaveRename={() => void saveRename('snack', snack.id, snack.title)}
                      onCancelRename={cancelRename}
                      onRestudy={() => onRestudy(snack)}
                      onDelete={() => void removeSnack(snack)}
                      extraAction={{
                        title: 'Remove',
                        onClick: () => void takeOut(pack, snack.id),
                      }}
                    />
                  </li>
                ))}
              </ul>
              <div className="vocab-pack__add">
                <Button
                  size="sm"
                  variant="quiet"
                  className="btn-pop"
                  onClick={() =>
                    setEditor({
                      mode: 'add',
                      packId: pack.id,
                      title: pack.title,
                      selected: [],
                      existingIds: pack.snackIds,
                      choices: snacks.filter((snack) => !pack.snackIds.includes(snack.id)),
                      saving: false,
                      error: '',
                    })
                  }
                >
                  Add snacks
                </Button>
              </div>
            </article>
          )
        })}

        {loose.length > 0 ? (
          <div className="vocab-loose">
            {packs.length > 0 ? <h3 className="vocab-loose__label">Not in a pack</h3> : null}
            <Stack gap="3">
              {loose.map((snack) => (
                <SnackRow
                  key={snack.id}
                  snack={snack}
                  editing={editing?.kind === 'snack' && editing.id === snack.id}
                  draftTitle={draftTitle}
                  renameError={renameError}
                  saving={savingId === snack.id}
                  onDraftTitle={setDraftTitle}
                  onStartRename={() => startRename('snack', snack.id, snack.title)}
                  onSaveRename={() => void saveRename('snack', snack.id, snack.title)}
                  onCancelRename={cancelRename}
                  onRestudy={() => onRestudy(snack)}
                  onDelete={() => void removeSnack(snack)}
                />
              ))}
            </Stack>
          </div>
        ) : null}
      </Stack>

      <PackEditorModal
        editor={editor}
        onClose={() => setEditor(null)}
        onTitle={(title) => editor && setEditor({ ...editor, title, error: '' })}
        onToggle={(id) => editor && setEditor({ ...editor, selected: toggleId(editor.selected, id) })}
        onSave={() => void commitEditor()}
      />
    </section>
  )
}

type PackEditor = {
  title: string
  selected: string[]
  existingIds: string[]
  choices: SavedSnack[]
  saving: boolean
  error: string
} & ({ mode: 'create' } | { mode: 'add'; packId: string })

function PackEditorModal({
  editor,
  onClose,
  onTitle,
  onToggle,
  onSave,
}: {
  editor: PackEditor | null
  onClose: () => void
  onTitle: (value: string) => void
  onToggle: (id: string) => void
  onSave: () => void
}) {
  if (!editor) return null
  const creating = editor.mode === 'create'
  return (
    <Modal
      open
      title={creating ? 'New pack' : `Add snacks to ${editor.title}`}
      onClose={onClose}
      busy={editor.saving}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <Stack gap="4">
          {creating ? (
            <TextField
              label="Pack name"
              value={editor.title}
              placeholder="French verbs"
              autoComplete="off"
              autoFocus
              disabled={editor.saving}
              onChange={(event) => onTitle(event.target.value)}
            />
          ) : null}
          {editor.choices.length > 0 ? (
            <fieldset className="vocab-pack-picks">
              <legend className="ds-field__label">Snacks</legend>
              {editor.choices.map((snack) => (
                <label key={snack.id} className="vocab-pack-pick">
                  <input
                    type="checkbox"
                    checked={editor.selected.includes(snack.id)}
                    disabled={editor.saving}
                    onChange={() => onToggle(snack.id)}
                  />
                  <span>
                    <span className="vocab-pack-pick__title">{snack.title}</span>
                    <span className="ds-subtitle">{snackMeta(snack)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="ds-subtitle">
              {creating ? 'You can add snacks after you create the pack.' : 'Every snack is already in this pack.'}
            </p>
          )}
          {editor.error ? (
            <p className="vocab-auth-error" role="alert">
              {editor.error}
            </p>
          ) : null}
          <Button type="submit" block className="btn-pop" disabled={editor.saving}>
            {editor.saving ? 'Saving…' : creating ? 'Create pack' : 'Add to pack'}
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}

function SnackRow({
  snack,
  editing,
  draftTitle,
  renameError,
  saving,
  onDraftTitle,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onRestudy,
  onDelete,
  extraAction,
}: {
  snack: SavedSnack
  editing: boolean
  draftTitle: string
  renameError: string
  saving: boolean
  onDraftTitle: (value: string) => void
  onStartRename: () => void
  onSaveRename: () => void
  onCancelRename: () => void
  onRestudy: () => void
  onDelete?: () => void
  extraAction?: { title: string; onClick: () => void }
}) {
  return (
    <article className="vocab-snack">
      {editing ? (
        <RenameForm
          label="Snack name"
          value={draftTitle}
          error={renameError}
          busy={saving}
          onChange={onDraftTitle}
          onSave={onSaveRename}
          onCancel={onCancelRename}
        />
      ) : (
        <>
          <div className="vocab-snack__copy">
            <div className="vocab-snack__title-row">
              <p className="vocab-snack__title">{snack.title}</p>
              <IconButton label={`Rename ${snack.title}`} className="vocab-snack__edit" onClick={onStartRename}>
                <PencilIcon />
              </IconButton>
            </div>
            <p className="ds-subtitle">{snackMeta(snack)}</p>
          </div>
          <div className="vocab-snack__actions">
            <Button size="sm" className="btn-pop" onClick={onRestudy}>
              Crunch Again
            </Button>
            {extraAction ? (
              <Button size="sm" variant="quiet" onClick={extraAction.onClick}>
                {extraAction.title}
              </Button>
            ) : null}
            {onDelete ? (
              <IconButton label={`Delete ${snack.title}`} className="vocab-snack__delete" onClick={onDelete}>
                <TrashIcon />
              </IconButton>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}

function RenameForm({
  label,
  value,
  error,
  busy,
  onChange,
  onSave,
  onCancel,
}: {
  label: string
  value: string
  error: string
  busy: boolean
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <form
      className="vocab-snack__rename"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <TextField
        label={label}
        size="sm"
        value={value}
        error={error || undefined}
        disabled={busy}
        autoComplete="off"
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
      />
      <div className="vocab-snack__actions">
        <Button type="submit" size="sm" className="btn-pop" disabled={busy}>
          {busy ? 'Saving…' : 'Save name'}
        </Button>
        <Button type="button" size="sm" variant="quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function snackMeta(snack: SavedSnack): string {
  const count = snack.questions.length === 0 ? 'Saved list' : `${snack.questions.length} questions`
  if (!snack.createdAt) return count
  const date = new Date(snack.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${count} · ${date}`
}

function packMeta(members: readonly SavedSnack[]): string {
  const snacks = `${members.length} snack${members.length === 1 ? '' : 's'}`
  const questions = members.reduce((total, snack) => total + snack.questions.length, 0)
  if (questions === 0) return snacks
  return `${snacks} · ${questions} questions`
}

function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20zM14.5 5l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
