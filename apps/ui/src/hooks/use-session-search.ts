import { useState, useCallback } from 'react';
import { useDebounceValue } from 'usehooks-ts';

/**
 * Manages search state with debouncing for session filtering.
 * Uses 300ms debounce to prevent excessive re-filtering during typing.
 */
export function useSessionSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounceValue(searchTerm, 300);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
  };
}
