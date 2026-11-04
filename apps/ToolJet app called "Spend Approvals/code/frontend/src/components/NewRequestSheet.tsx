import React, { useMemo, useState } from 'react';
import { useSpend } from '../lib/spend-context';
import { costCentreOptions, isoToday, money, needsFinance, thresholdOverage, percent } from '../lib/spend';
import { Button } from './ui/button';
import { Input, Label, Textarea } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Notice } from './Notice';

interface FieldErrors {
  item?: string;
  vendor?: string;
  amount?: string;
  centre?: string;
  neededBy?: string;
  justification?: string;
}

export const NewRequestSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (message: string) => void;
}> = ({ open, onOpenChange, onSubmitted }) => {
  const { submitRequest, directory, viewer } = useSpend();
  const options = useMemo(() => costCentreOptions(directory), [directory]);

  const [item, setItem] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [costCentre, setCostCentre] = useState(viewer?.cost_centre ?? '');
  const [neededBy, setNeededBy] = useState('');
  const [justification, setJustification] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numericAmount = Number(amount);
  const overage = thresholdOverage(Number.isFinite(numericAmount) ? numericAmount : 0);

  const department = options.find((option) => option.value === costCentre)?.label.split(' · ')[1] ?? '';

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!item.trim()) next.item = 'Name the item or service.';
    if (!vendor.trim()) next.vendor = 'Add the vendor or supplier.';
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      next.amount = 'Enter an amount above zero.';
    }
    if (!costCentre) next.centre = 'Choose the cost centre this spend belongs to.';
    if (!neededBy) next.neededBy = 'Choose the date it is needed by.';
    else if (neededBy < isoToday()) next.neededBy = 'Choose today or a later date.';
    if (justification.trim().length < 15) next.justification = 'Give at least a sentence on why this spend is needed.';
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const result = await submitRequest({
        itemName: item,
        vendor,
        amount: numericAmount,
        costCentre,
        department,
        neededBy,
        justification,
      });
      setItem('');
      setVendor('');
      setAmount('');
      setNeededBy('');
      setJustification('');
      setErrors({});
      onOpenChange(false);
      onSubmitted(
        `Request ${result.code} is with ${result.approverName || 'Finance'} for ${result.stage.toLowerCase()}.`
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The request could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New purchase request</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Up to $5,000 goes to your manager. Above $5,000 also goes to Finance once your manager approves.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-1 space-y-4">
          {submitError ? <Notice tone="error">{submitError}</Notice> : null}

          <div className="space-y-1.5">
            <Label htmlFor="request-item">Item or service</Label>
            <Input
              id="request-item"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder="Figma Organization, 12 seats"
              aria-invalid={Boolean(errors.item)}
              autoComplete="off"
            />
            {errors.item ? <p className="text-xs text-destructive">{errors.item}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="request-vendor">Vendor</Label>
              <Input
                id="request-vendor"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                placeholder="Figma"
                aria-invalid={Boolean(errors.vendor)}
                autoComplete="off"
              />
              {errors.vendor ? <p className="text-xs text-destructive">{errors.vendor}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-amount">Amount (USD)</Label>
              <Input
                id="request-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="2500.00"
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="request-centre">Cost centre</Label>
              <Select value={costCentre || undefined} onValueChange={setCostCentre}>
                <SelectTrigger id="request-centre" aria-invalid={Boolean(errors.centre)}>
                  <SelectValue placeholder="Choose a cost centre" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.centre ? <p className="text-xs text-destructive">{errors.centre}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-needed-by">Needed by</Label>
              <Input
                id="request-needed-by"
                type="date"
                min={isoToday()}
                value={neededBy}
                onChange={(event) => setNeededBy(event.target.value)}
                aria-invalid={Boolean(errors.neededBy)}
              />
              {errors.neededBy ? <p className="text-xs text-destructive">{errors.neededBy}</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-justification">Justification</Label>
            <Textarea
              id="request-justification"
              rows={4}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="What it is for, and what changes if it is approved."
              aria-invalid={Boolean(errors.justification)}
            />
            {errors.justification ? <p className="text-xs text-destructive">{errors.justification}</p> : null}
          </div>

          <div className="rounded-lg border border-border bg-muted/60 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
            {overage.over ? (
              <>
                <span className="font-semibold text-foreground">{money(numericAmount)}</span> is{' '}
                {money(overage.amount)} ({percent(overage.percent)}) above the $5,000 line, so Finance reviews it
                after your manager.
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{money(Number.isFinite(numericAmount) ? numericAmount : 0)}</span>{' '}
                stays with your manager: the Finance step starts above $5,000.
              </>
            )}
            {needsFinance(numericAmount) ? ' Finance will pick it up automatically.' : ''}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send for approval'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
