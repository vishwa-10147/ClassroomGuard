import { useState, useEffect, useMemo } from 'react';
import { Image, Filter, ArrowUpDown, Loader2 } from 'lucide-react';
import { evidenceService } from '@/services/api/evidenceService';
import { EvidenceGrid } from '@/features/evidence/components/EvidenceGrid';
import { EvidenceLightbox } from '@/features/evidence/components/EvidenceLightbox';

type FilterType = 'all' | 'alert' | 'periodic';

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<EvidenceItem | null>(null);

  interface EvidenceItem {
    filename: string;
    url: string;
    size: number;
    created_at: string;
    source: string;
  }

  useEffect(() => {
    Promise.all([evidenceService.getFrames(), evidenceService.getAlertFrames()])
      .then(([frames, alerts]) => {
        const all = [...frames, ...alerts];
        setItems(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== 'all') {
      result = result.filter((i) => i.source === filter);
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDesc ? -diff : diff;
    });
    return result;
  }, [items, filter, sortDesc]);

  const selectedIndex = selected ? filtered.findIndex((i) => i.filename === selected.filename) : -1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold text-cg-text-primary flex items-center gap-2">
          <Image className="w-5 h-5 text-brand-500" /> Evidence Viewer
        </h1>
        <p className="mt-0.5 text-sm text-cg-text-secondary">
          Review annotated frames from detection events and periodic captures
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-cg-bg-tertiary rounded-lg p-1">
          {(['all', 'alert', 'periodic'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-brand-500 text-white'
                  : 'text-cg-text-secondary hover:text-cg-text-primary'
              }`}
            >
              <Filter className="w-3 h-3 inline mr-1" />
              {f === 'all' ? 'All' : f === 'alert' ? 'Alert' : 'Periodic'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cg-text-secondary hover:text-cg-text-primary bg-cg-bg-tertiary rounded-lg transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortDesc ? 'Newest first' : 'Oldest first'}
        </button>

        <span className="text-xs text-cg-text-muted ml-auto">
          {filtered.length} frame{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      <EvidenceGrid items={filtered} onSelect={setSelected} />

      {/* Lightbox */}
      <EvidenceLightbox
        item={selected}
        onClose={() => setSelected(null)}
        onPrev={selectedIndex > 0 ? () => setSelected(filtered[selectedIndex - 1]) : undefined}
        onNext={selectedIndex < filtered.length - 1 ? () => setSelected(filtered[selectedIndex + 1]) : undefined}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex < filtered.length - 1}
      />
    </div>
  );
}
