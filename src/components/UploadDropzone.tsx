import { useCallback, useRef, useState } from 'react';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/components/ui';

export function UploadDropzone({
  onFile,
  loading,
  error,
  compact,
}: {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300',
        compact ? 'p-6' : 'p-10 sm:p-14',
        dragging
          ? 'border-indigo-500 bg-indigo-50/60 shadow-glow'
          : 'border-paper-300 bg-white/70 hover:border-indigo-400 hover:bg-white',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl transition-all duration-300',
          compact ? 'h-12 w-12' : 'h-16 w-16',
          dragging ? 'bg-indigo-600 text-white' : 'bg-paper-100 text-indigo-600 group-hover:bg-indigo-50 group-hover:text-indigo-700',
        )}
      >
        {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileUp className={compact ? 'h-6 w-6' : 'h-8 w-8'} />}
      </div>
      <p className={cn('mt-4 font-display font-semibold text-ink-900', compact ? 'text-base' : 'text-lg')}>
        {loading ? 'Reading your file…' : dragging ? 'Drop to analyze' : 'Drag & drop your CSV here'}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        {loading ? 'Parsing rows and inferring column types' : 'or click to browse — .csv files up to ~10MB'}
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
