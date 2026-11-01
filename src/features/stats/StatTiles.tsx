import './stats.css'

export interface StatTile {
  label: string
  value: string
}

/** Row of headline numbers: sentence-case label above a semibold value. */
export default function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <dl className="stat-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="stat-tile">
          <dt>{tile.label}</dt>
          <dd>{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}
