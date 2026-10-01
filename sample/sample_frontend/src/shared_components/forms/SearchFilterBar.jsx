import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';

/**
 * SearchFilterBar
 * ───────────────
 * Controlled search input with 300ms debounce, category select dropdowns,
 * and interactive PillTabs synchronized with URL query parameters.
 *
 * @param {string[]}  tabs            - Tab labels (e.g., ['All', 'Open', 'In Review', 'Resolved'])
 * @param {string}    [tabParam]      - URL query param key for active tab (default: 'tab')
 * @param {string}    [searchParam]   - URL query param key for search (default: 'q')
 * @param {Function}  [onSearch]      - Called with debounced search value
 * @param {Function}  [onTabChange]   - Called with new active tab
 * @param {Array}     [filters]       - Array of { key, label, options: [{label, value}] }
 * @param {Function}  [onFilterChange]- Called with { key, value } on select change
 */
export default function SearchFilterBar({
  tabs = [],
  tabParam = 'tab',
  searchParam = 'q',
  onSearch,
  onTabChange,
  filters = [],
  onFilterChange,
  placeholder = 'Search…',
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get(searchParam) ?? '');
  const debounceRef = useRef(null);

  const activeTab = searchParams.get(tabParam) ?? (tabs[0] ?? 'All');

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (val) next.set(searchParam, val); else next.delete(searchParam);
        return next;
      });
      onSearch?.(val);
    }, 300);
  }, [searchParam, setSearchParams, onSearch]);

  const clearSearch = useCallback(() => {
    setInputValue('');
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete(searchParam); return next; });
    onSearch?.('');
  }, [searchParam, setSearchParams, onSearch]);

  const handleTabClick = useCallback((tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === tabs[0]) next.delete(tabParam); else next.set(tabParam, tab);
      return next;
    });
    onTabChange?.(tab);
  }, [tabs, tabParam, setSearchParams, onTabChange]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {/* Search Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: '1px solid var(--border-color)',
        borderRadius: 8, padding: '7px 12px',
        background: 'white', minWidth: 220,
        transition: 'border-color var(--transition-fast)',
      }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-ring)'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          id="search-filter-input"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          style={{
            border: 'none', outline: 'none', background: 'none',
            fontSize: 13, color: 'var(--text-main)', flex: 1, minWidth: 0,
          }}
        />
        {inputValue && (
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category Selects */}
      {filters.map(filter => (
        <select
          key={filter.key}
          id={`filter-${filter.key}`}
          defaultValue=""
          onChange={(e) => onFilterChange?.({ key: filter.key, value: e.target.value })}
          style={{
            padding: '7px 10px',
            border: '1px solid var(--border-color)',
            borderRadius: 8, background: 'white',
            fontSize: 13, color: 'var(--text-main)',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">{filter.label}</option>
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Pill Tabs */}
      {tabs.length > 0 && (
        <div style={{
          display: 'flex', background: 'var(--surface-3)',
          borderRadius: 20, padding: 4, gap: 2,
          marginLeft: 'auto',
        }}>
          {tabs.map(tab => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleTabClick(tab)}
              style={{
                padding: '5px 14px',
                borderRadius: 16,
                fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                border: 'none', cursor: 'pointer',
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--transition)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
