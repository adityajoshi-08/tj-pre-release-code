import React from 'react';
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

export const ConfirmDialog: React.FC<Props> = ({ open, onOpenChange, title, description, confirmLabel, busy, onConfirm }) => (
  <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Keep it
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
