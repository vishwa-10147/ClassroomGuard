import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

interface EvidenceItem {
  filename: string;
  url: string;
  size: number;
  created_at: string;
  source: string;
}

interface EvidenceLightboxProps {
  item: EvidenceItem | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function EvidenceLightbox({
  item,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: EvidenceLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    if (item) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [item, handleKeyDown]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-cg-bg-overlay animate-fade-in">
      {/* Close */}
      <div className="absolute top-4 right-4 z-20">
        <IconButton
          icon={<X className="w-5 h-5 text-white" />}
          label="Close lightbox"
          onClick={onClose}
          size="lg"
        />
      </div>

      {/* Prev */}
      {hasPrev && onPrev && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
          <IconButton
            icon={<ChevronLeft className="w-6 h-6 text-white" />}
            label="Previous"
            onClick={onPrev}
            size="lg"
          />
        </div>
      )}

      {/* Next */}
      {hasNext && onNext && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
          <IconButton
            icon={<ChevronRight className="w-6 h-6 text-white" />}
            label="Next"
            onClick={onNext}
            size="lg"
          />
        </div>
      )}

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[85vh]">
        <img
          src={item.url}
          alt={item.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        <div className="mt-3 text-center">
          <p className="text-sm text-white/90 font-medium">{item.filename}</p>
          <p className="text-xs text-white/60 mt-1">
            {formatSize(item.size)} &bull; {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
