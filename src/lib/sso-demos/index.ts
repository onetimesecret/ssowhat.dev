// src/lib/sso-demos/index.ts

/**
 * Shared components for SSO authentication flow demos.
 *
 * Usage:
 *   import { HttpEntry, Dashboard, LogtoSignIn } from '$lib/sso-demos';
 *   import type { Step, DemoConfig } from '$lib/sso-demos';
 */

import { version as PACKAGE_VERSION } from "../../../package.json";

// Constants
/** Base path for the SSO demos index page */
export const DEMOS_INDEX_PATH = "/";

/**
 * Version string shown in every demo's footer and transcript header. Read
 * from package.json so a version bump there propagates to all demos; per-demo
 * configs reference this instead of hardcoding a string.
 */
export const DEMO_VERSION: string = PACKAGE_VERSION;

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
  DemoFidelity,
  LiveExchangeSpec,
  LiveStepSpec,
  LiveExchangeResult,
  LiveStepResult,
  LiveDemoConfig,
} from "./types.js";
