import { useState, useEffect, useCallback } from 'react'
import { useSnapshot } from 'valtio'
import { walletState } from './walletState'
import { ZONE_TYPES } from './config'

const API_BASE = 'http://150.241.88.229:25567'

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
    width: 700,
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
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 12,
    background: '#0f3460',
    borderRadius: 8,
  },
  stat: {
    textAlign: 'center' as const,
  },
  tab: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold' as const,
    fontFamily: 'Minecraft, monospace',
    marginRight: 4,
  },
}

const zoneColors: Record<string, string> = {
  Commercial: '#00d4ff',
  Residential: '#4ecca3',
  Industrial: '#ff9f43',
  Special: '#ff4444',
}

interface Parcel {
  x: number
  z: number
  owner: string | null
  structures: any[]
  value: number
  forSale: boolean
  salePrice: number
}

export default function LandMarket() {
  const { connected } = useSnapshot(walletState)
  const [filter, setFilter] = useState<string | null>(null)
  const [tab, setTab] = useState<'market' | 'my'>('market')
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [myParcels, setMyParcels] = useState<Parcel[]>([])
  const [stats, setStats] = useState({ total: 0, claimed: 0, unclaimed: 0, forSale: 0 })
  const [buying, setBuying] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!walletState.showLandMarket) return null

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [marketRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/land/market`).then(r => r.json()),
        fetch(`${API_BASE}/api/land/parcels`).then(r => r.json()),
      ])
      setParcels(marketRes || [])
      setStats(statsRes || { total: 1024, claimed: 0, unclaimed: 1024, forSale: 0 })
    } catch (e) {
      console.error('Failed to fetch land data:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (walletState.showLandMarket) fetchData()
  }, [walletState.showLandMarket])

  const handleClaim = async (x: number, z: number) => {
    if (!connected) {
      alert('Connect your wallet first!')
      return
    }
    // Send /claim command via chat
    const bot = (window as any).bot
    if (bot) {
      bot.chat(`/claim`)
      alert(`Claiming parcel (${x}, ${z})... Use /claim in chat!`)
    }
    setTimeout(fetchData, 2000)
  }

  const handleBuyParcel = (parcel: Parcel) => {
    if (!connected) {
      alert('Connect your wallet first!')
      return
    }
    const bot = (window as any).bot
    if (bot) {
      bot.chat(`/buy`)
      alert(`Buying parcel (${parcel.x}, ${parcel.z}) for ${parcel.salePrice} coins...`)
    }
    setBuying(`${parcel.x},${parcel.z}`)
    setTimeout(() => {
      fetchData()
      setBuying(null)
    }, 2000)
  }

  const displayParcels = tab === 'market'
    ? (filter ? parcels.filter(p => true) : parcels)
    : myParcels

  return (
    <div style={styles.overlay} onClick={() => walletState.showLandMarket = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>🌍 Land Market — Arc Testnet</div>

        {/* Stats bar */}
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Total Plots</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#00d4ff' }}>{stats.total}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Claimed</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#4ecca3' }}>{stats.claimed}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Available</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff9f43' }}>{stats.unclaimed}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>For Sale</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4444' }}>{stats.forSale}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button
            style={{
              ...styles.tab,
              background: tab === 'market' ? '#4ecca3' : '#16213e',
              color: tab === 'market' ? 'white' : '#aaa',
            }}
            onClick={() => setTab('market')}
          >🏪 Market</button>
          <button
            style={{
              ...styles.tab,
              background: tab === 'my' ? '#4ecca3' : '#16213e',
              color: tab === 'my' ? 'white' : '#aaa',
            }}
            onClick={() => setTab('my')}
          >📦 My Parcels</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading...</div>
        ) : displayParcels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
            <div style={{ color: '#aaa', fontSize: 14 }}>
              {tab === 'market' ? 'No parcels for sale yet. Be the first to claim land!' : 'You don\'t own any parcels yet.'}
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
              Type <code style={{ color: '#4ecca3' }}>/claim</code> in chat to claim the plot you're standing on
            </div>
          </div>
        ) : (
          <div style={styles.grid}>
            {displayParcels.map(parcel => {
              const key = `${parcel.x},${parcel.z}`
              return (
                <div
                  key={key}
                  style={{
                    ...styles.parcel,
                    borderColor: parcel.forSale ? '#ff9f4340' : '#4ecca340',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = parcel.forSale ? '#ff9f43' : '#4ecca3'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = parcel.forSale ? '#ff9f4340' : '#4ecca340'
                  }}
                >
                  <div style={{ fontSize: 11, color: '#aaa' }}>Parcel</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0' }}>({parcel.x}, {parcel.z})</div>
                  {parcel.owner && (
                    <div style={{ fontSize: 11, color: '#4ecca3' }}>👤 {parcel.owner}</div>
                  )}
                  <div style={{ fontSize: 11, color: '#aaa' }}>Structures: {parcel.structures?.length || 0}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Value: {parcel.value} coins</div>
                  {parcel.forSale ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#ff9f43', marginTop: 4 }}>
                        {parcel.salePrice} coins
                      </div>
                      <button
                        style={styles.buyBtn}
                        onClick={() => handleBuyParcel(parcel)}
                        disabled={buying === key}
                      >
                        {buying === key ? 'Buying...' : '🛒 Buy Parcel'}
                      </button>
                    </>
                  ) : !parcel.owner ? (
                    <button
                      style={{ ...styles.buyBtn, background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
                      onClick={() => handleClaim(parcel.x, parcel.z)}
                    >
                      🏗️ Free — Claim
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginTop: 8 }}>
          Powered by Arc Testnet • Land plots as NFTs • USDC payments via Circle
        </div>
      </div>
    </div>
  )
}
