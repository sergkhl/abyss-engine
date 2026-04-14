'use client';

import '@/infrastructure/eventBusHandlers';

/**
 * Root layout is a Server Component; `eventBusHandlers` must run in the browser so
 * `appEventBus.on(...)` actually attaches to `window`. Without this, `emit` from
 * client code (e.g. subject generation, topic content generation) dispatches events nothing listens to.
 */
export function EventBusHandlersMount() {
  return null;
}
