# Design system (`@shared/ui`)

Shared tokens and React primitives for **Drippy Atelier** and the **storefront**.

## Import

```ts
import { Button, TextField, Stack, Surface } from '@shared/ui'
import '@shared/ui/tokens.css' // in app entry (already wired)
import '@shared/ui/ui.css'
```

Colors stay in each app’s `styles/theme.css` (keep mirrors in sync).

## Showcase

Signed-in: `/app/design-system`

## Components

| Export | Purpose |
|--------|---------|
| `Button` | primary / ghost / quiet / danger / signal · sm–xl · block |
| `IconButton` | 32px icon control |
| `TextField` / `TextArea` | Labeled form controls |
| `Badge` | Status chips |
| `Surface` | Card / panel shell |
| `Stack` / `Inline` / `Separator` | Spacing layout |
| `Switch` | Checked / unchecked pill toggle · sm / md |

## Enforcing usage

You can’t hard-block every old class overnight (most screens still use `.btn`), but **new code** is steered to `@shared/ui` with:

1. **Cursor rule** — `.cursor/rules/design-system.mdc` (agents must prefer these components).
2. **Commit lint** — `npm run lint` / `lint:ui` fails if **staged** lines add legacy classes (`btn-*`, `account-field`, …).
3. **PR check** — `npm run lint:ui:pr` (diff vs `origin/main`).
4. **Full inventory** — `npm run lint:ui:all` (lists every remaining legacy usage).

Prefer `@shared/ui` for **new** UI. Migrate legacy controls when you touch them.
