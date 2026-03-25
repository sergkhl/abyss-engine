'use client';

/**
 * Abyss sheet: same `lockScroll` + shard behavior as `abyss-dialog.tsx`. Keep classNames aligned with `./sheet`.
 * When nested inside `AbyssDialog` (or another sheet that already provided scroll lock context), no inner provider is added.
 */

import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { RemoveScroll } from 'react-remove-scroll';
import { createSlot } from '@radix-ui/react-slot';
import { useComposedRefs } from '@radix-ui/react-compose-refs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import {
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ModalBodyScrollLockProvider,
  useModalBodyScrollLockContext,
} from '@/components/ui/modal-body-scroll-lock';

const SHEET_OVERLAY_CLASS =
  'fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0';

const SHEET_CONTENT_BASE =
  'fixed z-50 flex flex-col gap-4 bg-background bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10';

const RemoveScrollSlot = createSlot('AbyssSheet.RemoveScroll');

export type AbyssSheetProps = React.ComponentProps<typeof SheetPrimitive.Root> & {
  lockScroll?: boolean;
};

export function AbyssSheet({
  lockScroll = false,
  modal,
  open,
  defaultOpen,
  children,
  ...props
}: AbyssSheetProps) {
  const parentLock = useModalBodyScrollLockContext();
  const modalResolved = modal !== false;

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (modalResolved && lockScroll) {
      // eslint-disable-next-line no-console -- dev-only guidance
      console.warn('AbyssSheet: lockScroll is ignored when modal is true (default).');
    }
  }, [modalResolved, lockScroll]);

  const dialogOpen = open !== undefined ? Boolean(open) : Boolean(defaultOpen);

  const root = (
    <SheetPrimitive.Root data-slot="sheet" modal={modal} open={open} defaultOpen={defaultOpen} {...props}>
      {children}
    </SheetPrimitive.Root>
  );

  if (parentLock) {
    return root;
  }

  return (
    <ModalBodyScrollLockProvider
      modal={modalResolved}
      lockScroll={lockScroll}
      dialogOpen={dialogOpen}
      barrierSource="sheet"
    >
      {root}
    </ModalBodyScrollLockProvider>
  );
}

export type AbyssSheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
};

export const AbyssSheetContent = React.forwardRef<HTMLDivElement, AbyssSheetContentProps>(
  function AbyssSheetContent(
    { className, children, side = 'right', showCloseButton = true, ...props },
    forwardedRef,
  ) {
    const lockCtx = useModalBodyScrollLockContext();
    const modalResolved = lockCtx?.modal ?? true;
    const useCustomBodyLock = Boolean(
      lockCtx?.lockScroll && !modalResolved && lockCtx.barrierSource === 'sheet',
    );

    const primaryContentRef = React.useRef<HTMLDivElement | null>(null);
    const composedRefs = useComposedRefs(forwardedRef, primaryContentRef);

    const shards = React.useMemo(() => {
      const extra = lockCtx?.shardRefs ?? [];
      return [primaryContentRef, ...extra];
    }, [lockCtx?.shardRefs, primaryContentRef]);

    const content = (
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(SHEET_CONTENT_BASE, className)}
        ref={composedRefs}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    );

    if (useCustomBodyLock) {
      const dialogOpen = lockCtx?.dialogOpen ?? true;
      return (
        <SheetPrimitive.Portal data-slot="sheet-portal">
          <RemoveScroll as={RemoveScrollSlot} allowPinchZoom shards={shards}>
            <div
              data-slot="sheet-overlay"
              data-state={dialogOpen ? 'open' : 'closed'}
              className={cn(SHEET_OVERLAY_CLASS)}
              style={{ pointerEvents: 'auto' }}
              aria-hidden
            />
          </RemoveScroll>
          {content}
        </SheetPrimitive.Portal>
      );
    }

    return (
      <SheetPrimitive.Portal data-slot="sheet-portal">
        <SheetPrimitive.Overlay
          data-slot="sheet-overlay"
          className={cn(SHEET_OVERLAY_CLASS)}
        />
        {content}
      </SheetPrimitive.Portal>
    );
  },
);

export { SheetClose, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
