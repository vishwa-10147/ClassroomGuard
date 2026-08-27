import { Image } from 'lucide-react';

interface EvidenceItem {
  filename: string;
  url: string;
  size: number;
  created_at: string;
  source: string;
}

interface EvidenceGridProps {
  items: EvidenceItem[];
  onSelect: (item: EvidenceItem) => void;
}

export function EvidenceGrid({ items, onSelect }: EvidenceGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-cg-text-muted">
        <Image className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">No evidence frames found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <button
          key={item.filename}
          onClick={() => onSelect(item)}
          className="group relative aspect-video bg-cg-bg-tertiary rounded-lg overflow-hidden border border-cg-border-default hover:border-brand-500 transition-colors"
        >
          <img
            src={item.url}
            alt={item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <div className="w-full truncate text-xs text-white/90">
              {item.filename}
            </div>
          </div>
          <div className="absolute top-1.5 right-1.5">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                item.source === 'alert'
                  ? 'bg-cg-severity-high/90 text-white'
                  : 'bg-cg-bg-overlay/70 text-cg-text-secondary'
              }`}
            >
              {item.source}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
