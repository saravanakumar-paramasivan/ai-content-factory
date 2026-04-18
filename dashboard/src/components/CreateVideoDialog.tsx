'use client';
import { useState, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Spinner } from './ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

const NICHE_EXAMPLES = [
  'Cold Plunge Benefits Backed by Science',
  'Personal Finance for Gen Z',
  'Stoic Philosophy for Modern Life',
  'AI Tools That Replace Your Marketing Team',
  'Dopamine Detox: The Science Behind It',
];

interface CreateVideoDialogProps {
  onCreated: () => void;
  // Controlled mode — used by the Trending page
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialNiche?: string;
  hideButton?: boolean;
}

export function CreateVideoDialog({
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialNiche = '',
  hideButton = false,
}: CreateVideoDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;

  const [niche, setNiche] = useState(initialNiche);
  const [loading, setLoading] = useState(false);

  // Sync niche when initialNiche changes (e.g. user picks a different card)
  useEffect(() => { setNiche(initialNiche); }, [initialNiche]);

  function setOpen(v: boolean) {
    if (isControlled) controlledOnOpenChange?.(v);
    else setInternalOpen(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = niche.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to create project');
      }
      toast.success('Pipeline started!', { description: `"${trimmed}" is now being processed.` });
      setNiche('');
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error('Failed to create video', { description: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!hideButton && (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Video
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate New Video
            </DialogTitle>
            <DialogDescription>
              Enter a niche topic. The AI will write the script, record voiceover, find B-roll, and render a 1080×1920 Short automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="niche">Niche Topic</Label>
              <Input
                id="niche"
                placeholder="e.g. Cold Plunge Benefits Backed by Science"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                maxLength={120}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-right">{niche.length}/120</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Quick examples:</p>
              <div className="flex flex-wrap gap-1.5">
                {NICHE_EXAMPLES.map(example => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setNiche(example)}
                    className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={!niche.trim() || loading}>
                {loading ? <><Spinner className="h-4 w-4" /> Starting…</> : 'Generate Video'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
