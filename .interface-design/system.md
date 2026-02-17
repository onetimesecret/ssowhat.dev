# ssowhat.dev — Design System

## Direction

Protocol trace visualizer for engineers evaluating SSO integration patterns. The interface should feel like a well-annotated packet capture — dense with information but organized so you can follow the thread. Technical but not oppressive. Focused, not warm or cold.

## Signature

The dual-pane "what-you-see / what-really-happened" layout — each step shows a browser mockup alongside the HTTP-level dissection. This protocol-trace-as-narrative structure is unique to this product.

## Identity

Black substrate. White keyhole+skull SVG mark (Megadeth-meets-auth-glyph). Chromatic aberration glitch on the wordmark: `text-shadow: 2px 0 #ff0000, -2px 0 #00ff00`. The tagline is monospace, tracking-widest, uppercase — reads like a terminal banner.

```
Title:    font-black tracking-tighter uppercase italic
Tagline:  font-mono text-sm tracking-widest uppercase text-gray-400
Mark:     white keyhole silhouette, black skull inset, 400x400 SVG
```

## Token System (app.css)

All colors flow through semantic tokens defined in `@theme`. Never use raw `gray-*` utilities in demo components — use the tokens below.

### Surfaces (elevation scale)

| Token | Value | Usage |
|---|---|---|
| `canvas` | `gray-950` | Page background, deepest layer |
| `surface` | `gray-900` | Panels, cards, containers |
| `surface-raised` | `gray-800` | Elevated elements: buttons, kbd, controls |
| `code-surface` | `rgba(0,0,0,0.3)` | Code blocks, pre elements |
| `code-surface-deep` | `rgba(0,0,0,0.4)` | Expanded payload code blocks |

### Text hierarchy

| Token | Value | Usage |
|---|---|---|
| `ink` | `gray-100` | Primary text, headings |
| `ink-secondary` | `gray-300` | Secondary text, descriptions |
| `ink-tertiary` | `gray-400` | Labels, metadata, section headers |
| `ink-muted` | `gray-500` | Muted labels, separators, version strings |

### Borders

| Token | Value | Usage |
|---|---|---|
| `edge` | `rgba(255,255,255,0.08)` | Standard borders, dividers |
| `edge-emphasis` | `rgba(255,255,255,0.14)` | Hover borders, dashed inactive borders |

### Accent

| Token | Value | Usage |
|---|---|---|
| `accent` | `blue-400` | Links, active indicators, interactive elements |
| `accent-dim` | `rgba(96,165,250,0.15)` | Accent backgrounds |

## Depth Strategy

Borders-only. No drop shadows on containers. The `border-edge` token at 8% white opacity creates whisper-quiet separation. `shadow-*` is reserved for:
- The browser mockup (`shadow-2xl`)
- Active actor pills in the protocol stack (gradient backgrounds get `shadow-md`/`shadow-lg`)
- The "Next" button (`shadow-md shadow-blue-500/20`)
- The step badge (`shadow-lg shadow-blue-500/20`)

## Spacing

Base unit: 4px (Tailwind default). Consistent use of `gap-*`, `p-*`, `space-y-*` multiples.

Primary spacers: 8px (`gap-2`, `p-2`), 12px (`gap-3`, `p-3`), 16px (`gap-4`, `p-4`), 24px (`gap-6`, `p-6`).

## Typography

System sans-serif (Inter) for UI. Monospace (`font-mono`) for:
- URLs, HTTP methods, status codes
- Headers, request/response bodies
- Protocol labels, version strings
- kbd elements, inline code

### Heading scale

```
h1:  text-3xl font-semibold tracking-tight text-ink      (page)
     text-3xl font-bold tracking-tight text-ink           (demo shell)
h2:  text-lg font-semibold text-ink                       (cards, sections)
     text-xl font-bold text-ink                           (transcript steps)
h3:  text-xs font-semibold uppercase tracking-wider text-ink-muted  (section labels)
```

### Body text

```
Body:    text-sm leading-relaxed text-ink-secondary
Caption: text-xs text-ink-muted
Code:    rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs
```

## Semantic HTTP Colors (sso-demo-theme.css)

These are domain-specific — not generic status colors:

