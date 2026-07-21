// src/lib/sso-demos/types.ts

/**
 * Shared type definitions for SSO demo components.
 * These types support multiple authentication flow demos with consistent interfaces.
 */

/**
 * Represents an expanded payload (e.g., decoded SAML or JWT content)
 * shown in technical details for educational purposes.
 */
export interface ExpandedPayload {
  /** Label describing what this payload represents */
  label: string;
  /** The decoded/formatted content to display */
  content: string;
}

/**
 * Represents a single HTTP message in the authentication flow.
 * Can be a browser request, server response, internal process, or server-to-server communication.
 */
export interface HttpMessage {
  /** Type of HTTP message */
  type: "request" | "response" | "internal" | "server" | "server-response";
  /** Source of the message */
  from: string;
  /** Destination of the message */
  to: string;
  /** HTTP method (GET, POST, etc.) - present for requests */
  method?: string;
  /** Full URL - present for requests */
  url?: string;
  /** HTTP headers array */
  headers?: string[];
  /** Request/response body content */
  body?: string;
  /** Additional explanatory note about this message */
  note?: string;
  /** HTTP status code - present for responses */
  status?: string;
  /** Label for internal processes */
  label?: string;
  /** Optional expanded payload for decoded content (SAML, JWT, etc.) */
  expandedPayload?: ExpandedPayload;
}

/**
 * One real HTTP exchange to perform against the mock-integration server in
 * live transport mode. References the static request/response pair in
 * Step.http that it replays, so live attribution can never drift from the
 * curated story. The executor renders results into the same HttpMessage
 * shape the UI already consumes -- one trace schema, two producers.
 */
export interface LiveExchangeSpec {
  /** Index into Step.http of the static request message this exchange replays */
  staticRequestIndex: number;
  /** Index into Step.http of the static response message this exchange's response pairs with */
  staticResponseIndex: number;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Path + query relative to the mock server origin, e.g.
   * "/scim/v2/Users/{{userId}}". May contain {{placeholders}} resolved from
   * captured variables. Query strings are pre-encoded verbatim so they
   * byte-match the static URL encoding.
   */
  path: string;
  /**
   * Request headers as pre-formatted "Name: value" lines (the HttpMessage
   * convention). Authorization and X-Demo-Session are injected by the
   * executor -- do not list them here.
   */
  headers: string[];
  /**
   * Canonical request body -- the static expandedPayload.content verbatim,
   * with {{placeholders}} where server-assigned values appear.
   */
  body?: string;
  /**
   * Values to capture from the parsed response JSON: variable name to
   * dot-path (numeric segments index arrays), e.g. { userId: "id" }.
   * Captures apply only to 2xx responses.
   */
  capture?: Record<string, string>;
  /** Note for the live request card (defaults to the static message's note) */
  note?: string;
}

/** Live-mode spec for a step. Absent = the step is static-only. */
export interface LiveStepSpec {
  /** Real exchanges to perform, in order */
  exchanges: LiveExchangeSpec[];
  /**
   * Captured variables this step's exchanges consume, e.g. ["userId"].
   * When one is missing from the session context, the shell auto-runs the
   * earlier live step whose exchanges capture it before running this one,
   * and says so visibly.
   */
  requires?: string[];
}

/** Result of executing one LiveExchangeSpec against the mock server. */
export interface LiveExchangeResult {
  /** The spec that was executed */
  spec: LiveExchangeSpec;
  /** The request actually sent, render-ready (type "server", from/to copied from the static twin) */
  request: HttpMessage;
  /** The response received, render-ready (type "server-response"); absent on network failure */
  response?: HttpMessage;
  /** Wall-clock round trip in milliseconds */
  durationMs: number;
  /** True when an HTTP response was received -- any status, including 4xx/5xx (those still render) */
  ok: boolean;
  /** Network/CORS/timeout failure description when ok is false */
  error?: string;
}

