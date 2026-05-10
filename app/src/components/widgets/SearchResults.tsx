import type { FC } from 'react'

type SearchResult = {
  id: string
  text: string
  score?: number
  source?: string
  tags?: string[]
}

type Props = {
  results: SearchResult[]
  query?: string
}

export const SearchResults: FC<Props> = ({ results, query }) => (
  <div className="search-results">
    <h2 className="widget-title">
      Insights{query ? ` — "${query}"` : ''}
    </h2>
    {results.length === 0 ? (
      <p className="muted">Aucun insight trouvé</p>
    ) : (
      <ul className="result-list">
        {results.map(r => (
          <li key={r.id} className="result-item">
            <p className="result-text">{r.text}</p>
            <div className="result-meta">
              {r.source && <span className="result-source">{r.source}</span>}
              {r.score != null && (
                <span className="result-score">{Math.round(r.score * 100)}%</span>
              )}
              {r.tags?.map(t => (
                <span key={t} className="result-tag">{t}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
)
