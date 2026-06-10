import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { walletState } from './walletState'

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
  template: {
    background: '#16213e',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
}

const BUSINESS_ICONS: Record<string, string> = {
  shop: '🏪',
  farm: '🌾',
  mine: '⛏️',
  factory: '🏭',
  marketplace: '🛒',
  tower: '🗼',
}

interface BusinessTemplate {
  type: string
  name: string
  description: string
  buildCost: number
  revenuePerTick: number
}

interface PlayerBusiness {
  type: string
  name: string
  level: number
  revenuePerTick: number
  position: { x: number; y: number; z: number }
  parcelX: number
  parcelZ: number
}

export default function BusinessPanel() {
  const [templates, setTemplates] = useState<BusinessTemplate[]>([])
  const [myBusinesses, setMyBusinesses] = useState<PlayerBusiness[]>([])
  const [view, setView] = useState<'my' | 'build'>('my')
  const [building, setBuilding] = useState<string | null>(null)
  const [playerBalance, setPlayerBalance] = useState<number>(0)

  if (!walletState.showBusinessPanel) return null

  useEffect(() => {
    if (!walletState.showBusinessPanel) return

    const fetchData = async () => {
      try {
        const [bizRes] = await Promise.all([
          fetch(`${API_BASE}/api/businesses`).then(r => r.json()),
        ])
        setTemplates(bizRes || [])

        // Fetch player's businesses
        const botUsername = (window as any).bot?.username
        if (botUsername) {
          const playerRes = await fetch(`${API_BASE}/api/player/${encodeURIComponent(botUsername)}`).then(r => r.json()).catch(() => null)
          if (playerRes) setPlayerBalance(playerRes.balance || 0)

          const parcelsRes = await fetch(`${API_BASE}/api/land/player/${encodeURIComponent(botUsername)}`).then(r => r.json()).catch(() => [])
          const businesses: PlayerBusiness[] = []
          for (const parcel of (parcelsRes || [])) {
            for (const s of parcel.structures || []) {
              businesses.push({ ...s, parcelX: parcel.x, parcelZ: parcel.z })
            }
          }
          setMyBusinesses(businesses)
        }
      } catch (e) {
        console.error('Failed to fetch business data:', e)
      }
    }

    fetchData()
  }, [walletState.showBusinessPanel])

  const handleBuild = (template: BusinessTemplate) => {
    if (playerBalance < template.buildCost) {
      alert(`Not enough coins! Need ${template.buildCost}, have ${playerBalance}`)
      return
    }

    const bot = (window as any).bot
    if (bot) {
      bot.chat(`/build ${template.type}`)
      setBuilding(template.type)
      alert(`Building ${template.name}... Check chat for result.`)
      setTimeout(() => setBuilding(null), 2000)
    }
  }

  const handleClaimRevenue = () => {
    const bot = (window as any).bot
    if (bot) {
      bot.chat('/balance')
      alert('Revenue is auto-collected every minute! Check /balance in chat.')
    }
  }

  const handleUpgrade = (index: number) => {
    const bot = (window as any).bot
    if (bot) {
      bot.chat(`/upgrade ${index + 1}`)
      alert('Upgrading... Check chat for result.')
    }
  }

  const totalRevenue = myBusinesses.reduce((sum, b) => sum + b.revenuePerTick, 0)

  return (
    <div style={styles.overlay} onClick={() => walletState.showBusinessPanel = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>🏗️ Businesses</div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>My Businesses</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9f43' }}>{myBusinesses.length}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Revenue/tick</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4ecca3' }}>{totalRevenue.toFixed(1)}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Balance</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00d4ff' }}>{playerBalance}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 'bold' as const,
              fontFamily: 'Minecraft, monospace',
              background: view === 'my' ? '#ff9f43' : '#16213e',
              color: view === 'my' ? 'white' : '#aaa',
              marginRight: 4,
            }}
            onClick={() => setView('my')}
          >📦 My Businesses</button>
          <button
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 'bold' as const,
              fontFamily: 'Minecraft, monospace',
              background: view === 'build' ? '#00d4ff' : '#16213e',
              color: view === 'build' ? 'white' : '#aaa',
            }}
            onClick={() => setView('build')}
          >🏗️ Build New</button>
        </div>

        {view === 'my' ? (
          myBusinesses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
              <div style={{ color: '#aaa', fontSize: 14 }}>No businesses yet!</div>
              <div style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
                1. Claim a land parcel with <code style={{ color: '#4ecca3' }}>/claim</code><br />
                2. Build a business with <code style={{ color: '#4ecca3' }}>/build &lt;type&gt;</code><br />
                3. Earn coins automatically every minute!
              </div>
              <button style={{ ...styles.buildBtn, marginTop: 16 }} onClick={() => setView('build')}>
                🏗️ Browse Available Businesses
              </button>
            </div>
          ) : (
            <>
              {myBusinesses.map((biz, i) => (
                <div key={i} style={styles.business}>
                  <div>
                    <div style={{ fontSize: 16 }}>{BUSINESS_ICONS[biz.type] || '🏢'} {biz.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                      Level {biz.level} • Parcel ({biz.parcelX}, {biz.parcelZ})
                    </div>
                    <div style={{ fontSize: 12, color: '#4ecca3', marginTop: 2 }}>
                      +{biz.revenuePerTick.toFixed(1)}/tick
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={styles.upgradeBtn}
                      onClick={() => handleUpgrade(i)}
                    >⬆️ Upgrade</button>
                  </div>
                </div>
              ))}
              <button style={styles.claimBtn} onClick={handleClaimRevenue}>
                💰 Check Revenue (auto-collected)
              </button>
            </>
          )
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12, color: '#aaa', fontSize: 12 }}>
              Select a business to build on your current parcel. You need to own a land parcel first.
            </div>
            {templates.map(template => (
              <div
                key={template.type}
                style={{
                  ...styles.template,
                  borderColor: playerBalance >= template.buildCost ? '#4ecca340' : '#ff444440',
                  opacity: playerBalance >= template.buildCost ? 1 : 0.6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = playerBalance >= template.buildCost ? '#4ecca3' : '#ff4444'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = playerBalance >= template.buildCost ? '#4ecca340' : '#ff444440'
                }}
                onClick={() => handleBuild(template)}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 'bold' }}>
                    {BUSINESS_ICONS[template.type] || '🏢'} {template.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    {template.description}
                  </div>
                  <div style={{ fontSize: 12, color: '#4ecca3', marginTop: 4 }}>
                    +{template.revenuePerTick}/tick
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ff9f43' }}>
                    {template.buildCost}
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>coins</div>
                  {building === template.type && (
                    <div style={{ fontSize: 10, color: '#4ecca3', marginTop: 4 }}>Building...</div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#555' }}>
          Businesses generate coin revenue every tick • Upgrade to increase earnings
        </div>
      </div>
    </div>
  )
}