/** Result of running all live exchanges for one step. */
export interface LiveStepResult {
  /** The step this result belongs to */
  stepId: number;
  /** Per-exchange results, in execution order */
  exchanges: LiveExchangeResult[];
  /** Variables captured during this step (merged into the session context) */
  captured: Record<string, string>;
  /** Step ids auto-run first to satisfy `requires` (empty when none) */
  ranPrerequisiteStepIds: number[];
  /** ISO timestamp of the run */
  at: string;
}

/**
 * Live-transport configuration for a demo. Presence enables the
 * Static/Live toggle; absence leaves the demo exactly as it was.
 */
export interface LiveDemoConfig {
  /**
   * Mock server origin override. When absent, the runtime default applies:
   * the ssowhat:mock-server-url localStorage key, then the build-time
   * VITE_MOCK_SERVER_URL value, then http://localhost:8787.
   */
  baseUrl?: string;
}

/**
 * Generic actor state - tracks which system components are active in a step.
 * Keys are actor identifiers, values indicate if that actor is active.
 */
export type Actors = Record<string, boolean>;

/**
 * Configuration for a single actor in the diagram.
 */
export interface ActorConfig {
  /** Unique identifier matching keys in Actors */
  key: string;
  /** Display label */
  label: string;
  /** Tailwind background color class when active */
  activeColor: string;
}

/**
 * Configuration for a component in the protocol stack visualization.
 */
export interface ProtocolStackComponent {
  /** Unique identifier matching keys in Actors */
  key: string;
  /** Display label */
  label: string;
  /** Secondary label (e.g., "Reverse Proxy", "Identity Provider") */
  subLabel: string;
  /** Emoji icon */
  emoji: string;
  /** Tailwind gradient classes when active */
  activeGradient: string;
  /** Tailwind shadow classes when active */
  activeShadow: string;
  /** Tailwind ring classes when active */
  activeRing: string;
}

/**
 * Configuration for a connection between components in the protocol stack.
 */
export interface ProtocolStackConnection {
  /** Source component key */
  from: string;
  /** Destination component key */
  to: string;
  /** Protocol label (e.g., "HTTP", "OIDC", "SAML") */
  protocol: string;
  /** Optional secondary protocol info */
  subProtocol?: string;
  /** Tailwind background color class for the connector line when active */
  activeColor: string;
  /** Tailwind border-left color class for left arrow when active (defaults to derived from activeColor) */
  activeBorderLeft?: string;
  /** Tailwind border-right color class for right arrow when active (defaults to derived from activeColor) */
  activeBorderRight?: string;
}

/**
 * Full configuration for the protocol stack visualization.
 */
export interface ProtocolStackConfig {
  components: ProtocolStackComponent[];
  connections: ProtocolStackConnection[];
}

/**
 * Represents a single step in the SSO authentication flow demo.
 * Each step shows what the user sees, the technical HTTP flow,
 * and which system components are involved.
 */
export interface Step {
  /** Step number/identifier */
  id: number;
  /** Human-readable title for this step */
  title: string;
  /** What screen/state the user sees (key into screen map) */
  userSees: string;
  /** URL displayed in the browser address bar */
  urlBar: string;
  /** Detailed description of what's happening in this step */
  description: string;
  /** Security-related note or best practice for this step */
  securityNote?: string;
  /** Array of HTTP messages that occur in this step */
  http: HttpMessage[];
  /** Which system components are active/involved in this step */
  actors: Actors;
  /**
   * Optional live-transport spec: real exchanges the browser can perform
   * against the mock-integration server for this step. Static remains the
   * authoritative default; steps without a spec simply stay static-only.
   */
  live?: LiveStepSpec;
}

/**
 * Configuration for the demo shell component.
 */
export interface DemoConfig {
  /** Demo title displayed in header */
  title: string;
  /** Demo subtitle/description */
  subtitle: string;
  /** Semantic version string */
  version: string;
  /** Link back to demo index */
  backLink: {
    href: string;
    label: string;
  };
  /** Actor configuration for the diagram strip */
  actorConfig: ActorConfig[];
  /** Protocol stack visualization configuration */
  protocolStack: ProtocolStackConfig;
  /**
   * Live-transport configuration. Presence enables the Static/Live toggle
   * for this demo; absence leaves the demo fully static as before.
   */
  live?: LiveDemoConfig;
}
