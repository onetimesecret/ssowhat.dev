// src/lib/sso-demos/index.ts

/**
 * Shared components for SSO authentication flow demos.
 *
 * Usage:
 *   import { HttpEntry, Dashboard, LogtoSignIn } from '$lib/sso-demos';
 *   import type { Step, DemoConfig } from '$lib/sso-demos';
 */

// Constants
/** Base path for the SSO demos index page */
export const DEMOS_INDEX_PATH = "/";

// Types
export type {
  ExpandedPayload,
  HttpMessage,
  Actors,
  ActorConfig,
  ProtocolStackComponent,
  ProtocolStackConnection,
  ProtocolStackConfig,
  Step,
  DemoConfig,
} from "./types.js";