| Token | Value | Meaning |
|---|---|---|
| `http-request` | `blue-500` | Browser -> server requests |
| `http-response` | `emerald-500` | Server -> browser responses |
| `http-server` | `purple-500` | Server-to-server communication |
| `http-internal` | `gray-500` | Internal processes |

Each has a `-dim` variant (40% opacity via `color-mix`) for backgrounds.

## Actor Colors (sso-demo-theme.css)

Per-actor colors with `-600` and `-700` shades for gradients:
- `actor-browser`: slate-600
- `actor-caddy`: lime-600
- `actor-logto`: purple-500
- `actor-entra`: cyan-500
- `actor-okta`: indigo-500
- `actor-google`: rose-500
- `actor-ots`: red-500

## Motion

`transition-colors` is the dominant transition — used on buttons, links, containers. Physical motion is reserved:
- `hover:scale-105` on actor pills only
- `hover:translateY(-2px)` on identity/brand CTA only
- `motion-reduce:transition-none` applied consistently on all interactive elements

## Component Patterns

### Buttons — Primary (CTA)

```
bg-blue-600 px-5 py-2 text-sm font-semibold text-white
shadow-md shadow-blue-500/20
hover:bg-blue-500
disabled:bg-surface-raised disabled:text-ink-muted disabled:shadow-none
```

### Buttons — Secondary (ghost)

```
border border-edge bg-transparent px-4 py-2 text-sm font-medium text-ink-secondary
hover:border-edge-emphasis hover:bg-surface-raised hover:text-ink
disabled:cursor-not-allowed disabled:border-edge disabled:text-ink-muted
```

### Buttons — Tertiary (toggle, inactive)

```
border border-edge bg-transparent px-3 py-2 text-xs font-medium text-ink-tertiary
hover:border-edge-emphasis hover:text-ink-secondary
```

### Buttons — Tertiary (toggle, active)

Semantic color borders at reduced opacity:

```
border-blue-500/50 bg-blue-900/30 text-blue-400
border-red-500/50 bg-red-900/30 text-red-400    (stop/danger)
border-amber-500/50 bg-amber-900/30 text-amber-400  (mode toggle)
```

### Containers

```
rounded-lg border border-edge bg-surface p-4
```

### Section headers

```
text-xs font-semibold uppercase tracking-wider text-ink-muted
```

### Tags / badges

```
rounded border border-edge bg-surface-raised px-2 py-0.5 font-mono text-xs text-ink-tertiary
```

### Kbd (keyboard shortcuts)

```
rounded bg-surface-raised px-1.5 py-0.5 font-mono
```

### Actor pills

```
rounded-full border-2 px-3 py-1 text-xs font-semibold
Active: ${colorInfo.bgClass} ${colorInfo.borderClass} ${colorInfo.textClass} scale-105 shadow-lg
```

### Step indicators

```
Completed: h-5 w-5 bg-emerald-500 rounded-full (checkmark SVG)
Current:   h-5 w-6 bg-blue-500 ring-2 ring-blue-300 ring-offset-2 ring-offset-surface
Pending:   h-5 w-5 border-2 border-dashed border-edge-emphasis bg-surface-raised
```

### Links

```
Inline:  text-accent hover:underline
Nav:     text-ink-tertiary hover:text-ink-secondary
Back:    text-ink-muted hover:text-ink-secondary (with left arrow)
```

### Focus rings

```
focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas
```

### Callouts

```
Standard:  rounded-lg border border-edge bg-surface px-4 py-3 text-sm text-ink-tertiary
Warning:   rounded-md border border-amber-500/30 bg-amber-900/20 p-4
```

## Exceptions (intentionally not tokenized)

- **`print:` variants**: Literal grays for paper output (light backgrounds, dark text)
- **BrowserMockup chrome**: `from-gray-300 to-gray-400` gradient simulates real macOS browser chrome
- **ProtocolStack connector fallbacks**: `bg-gray-600` / `border-l-gray-600` / `border-r-gray-600` are dynamically constructed in JS and safelisted in theme CSS
- **Protocol stack sublabels**: `text-gray-200/80` used against colored gradient backgrounds where semantic tokens don't apply
- **Semantic protocol colors**: `text-emerald-400`, `text-blue-300`, `text-yellow-400` etc. in HTTP entries are domain-specific syntax highlighting, not generic text
