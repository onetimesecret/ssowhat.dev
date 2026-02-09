// src/lib/sso-demos/shared/transcript-utils.ts

import type { HttpMessage, Step, DemoConfig } from '../types.js';

/**
 * Color class set derived from an actor's activeColor token.
 */
export interface ActorColorInfo {
	bgClass: string;
	bgMutedClass: string;
	borderClass: string;
	ringClass: string;
	/** Ring class with reduced opacity, for highlight overlays (e.g. ring-actor-browser/60) */
	ringHighlightClass: string;
	/** Shadow color class for active/highlighted states (e.g. shadow-actor-browser/25) */
	shadowClass: string;
	textClass: string;
	dotClass: string;
}

/**
 * Gets color classes for an actor based on their activeColor from config.
 * Dynamically derives variant classes from any `bg-<token>` activeColor,
 * supporting both semantic tokens (bg-actor-browser) and raw Tailwind
 * classes (bg-blue-500). No manual updates needed when adding new actors.
 */
export function getActorColorInfo(activeColor?: string): ActorColorInfo {
	const defaultColors: ActorColorInfo = {
		bgClass: 'bg-gray-500/30',
		bgMutedClass: 'bg-gray-800/50',
		borderClass: 'border-gray-500',
		ringClass: 'ring-gray-500',
		ringHighlightClass: 'ring-gray-500/60',
		shadowClass: 'shadow-gray-500/25',
		textClass: 'text-gray-200',
		dotClass: 'bg-gray-500'
	};

	if (!activeColor) return defaultColors;

	// Extract the color token from "bg-<token>" (e.g. "actor-browser" or "blue-500")
	const token = activeColor.replace(/^bg-/, '');
	if (!token) return defaultColors;

	return {
		bgClass: `bg-${token}/30`,
		bgMutedClass: `bg-${token}/10`,
		borderClass: `border-${token}`,
		ringClass: `ring-${token}`,
		ringHighlightClass: `ring-${token}/60`,
		shadowClass: `shadow-${token}/25`,
		textClass: `text-${token}`,
		dotClass: `bg-${token}`
	};
}

/**
 * HTTP message type configuration for labels and colors.
 */
export interface HttpMessageTypeConfig {
	label: string;
	borderColor: string;
}

/**
 * Returns configuration for each HTTP message type.
 * Colors reference CSS variables defined in sso-demo-theme.css
 */
export function getHttpMessageTypeConfig(type: HttpMessage['type']): HttpMessageTypeConfig {
	const configs: Record<HttpMessage['type'], HttpMessageTypeConfig> = {
		request: {
			label: 'REQUEST',
			borderColor: 'var(--color-http-request)'
		},
		response: {
			label: 'RESPONSE',
			borderColor: 'var(--color-http-response)'
		},
		internal: {
			label: 'INTERNAL',
			borderColor: 'var(--color-http-internal)'
		},
		server: {
			label: 'SERVER\u2192SERVER',
			borderColor: 'var(--color-http-server)'
		},
		'server-response': {
			label: 'SERVER RESPONSE',
			borderColor: 'var(--color-http-server)'
		}
	};

	return configs[type];
}

/**
 * Formats a single HTTP entry as plain text for clipboard.
 */
export function formatHttpEntryAsText(entry: HttpMessage): string {
	const lines: string[] = [];
	const typeConfig = getHttpMessageTypeConfig(entry.type);

	lines.push(`[${typeConfig.label}]`);
	if (entry.from && entry.to) {
		lines.push(`${entry.from} \u2192 ${entry.to}`);
	}
	if (entry.label) {
		lines.push(entry.label);
	}
	if (entry.method && entry.url) {
		lines.push(`${entry.method} ${entry.url}`);
	}
	if (entry.status) {
		lines.push(entry.status);
	}
	if (entry.headers && entry.headers.length > 0) {
		lines.push('Headers:');
		entry.headers.forEach((h) => lines.push(`  ${h}`));
	}
	if (entry.body) {
		lines.push('Body:');
		entry.body.split('\n').forEach((line) => lines.push(`  ${line}`));
	}
	if (entry.note) {
		lines.push(`Note: ${entry.note}`);
	}
	if (entry.expandedPayload) {
		lines.push('');
		lines.push(`${entry.expandedPayload.label}:`);
		entry.expandedPayload.content.split('\n').forEach((line) => lines.push(`  ${line}`));
	}

	return lines.join('\n');
}

