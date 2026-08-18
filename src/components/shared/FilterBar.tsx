import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { Filter, X } from 'lucide-react';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date';
  options?: { value: string; label: string }[];
  value: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange: (filterId: string, value: string) => void;
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onReset, className }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderFilters = () => (
    <>
      {filters.map((filter) => (
        <div key={filter.id} className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
          <label htmlFor={filter.id} className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {filter.label}
          </label>
          {filter.type === 'select' ? (
            <select
              id={filter.id}
              value={filter.value}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              id={filter.id}
              value={filter.value}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          )}
        </div>
      ))}
      {onReset && (
        <button
          onClick={() => {
            onReset();
            setMobileOpen(false);
          }}
          className="h-8 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Reset
        </button>
      )}
    </>
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view */}
      <div className="hidden items-center space-x-4 md:flex">
        {renderFilters()}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 items-center justify-center space-x-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="w-full animate-in slide-in-from-bottom-2 rounded-t-xl bg-white p-4 shadow-xl dark:bg-slate-900 sm:max-w-sm sm:rounded-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col space-y-4">
                {renderFilters()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
