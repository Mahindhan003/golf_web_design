import { useRef, type MouseEvent } from 'react'
import type { HoleMap, Point } from './types'
import { dist } from './golf'

/*
 * Draws one hole from its yard-grid geometry (tee at the bottom, green at the top).
 * Used by the admin hole editor (click to place points), the golfer course guide and
 * live play (marked shots, the ball's position and a tap-to-measure target).
 * A real app would draw the same points on satellite tiles from their latitude/longitude.
 */

export interface MapShot { at: Point; label?: string }

interface HoleMapViewProps {
  map: HoleMap
  /** Taller, more detailed rendering for live play */
  size?: 'sm' | 'md' | 'lg' | 'fill'
  shots?: MapShot[]
  /** Current ball position (live play) */
  ball?: Point
  /** Tap-to-measure target */
  target?: Point
  onPick?: (p: Point) => void
  /** Highlight a point while editing (e.g. the one being placed) */
  highlight?: 'tee' | 'green' | 'hazard'
  ariaLabel?: string
}

const FAIRWAY_WIDTH = 38
const PAD = 30

export function HoleMapView({ map, size = 'md', shots = [], ball, target, onPick, highlight, ariaLabel }: HoleMapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Bounds in yards, padded; keep a minimum width so straight holes don't look like a stick
  const pts = [map.tee, ...map.path, map.greenFront, map.greenBack, ...map.hazards.map(h => h.at), ...shots.map(s => s.at), ...(ball ? [ball] : []), ...(target ? [target] : [])]
  let minX = Math.min(...pts.map(p => p.x)) - PAD
  let maxX = Math.max(...pts.map(p => p.x)) + PAD
  const minY = Math.min(...pts.map(p => p.y)) - PAD
  const maxY = Math.max(...pts.map(p => p.y)) + PAD
  const minWidth = (maxY - minY) * 0.42
  if (maxX - minX < minWidth) { const grow = (minWidth - (maxX - minX)) / 2; minX -= grow; maxX += grow }
  const width = maxX - minX
  const height = maxY - minY

  // Yards → SVG (flip y so the green is at the top)
  const sx = (p: Point) => p.x - minX
  const sy = (p: Point) => maxY - p.y
  const line = (list: Point[]) => list.map(p => `${sx(p)},${sy(p)}`).join(' ')

  const greenRadius = Math.max(8, dist(map.greenFront, map.greenBack) / 2 + 2)

  function pick(e: MouseEvent<SVGSVGElement>) {
    if (!onPick || !svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = pt.matrixTransform(ctm.inverse())
    onPick({ x: Math.round(local.x + minX), y: Math.round(maxY - local.y) })
  }

  const heights = { sm: 'h-[220px]', md: 'h-[360px]', lg: 'h-[520px]', fill: 'h-full' }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={pick}
      role="img"
      aria-label={ariaLabel ?? 'Hole map'}
      className={`w-full ${heights[size]} rounded-2xl bg-[#2f6b3a] ${onPick ? 'cursor-crosshair' : ''}`}
    >

      {/* Fairway along the centre line */}
      <polyline points={line(map.path)} fill="none" stroke="#5fae5a" strokeWidth={FAIRWAY_WIDTH} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
      <polyline points={line(map.path)} fill="none" stroke="#6cbb64" strokeWidth={FAIRWAY_WIDTH * 0.55} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />

      {/* Hazards */}
      {map.hazards.map(h => (
        <circle key={h.id} cx={sx(h.at)} cy={sy(h.at)} r={h.size}
          fill={h.type === 'bunker' ? '#e9d9a6' : h.type === 'water' ? '#3b82c4' : '#1f4a28'}
          stroke={h.type === 'bunker' ? '#cdb879' : h.type === 'water' ? '#2563a6' : '#173a1f'} strokeWidth={1.5}
          opacity={highlight === 'hazard' ? 1 : 0.95} />
      ))}

      {/* Green with front/back marks and the flag */}
      <circle cx={sx(map.greenCentre)} cy={sy(map.greenCentre)} r={greenRadius + 4} fill="#5fae5a" />
      <circle cx={sx(map.greenCentre)} cy={sy(map.greenCentre)} r={greenRadius} fill="#8fd27f" stroke={highlight === 'green' ? '#c8ec5a' : '#77c068'} strokeWidth={highlight === 'green' ? 3 : 1.5} />
      <line x1={sx(map.greenCentre)} y1={sy(map.greenCentre)} x2={sx(map.greenCentre)} y2={sy(map.greenCentre) - 16} stroke="#ffffff" strokeWidth={1.5} />
      <path d={`M${sx(map.greenCentre)},${sy(map.greenCentre) - 16} l9,3.5 l-9,3.5 z`} fill="#dc2626" />
      <circle cx={sx(map.greenFront)} cy={sy(map.greenFront)} r={1.6} fill="#ffffff" opacity={0.8} />
      <circle cx={sx(map.greenBack)} cy={sy(map.greenBack)} r={1.6} fill="#ffffff" opacity={0.8} />

      {/* Tee box */}
      <rect x={sx(map.tee) - 7} y={sy(map.tee) - 4} width={14} height={8} rx={2} fill="#c8ec5a"
        stroke={highlight === 'tee' ? '#ffffff' : '#a9d334'} strokeWidth={highlight === 'tee' ? 2 : 1} />

      {/* Shots: path from the tee through each marked ball position */}
      {shots.length > 0 && (
        <polyline points={line([map.tee, ...shots.map(s => s.at)])} fill="none" stroke="#ffffff" strokeWidth={1.6} strokeDasharray="4 3" />
      )}
      {shots.map((s, i) => (
        <g key={i}>
          <circle cx={sx(s.at)} cy={sy(s.at)} r={5.5} fill="#0c1a12" stroke="#ffffff" strokeWidth={1.2} />
          <text x={sx(s.at)} y={sy(s.at) + 2.6} textAnchor="middle" fontSize={7} fontWeight={700} fill="#c8ec5a">{s.label ?? i + 1}</text>
        </g>
      ))}

      {/* Ball and tap target */}
      {ball && <circle cx={sx(ball)} cy={sy(ball)} r={4} fill="#ffffff" stroke="#0c1a12" strokeWidth={1.2} />}
      {ball && target && (
        <>
          <line x1={sx(ball)} y1={sy(ball)} x2={sx(target)} y2={sy(target)} stroke="#c8ec5a" strokeWidth={1.6} />
          <line x1={sx(target)} y1={sy(target)} x2={sx(map.greenCentre)} y2={sy(map.greenCentre)} stroke="#c8ec5a" strokeWidth={1.2} strokeDasharray="3 3" />
          <circle cx={sx(target)} cy={sy(target)} r={6} fill="none" stroke="#c8ec5a" strokeWidth={2} />
          <MapLabel x={(sx(ball) + sx(target)) / 2} y={(sy(ball) + sy(target)) / 2} text={`${dist(ball, target)}`} />
          <MapLabel x={(sx(target) + sx(map.greenCentre)) / 2} y={(sy(target) + sy(map.greenCentre)) / 2} text={`${dist(target, map.greenCentre)}`} />
        </>
      )}
    </svg>
  )
}

function MapLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g>
      <rect x={x - 12} y={y - 7} width={24} height={13} rx={6.5} fill="#0c1a12" />
      <text x={x} y={y + 2.6} textAnchor="middle" fontSize={8} fontWeight={700} fill="#c8ec5a">{text}</text>
    </g>
  )
}

/** Yards from a point to the front, centre and back of the green. */
export function greenDistances(map: HoleMap, from: Point) {
  return { front: dist(from, map.greenFront), centre: dist(from, map.greenCentre), back: dist(from, map.greenBack) }
}

/** Hazards still ahead of a point, nearest first, with yards to reach and to carry them. */
export function hazardsAhead(map: HoleMap, from: Point) {
  return map.hazards
    .filter(h => h.at.y > from.y - 5)
    .map(h => ({ hazard: h, reach: Math.max(0, dist(from, h.at) - h.size), carry: dist(from, h.at) + h.size }))
    .sort((a, b) => a.reach - b.reach)
}
