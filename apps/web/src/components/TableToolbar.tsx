import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

type TableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
};

export function TableToolbar({ search, onSearchChange, placeholder, children }: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <label className="search-field">
        <Search size={17} strokeWidth={2.3} aria-hidden="true" />
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={search}
        />
      </label>
      {children ? <div className="toolbar-actions">{children}</div> : null}
    </div>
  );
}