/**
 * Formats HTTP entries for a step as indented plain text lines.
 * Shared by both generateStepText and generatePlainTextTranscript.
 */
function formatHttpEntriesAsText(http: HttpMessage[]): string[] {
	const lines: string[] = [];
	lines.push('HTTP Exchanges:');
	http.forEach((entry, i) => {
		lines.push('');
		lines.push(`  [${i + 1}] ${getHttpMessageTypeConfig(entry.type).label}`);
		if (entry.from && entry.to) {
			lines.push(`      ${entry.from} \u2192 ${entry.to}`);
		}
		if (entry.label) {
			lines.push(`      ${entry.label}`);
		}
		if (entry.method && entry.url) {
			lines.push(`      ${entry.method} ${entry.url}`);
		}
		if (entry.status) {
			lines.push(`      ${entry.status}`);
		}
		if (entry.headers && entry.headers.length > 0) {
			lines.push('      Headers:');
			entry.headers.forEach((h) => lines.push(`        ${h}`));
		}
		if (entry.body) {
			lines.push('      Body:');
			entry.body.split('\n').forEach((line) => lines.push(`        ${line}`));
		}
		if (entry.note) {
			lines.push(`      Note: ${entry.note}`);
		}
		if (entry.expandedPayload) {
			lines.push(`      ${entry.expandedPayload.label}:`);
			entry.expandedPayload.content.split('\n').forEach((line) => lines.push(`        ${line}`));
		}
	});
	return lines;
}

/**
 * Formats step metadata (actors, security note) as plain text lines.
 */
function formatStepMetaAsText(step: Step): string[] {
	const lines: string[] = [];
	lines.push('');
	lines.push('Active Components:');
	const activeActors = Object.entries(step.actors)
		.filter(([_, active]) => active)
		.map(([key]) => key);
	lines.push(`  ${activeActors.join(', ')}`);

	if (step.securityNote) {
		lines.push('');
		lines.push('Security Note:');
		lines.push(`  ${step.securityNote}`);
	}
	return lines;
}

/**
 * Generates plain text for a single step (for step-level copy).
 */
export function generateStepText(step: Step): string {
	const lines: string[] = [];

	lines.push(`STEP ${step.id}: ${step.title}`);
	lines.push('-'.repeat(80));
	lines.push('');
	lines.push(`Description: ${step.description}`);
	lines.push('');
	lines.push('What the User Sees:');
	lines.push(`  Browser URL: ${step.urlBar}`);
	lines.push(`  Screen: ${step.userSees}`);
	lines.push('');

	lines.push(...formatHttpEntriesAsText(step.http));
	lines.push(...formatStepMetaAsText(step));

	return lines.join('\n');
}

/**
 * Generates a plain text version of the transcript for clipboard export.
 */
export function generatePlainTextTranscript(steps: Step[], config: DemoConfig): string {
	const lines: string[] = [];

	// Header
	lines.push('='.repeat(80));
	lines.push(config.title);
	lines.push(config.subtitle);
	lines.push(`Version: ${config.version}`);
	lines.push('='.repeat(80));
	lines.push('');

	// Each step
	steps.forEach((step, stepIndex) => {
		lines.push('');
		lines.push(`STEP ${step.id}: ${step.title}`);
		lines.push('-'.repeat(80));
		lines.push('');
		lines.push(`Description: ${step.description}`);
		lines.push('');
		lines.push('What the User Sees:');
		lines.push(`  Browser URL: ${step.urlBar}`);
		lines.push(`  Screen: ${step.userSees}`);
		lines.push('');

		lines.push(...formatHttpEntriesAsText(step.http));
		lines.push(...formatStepMetaAsText(step));

		if (stepIndex < steps.length - 1) {
			lines.push('');
			lines.push('~'.repeat(80));
		}
	});

	lines.push('');
	lines.push('='.repeat(80));
	lines.push(`End of transcript - ${config.title}`);
	lines.push('='.repeat(80));

	return lines.join('\n');
}
