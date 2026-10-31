'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type Props = {
  scope: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (scope: string) => void;
  aboveEditor?: boolean;
};

export default function VisualPublishDialog({ scope, busy, onClose, onConfirm, aboveEditor = false }: Props) {
  const shared = scope === '@global';

  return <AlertDialog open={scope !== null} onOpenChange={open => { if (!open) onClose(); }}>
    <AlertDialogContent
      data-visual-editor-ui={aboveEditor ? 'true' : undefined}
      overlayClassName={cn('bg-black/30', aboveEditor && 'z-[100000]')}
      className={cn('shadow-2xl', aboveEditor && 'z-[100001]')}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="font-heading text-2xl font-bold">
          {shared ? 'Publish shared content?' : 'Publish this page?'}
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-6">
          {shared
            ? 'Saved draft changes to the shared header and footer will appear on every page.'
            : 'Saved draft changes to this page will become visible to visitors.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p className="break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
        {shared ? 'All pages · shared header and footer' : scope}
      </p>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={() => { if (scope) onConfirm(scope); }}>
          {shared ? 'Publish shared' : 'Publish page'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
