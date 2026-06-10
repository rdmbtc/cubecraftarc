import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { walletState } from './walletState'
import { ZONE_TYPES } from './config'

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: 12,
    padding: 24,
    width: 600,
    maxHeight: '80vh',
    overflow: 'auto' as const,
    border: '1px solid #16213e',
    color: 'white',
    fontFamily: 'Minecraft, monospace',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    color: '#4ecca3',
    textAlign: 'center' as const,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  parcel: {
    background: '#16213e',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold' as const,
    fontFamily: 'Minecraft, monospace',
  },
  buyBtn: {
    background: 'linear-gradient(135deg, #4ecca3, #2d8f72)',
    color: 'white',
    width: '100%',
    marginTop: 8,
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold' as const,
    fontFamily: 'Minecraft, monospace',
  },
  filter: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  filterBtn: {
    padding: '6px 14px',
    border: '1px solid #333',
    borderRadius: 20,
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Minecraft, monospace',
  },
  filterBtnActive: {
    background: '#4ecca3',
    color: 'white',
    borderColor: '#4ecca3',
  },
}

const SAMPLE_PARCELS = [
  { id: 1, x: 0, y: 0, zone: 'Commercial', price: 5, level: 0 },
  { id: 2, x: 1, y: 0, zone: 'Commercial', price: 5, level: 0 },
  { id: 3, x: 2, y: 0, zone: 'Residential', price: 3, level: 0 },
  { id: 4, x: 3, y: 0, zone: 'Residential', price: 3, level: 0 },
  { id: 5, x: 0, y: 1, zone: 'Industrial', price: 8, level: 0 },
  { id: 6, x: 1, y: 1, zone: 'Industrial', price: 8, level: 0 },
  { id: 7, x: 2, y: 1, zone: 'Special', price: 15, level: 0 },
  { id: 8, x: 3, y: 1, zone: 'Commercial', price: 5, level: 0 },
  { id: 9, x: 4, y: 0, zone: 'Residential', price: 3, level: 1 },
  { id: 10, x: 5, y: 0, zone: 'Commercial', price: 6, level: 1 },
  { id: 11, x: 4, y: 1, zone: 'Industrial', price: 10, level: 1 },
  { id: 12, x: 5, y: 1, zone: 'Special', price: 20, level: 2 },
]

export default function LandMarket() {
  const { connected } = useSnapshot(walletState)
  const [filter, setFilter] = useState<string | null>(null)
  const [buying, setBuying] = useState<number | null>(null)

  if (!walletState.showLandMarket) return null

  const filtered = filter
    ? SAMPLE_PARCELS.filter(p => p.zone === filter)
    : SAMPLE_PARCELS

  const handleBuy = (parcelId: number) => {
    if (!connected) {
      alert('Please connect your wallet first!')
      return
    }
    setBuying(parcelId)
    setTimeout(() => {
      alert(`Land parcel #${parcelId} purchased! (Demo mode - deploy contracts for real transactions)`)
      setBuying(null)
    }, 1500)
  }

  const zoneColors: Record<string, string> = {
    Commercial: '#00d4ff',
    Residential: '#4ecca3',
    Industrial: '#ff9f43',
    Special: '#ff4444',
  }

  return (
    <div style={styles.overlay} onClick={() => walletState.showLandMarket = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>🌍 Land Market</div>

        <div style={styles.filter}>
          <button
            style={{ ...styles.filterBtn, ...(filter === null ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(null)}
          >
            All
          </button>
          {ZONE_TYPES.map(zone => (
            <button
              key={zone}
              style={{ ...styles.filterBtn, ...(filter === zone ? styles.filterBtnActive : {}) }}
              onClick={() => setFilter(zone)}
            >
              {zone}
            </button>
          ))}
        </div>

        <div style={styles.grid}>
          {filtered.map(parcel => (
            <div
              key={parcel.id}
              style={{
                ...styles.parcel,
                borderColor: zoneColors[parcel.zone] + '40',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColors[parcel.zone] }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = zoneColors[parcel.zone] + '40' }}
            >
              <div style={{ fontSize: 11, color: zoneColors[parcel.zone] }}>{parcel.zone}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0' }}>Parcel #{parcel.id}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Position: ({parcel.x}, {parcel.y})</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Dev Level: {parcel.level}</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4ecca3', marginTop: 4 }}>
                ${parcel.price} USDC/day
              </div>
              <button style={styles.buyBtn} onClick={() => handleBuy(parcel.id)} disabled={buying === parcel.id}>
                {buying === parcel.id ? 'Buying...' : '🏗️ Buy Parcel'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
          Powered by Arc Testnet • USDC Payments • NFT Land Ownership
        </div>
      </div>
    </div>
  )
}
