import { useState } from 'react';
import { Download, FileText, Image, Table2, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastStore } from '@/stores/toastStore';

interface ExportOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ExportButtonProps {
  options: ExportOption[];
  onExport: (optionId: string) => Promise<void>;
  className?: string;
  label?: string;
}

export function ExportButton({ options, onExport, className, label = 'Export' }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const handleExport = async (optionId: string) => {
    setLoading(optionId);
    try {
      await onExport(optionId);
      addToast('Export complete', 'success');
    } catch {
      addToast('Export failed', 'error');
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-cg-border-default',
          'bg-cg-bg-secondary px-3 py-1.5 text-sm font-medium text-cg-text-secondary',
          'hover:bg-cg-bg-tertiary hover:text-cg-text-primary transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-border-focus'
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" />
        {label}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute right-0 top-full z-dropdown mt-1 w-64 overflow-hidden rounded-lg',
              'border border-cg-border-default bg-cg-bg-secondary shadow-cg-lg animate-fade-in'
            )}
            role="menu"
          >
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={loading !== null}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  'hover:bg-cg-bg-tertiary disabled:opacity-50',
                  loading === option.id && 'bg-cg-bg-tertiary'
                )}
                role="menuitem"
              >
                {loading === option.id ? (
                  <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin text-cg-text-tertiary" />
                ) : (
                  <span className="shrink-0 mt-0.5 text-cg-text-tertiary">{option.icon}</span>
                )}
                <div>
                  <p className="text-sm font-medium text-cg-text-primary">{option.label}</p>
                  <p className="text-xs text-cg-text-tertiary">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const defaultExportOptions: ExportOption[] = [
  { id: 'pdf-report', label: 'PDF Report', icon: <FileText className="h-4 w-4" />, description: 'Full report with charts and tables' },
  { id: 'pdf-alerts', label: 'Alert Summary', icon: <Table2 className="h-4 w-4" />, description: 'Alert list as PDF' },
  { id: 'pdf-evidence', label: 'Evidence Gallery', icon: <Image className="h-4 w-4" />, description: 'Evidence frames as PDF' },
];
