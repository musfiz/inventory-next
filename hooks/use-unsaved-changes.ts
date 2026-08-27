import { useEffect, useRef } from 'react';

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave?';

type PushState = (typeof window.history)['pushState'];

/**
 * Guards against losing unsaved form data.
 *
 * - Shows a native `beforeunload` prompt when the user closes/reloads the tab.
 * - Intercepts client-side navigations initiated via `history.pushState`
 *   (Next.js `<Link>` / `router.push`) and `popstate` (back/forward) so a
 *   confirm dialog is shown before leaving a dirty form.
 *
 * `onConfirm` is invoked when the user chooses to leave; `onCancel` when they
 * stay. The caller is responsible for persisting/clearing `isDirty` once the
 * form is saved (e.g. set it back to `false` after a successful submit).
 */
export function useUnsavedChanges(
  isDirty: boolean,
  options: {
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } = {},
) {
  const messageRef = useRef(options.message ?? DEFAULT_MESSAGE);
  const onConfirmRef = useRef(options.onConfirm);
  const onCancelRef = useRef(options.onCancel);

  // Keep the latest callbacks/message without re-running the guard effects.
  useEffect(() => {
    messageRef.current = options.message ?? DEFAULT_MESSAGE;
    onConfirmRef.current = options.onConfirm;
    onCancelRef.current = options.onCancel;
  });

  useEffect(() => {
    if (!isDirty) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = messageRef.current;
      return messageRef.current;
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const originalPushState = window.history.pushState as PushState;
    const originalReplaceState = window.history.replaceState as PushState;

    const intercept =
      (method: PushState) =>
      (...args: Parameters<PushState>): void => {
        if (window.confirm(messageRef.current)) {
          onConfirmRef.current?.();
          method.apply(window.history, args);
        } else {
          onCancelRef.current?.();
        }
      };

    window.history.pushState = intercept(originalPushState) as PushState;
    window.history.replaceState = intercept(originalReplaceState) as PushState;

    const onPopState = () => {
      if (window.confirm(messageRef.current)) {
        onConfirmRef.current?.();
      } else {
        window.history.forward();
        onCancelRef.current?.();
      }
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', onPopState);
    };
  }, [isDirty]);
}
