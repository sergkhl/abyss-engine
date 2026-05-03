import {
	ATTUNEMENT_SUBMISSION_COOLDOWN_MS,
	useStudySessionStore,
} from '../stores/studySessionStore';

/**
 * Milliseconds of attunement-ritual cooldown still remaining at `atMs`.
 * Adapter rule: reads exactly one store (`studySessionStore`) and applies
 * the cooldown constant from that store's module (the gate is part of the
 * session lifecycle, not of any policy).
 */
export function useRemainingRitualCooldownMs(atMs: number): number {
	const last = useStudySessionStore((s) => s.lastRitualSubmittedAt);
	if (!last) return 0;
	return Math.max(0, ATTUNEMENT_SUBMISSION_COOLDOWN_MS - (atMs - last));
}
