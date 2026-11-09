import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
};

/** shadcn's AlertDialog layout: no close cross, Cancel and the destructive action bottom-right. */
export const ConfirmDialog: React.FC<Props> = ({ open, onOpenChange, title, description, confirmLabel, busy, onConfirm }) => (
  <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
    <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Deleting…' : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
