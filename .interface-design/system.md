# ssowhat.dev — Design System

## Direction

Protocol trace visualizer for engineers evaluating SSO integration patterns. The interface should feel like a well-annotated packet capture — dense with information but organized so you can follow the thread. Technical but not oppressive. Focused, not warm or cold.

## Signature

The dual-pane "what-you-see / what-really-happened" layout — each step shows a browser mockup alongside the HTTP-level dissection. This protocol-trace-as-narrative structure is unique to this product.

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

## Spacing

Base unit: 4px (Tailwind default). Consistent use of `gap-*`, `p-*`, `space-y-*` multiples.

## Typography

System sans-serif for UI. Monospace (`font-mono`) for:
- URLs, HTTP methods, status codes
- Headers, request/response bodies
- Protocol labels, version strings
- kbd elements

## Semantic HTTP Colors (sso-demo-theme.css)

These are domain-specific — not generic status colors:
| Token | Value | Meaning |
|---|---|---|
| `http-request` | `blue-500` | Browser → server requests |
| `http-response` | `emerald-500` | Server → browser responses |
| `http-server` | `purple-500` | Server-to-server communication |
| `http-internal` | `gray-500` | Internal processes |

Each has a `-dim` variant (40% opacity) for backgrounds.

## Actor Colors (sso-demo-theme.css)

Per-actor colors with `-600` and `-700` shades for gradients:
- `actor-browser`: slate-600
- `actor-caddy`: lime-600
- `actor-logto`: purple-500
- `actor-entra`: cyan-500
- `actor-ots`: red-500

## Exceptions (intentionally not tokenized)

- **`print:` variants**: Literal grays for paper output (light backgrounds, dark text)
- **BrowserMockup chrome**: `from-gray-300 to-gray-400` gradient simulates real macOS browser chrome
- **ProtocolStack connector fallbacks**: `bg-gray-600` / `border-l-gray-600` / `border-r-gray-600` are dynamically constructed in JS and safelisted in theme CSS
- **Protocol stack sublabels**: `text-gray-200/80` used against colored gradient backgrounds where semantic tokens don't apply
- **Semantic protocol colors**: `text-emerald-400`, `text-blue-300`, `text-yellow-400` etc. in HTTP entries are domain-specific syntax highlighting, not generic text

## Component Patterns

### Buttons (inactive/toggle state)
```
border-edge bg-transparent text-ink-tertiary
hover:border-edge-emphasis hover:text-ink-secondary
```

### Buttons (active/toggle state)
Semantic color borders at reduced opacity:
```
border-blue-500/50 bg-blue-900/30 text-blue-400
```

### Containers
```
rounded-lg border border-edge bg-surface p-4
```

### Section headers
```
text-xs font-semibold uppercase tracking-wider text-ink-muted
```

### Focus rings
```
focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas
```
