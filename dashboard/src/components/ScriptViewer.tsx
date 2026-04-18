'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Tag, Clock } from 'lucide-react';
import { ScriptData } from '@/types';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ScriptViewerProps {
  script: ScriptData;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="icon" variant="ghost" onClick={copy} className="h-7 w-7">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function ScriptViewer({ script }: ScriptViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground line-clamp-1">{script.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Script • {script.voiceover_text.split(' ').length} words</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border animate-fade-in">
          {/* Voiceover */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voiceover Script</p>
              <CopyButton text={script.voiceover_text} />
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{script.voiceover_text}</p>
          </div>

          {/* Keywords */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">B-Roll Keywords</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {script.stock_keywords.map(kw => (
                <span key={kw} className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Overlay text */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Captions Timeline</p>
            </div>
            <div className="space-y-2">
              {script.overlay_text.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-10 flex-shrink-0 mt-0.5">
                    {item.timestamp.toFixed(1)}s
                  </span>
                  <span className="text-foreground">{item.text}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{item.duration}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
