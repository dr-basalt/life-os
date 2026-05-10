'use client'

import { useEffect, useRef } from 'react'
import type { FC } from 'react'

type GraphNode = { id: string; label: string; type: string }
type GraphEdge = { source: string; target: string; label?: string }

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const nodeColor: Record<string, string> = {
  User: '#7c3aed',
  Douleur: '#ef4444',
  OKR: '#10b981',
  P0: '#f59e0b',
  Insight: '#3b82f6',
  Pattern: '#8b5cf6',
  Concept: '#6b7280',
  Tag: '#374151',
}

export const GraphView: FC<Props> = ({ nodes, edges }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    let cy: unknown
    import('cytoscape').then(({ default: Cytoscape }) => {
      cy = Cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map(n => ({
            data: { id: n.id, label: n.label, type: n.type },
          })),
          ...edges.map(e => ({
            data: { source: e.source, target: e.target, label: e.label },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (el: { data: (k: string) => string }) =>
                nodeColor[el.data('type')] ?? '#6b7280',
              label: 'data(label)',
              color: '#e8e8f0',
              'font-size': 11,
              'text-valign': 'bottom',
              'text-halign': 'center',
              width: 36,
              height: 36,
            },
          },
          {
            selector: 'edge',
            style: {
              'line-color': '#2a2a3a',
              'target-arrow-color': '#2a2a3a',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': 9,
              color: '#6b6b80',
            },
          },
        ],
        layout: { name: 'cose', animate: false },
      })
    })

    return () => {
      if (cy && typeof (cy as { destroy: () => void }).destroy === 'function') {
        ;(cy as { destroy: () => void }).destroy()
      }
    }
  }, [nodes, edges])

  return (
    <div className="graph-view">
      <h2 className="widget-title">Graphe cognitif</h2>
      <div ref={containerRef} className="graph-container" />
    </div>
  )
}
