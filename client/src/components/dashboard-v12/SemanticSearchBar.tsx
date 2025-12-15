/**
 * Semantic Search Bar Component
 * Dashboard用のセマンティック検索バー
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { semanticSearch, type SearchResult } from '@/lib/semantic/search';

interface SemanticSearchBarProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function SemanticSearchBar({ onResultSelect, className }: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await semanticSearch(query, 5);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="セマンティック検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          size="default"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">検索結果 ({results.length}件)</p>
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-md hover:bg-accent cursor-pointer border border-border"
                  onClick={() => onResultSelect?.(result)}
                >
                  <p className="text-sm line-clamp-2">{result.document.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      ID: {result.document.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      類似度: {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

