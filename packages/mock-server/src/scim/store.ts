// packages/mock-server/src/scim/store.ts

import { MAX_SESSIONS, SESSION_TTL_MS } from '../config.js';

/**
 * A SCIM User as stored per session. This is the server's own internal
 * shape -- deliberately not shared with the SvelteKit app (the browser
 * plays the SCIM client; the server never touches HttpMessage).
 */
export interface StoredUser {
	/** Server-assigned UUID (fresh per session; never the static fixture id). */
	id: string;
	/** Client-owned identifier, echoed verbatim. */
	externalId?: string;
	/** Login identifier; unique per session, compared case-insensitively, stored as sent. */
	userName: string;
	/** Name components, stored as sent. */
	name?: Record<string, unknown>;
	displayName?: string;
	/** Email entries, stored as sent. */
	emails?: unknown[];
	active?: boolean;
	/** meta.created -- second-precision UTC, frozen at POST time. */
	created: string;
	/** meta.lastModified -- second-precision UTC, advances on PUT/PATCH. */
	lastModified: string;
	/** Integer revision counter rendered as the weak version W/"n". */
	version: number;
}

/** Per-X-Demo-Session state. */
export interface Session {
	/** Users keyed by server-assigned id. */
	users: Map<string, StoredUser>;
	/** Epoch ms of lazy creation. */
	createdAt: number;
	/** Epoch ms of the most recent request (sliding-TTL anchor). */
	lastSeen: number;
}

/**
 * In-memory session store: Map with a 30-minute sliding TTL and a
 * 500-session LRU cap. Map insertion order plus delete/re-set on touch
 * gives LRU for free, which also means expired sessions cluster at the
 * front of the Map. Time is always passed in by the caller so tests can
 * inject a fake clock without fake-timer gymnastics.
 */
export class SessionStore {
	private readonly sessions = new Map<string, Session>();
	private readonly ttlMs: number;
	private readonly maxSessions: number;

	constructor(options: { ttlMs?: number; maxSessions?: number } = {}) {
		this.ttlMs = options.ttlMs ?? SESSION_TTL_MS;
		this.maxSessions = options.maxSessions ?? MAX_SESSIONS;
	}

	/**
	 * Returns the session for `id`, lazily creating an empty one. Refreshes
	 * the sliding TTL, maintains LRU order, opportunistically evicts expired
	 * sessions, and enforces the LRU cap when creating.
	 */
	touch(id: string, nowMs: number): Session {
		this.evictExpired(nowMs);
		let session = this.sessions.get(id);
		if (session) {
			this.sessions.delete(id);
			session.lastSeen = nowMs;
		} else {
			session = { users: new Map(), createdAt: nowMs, lastSeen: nowMs };
			while (this.sessions.size >= this.maxSessions) {
				const oldest = this.sessions.keys().next().value;
				if (oldest === undefined) break;
				this.sessions.delete(oldest);
			}
		}
		this.sessions.set(id, session);
		return session;
	}

	/** Drops one session (DELETE /api/session). Unknown ids are a no-op. */
	delete(id: string): void {
		this.sessions.delete(id);
	}

	/** True when the session is currently stored (test helper). */
	has(id: string): boolean {
		return this.sessions.has(id);
	}

	/** Number of stored sessions (test helper). */
	get size(): number {
		return this.sessions.size;
	}

	/**
	 * Drops every session idle past the TTL. Runs opportunistically on each
	 * access and from the server entrypoint's 5-minute sweep interval.
	 * LRU order means it can stop at the first non-expired entry.
	 */
	evictExpired(nowMs: number): void {
		for (const [id, session] of this.sessions) {
			if (nowMs - session.lastSeen < this.ttlMs) break;
			this.sessions.delete(id);
		}
	}
}
