import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { walletState } from './walletState'

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
    width: 550,
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
    color: '#ff9f43',
    textAlign: 'center' as const,
  },
  business: {
    background: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center',
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
  claimBtn: {
    background: 'linear-gradient(135deg, #4ecca3, #2d8f72)',
    color: 'white',
  },
  upgradeBtn: {
    background: 'linear-gradient(135deg, #ff9f43, #cc7a2a)',
    color: 'white',
  },
  buildBtn: {
    background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
    color: 'white',
    width: '100%',
    padding: 12,
    marginTop: 16,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold' as const,
    fontFamily: 'Minecraft, monospace',
  },
  stat: {
    textAlign: 'center' as const,
    padding: 12,
    background: '#0f3460',
    borderRadius: 8,
  },
}

const BUSINESS_ICONS: Record<string, string> = {
  Shop: '🏪',
  Farm: '🌾',
  Mine: '⛏️',
  Factory: '🏭',
  Marketplace: '🛒',
  Tower: '🗼',
}

const DEMO_BUSINESSES = [
  { id: 1, type: 'Shop', level: 2, revenuePerHour: 1.0, totalEarned: 24.5, parcelId: 1 },
  { id: 2, type: 'Farm', level: 1, revenuePerHour: 0.3, totalEarned: 7.2, parcelId: 3 },
  { id: 3, type: 'Factory', level: 3, revenuePerHour: 3.6, totalEarned: 86.4, parcelId: 5 },
]

export default function BusinessPanel() {
  const [claiming, setClaiming] = useState<number | null>(null)

  if (!walletState.showBusinessPanel) return null

  const totalRevenue = DEMO_BUSINESSES.reduce((sum, b) => sum + b.revenuePerHour, 0)
  const totalEarned = DEMO_BUSINESSES.reduce((sum, b) => sum + b.totalEarned, 0)

  const handleClaim = (businessId: number) => {
    setClaiming(businessId)
    setTimeout(() => {
      alert(`Revenue claimed for Business #${businessId}! (Demo mode)`)
      setClaiming(null)
    }, 1000)
  }

  return (
    <div style={styles.overlay} onClick={() => walletState.showBusinessPanel = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>🏗️ My Businesses</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Businesses</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9f43' }}>{DEMO_BUSINESSES.length}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Revenue/hr</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4ecca3' }}>${totalRevenue.toFixed(1)}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Total Earned</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00d4ff' }}>${totalEarned.toFixed(1)}</div>
          </div>
        </div>

        {DEMO_BUSINESSES.map(biz => (
          <div key={biz.id} style={styles.business}>
            <div>
              <div style={{ fontSize: 16 }}>{BUSINESS_ICONS[biz.type]} {biz.type}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Level {biz.level} • Parcel #{biz.parcelId}</div>
              <div style={{ fontSize: 12, color: '#4ecca3', marginTop: 2 }}>
                ${biz.revenuePerHour}/hr • Earned: ${biz.totalEarned.toFixed(1)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.claimBtn} onClick={() => handleClaim(biz.id)} disabled={claiming === biz.id}>
                {claiming === biz.id ? '...' : '💰 Claim'}
              </button>
              <button style={styles.upgradeBtn}>⬆️ Upgrade</button>
            </div>
          </div>
        ))}

        <button style={styles.buildBtn}>🏗️ Build New Business (Select a land parcel first)</button>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#555' }}>
          Businesses generate USDC revenue over time • Upgrade to increase earnings
        </div>
      </div>
    </div>
  )
}
