import { useSnapshot } from 'valtio'
import { walletState } from '../blockchain/walletState'
import { miscUiState, isGameActive } from '../globalState'
import { useEffect, useState } from 'react'

const API_BASE = 'http://150.241.88.229:25567'

const styles = {
  container: {
    position: 'fixed' as const,
    top: 12,
    right: 12,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    zIndex: 50,
    pointerEvents: 'auto' as const,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: 'rgba(15, 52, 96, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(78, 204, 163, 0.3)',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    fontFamily: 'Minecraft, monospace',
    fontSize: 12,
    fontWeight: 'bold' as const,
    transition: 'all 0.2s',
    minWidth: 140,
  },
  badge: {
    background: '#4ecca3',
    color: '#0a0a0a',
    borderRadius: 10,
    padding: '2px 7px',
    fontSize: 10,
    fontWeight: 'bold' as const,
    marginLeft: 'auto',
  },
  balanceBar: {
    position: 'fixed' as const,
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 20px',
    background: 'rgba(15, 52, 96, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(78, 204, 163, 0.3)',
    borderRadius: 20,
    color: 'white',
    fontFamily: 'Minecraft, monospace',
    fontSize: 13,
    zIndex: 50,
    pointerEvents: 'auto' as const,
  },
  walletBadge: {
    position: 'fixed' as const,
    bottom: 70,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: walletState.connected ? 'rgba(78, 204, 163, 0.15)' : 'rgba(255, 68, 68, 0.15)',
    border: `1px solid ${walletState.connected ? 'rgba(78, 204, 163, 0.4)' : 'rgba(255, 68, 68, 0.4)'}`,
    borderRadius: 8,
    color: 'white',
    fontFamily: 'Minecraft, monospace',
    fontSize: 11,
    zIndex: 50,
    pointerEvents: 'auto' as const,
    cursor: 'pointer',
  },
}

interface ServerStats {
  players: { total: number }
  economy: { totalPlayers: number; totalBalance: number }
  land: { total: number; claimed: number; unclaimed: number; forSale: number }
}

export default function TycoonHUD() {
  const { gameLoaded } = useSnapshot(miscUiState)
  const wallet = useSnapshot(walletState)
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [playerBalance, setPlayerBalance] = useState<number | null>(null)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  // Fetch server stats periodically
  useEffect(() => {
    if (!gameLoaded) return

    const fetchStats = async () => {
      try {
        const [worldRes, economyRes, landRes] = await Promise.all([
          fetch(`${API_BASE}/api/world`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/economy`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/land/parcels`).then(r => r.json()).catch(() => null),
        ])
        setStats({
          players: worldRes?.players || { total: 0 },
          economy: economyRes || { totalPlayers: 0, totalBalance: 0 },
          land: landRes || { total: 0, claimed: 0, unclaimed: 0, forSale: 0 },
        })
      } catch { /* ignore */ }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [gameLoaded])

  // Fetch player balance when game loads
  useEffect(() => {
    if (!gameLoaded) return
    // Get bot username from global scope
    const botUsername = (window as any).bot?.username
    if (!botUsername) return

    const fetchBalance = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/player/${encodeURIComponent(botUsername)}`)
        if (res.ok) {
          const data = await res.json()
          setPlayerBalance(data.balance)
        }
      } catch { /* ignore */ }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 15000)
    return () => clearInterval(interval)
  }, [gameLoaded])

  if (!gameLoaded) return null

  const btnStyle = (id: string) => ({
    ...styles.btn,
    background: hoveredBtn === id
      ? 'rgba(78, 204, 163, 0.25)'
      : 'rgba(15, 52, 96, 0.85)',
    borderColor: hoveredBtn === id
      ? 'rgba(78, 204, 163, 0.7)'
      : 'rgba(78, 204, 163, 0.3)',
  })

  return (
    <>
      {/* Top center: balance + stats bar */}
      <div style={styles.balanceBar}>
        <span style={{ color: '#4ecca3' }}>💰</span>
        <span>
          {playerBalance !== null ? `${playerBalance} coins` : '...'}
        </span>
        {stats && (
          <>
            <span style={{ color: '#333', margin: '0 4px' }}>|</span>
            <span style={{ color: '#00d4ff' }}>🌍</span>
            <span>{stats.land.claimed}/{stats.land.total} plots</span>
            <span style={{ color: '#333', margin: '0 4px' }}>|</span>
            <span style={{ color: '#ff9f43' }}>👥</span>
            <span>{stats.economy.totalPlayers} online</span>
          </>
        )}
      </div>

      {/* Right side: action buttons */}
      <div style={styles.container}>
        <button
          style={btnStyle('wallet')}
          onMouseEnter={() => setHoveredBtn('wallet')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => walletState.showWalletModal = true}
        >
          💰 Wallet
          {wallet.connected && <span style={styles.badge}>●</span>}
        </button>

        <button
          style={btnStyle('land')}
          onMouseEnter={() => setHoveredBtn('land')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => walletState.showLandMarket = true}
        >
          🌍 Land Market
          {stats && stats.land.forSale > 0 && (
            <span style={styles.badge}>{stats.land.forSale}</span>
          )}
        </button>

        <button
          style={btnStyle('business')}
          onMouseEnter={() => setHoveredBtn('business')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => walletState.showBusinessPanel = true}
        >
          🏗️ Businesses
        </button>

        <button
          style={btnStyle('economy')}
          onMouseEnter={() => setHoveredBtn('economy')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => walletState.showEconomyDashboard = true}
        >
          📊 Economy
        </button>
      </div>

      {/* Bottom right: wallet connection status */}
      <div
        style={{
          ...styles.walletBadge,
          background: wallet.connected ? 'rgba(78, 204, 163, 0.15)' : 'rgba(255, 68, 68, 0.15)',
          borderColor: wallet.connected ? 'rgba(78, 204, 163, 0.4)' : 'rgba(255, 68, 68, 0.4)',
        }}
        onClick={() => walletState.showWalletModal = true}
      >
        {wallet.connected ? (
          <>
            <span style={{ color: '#4ecca3' }}>●</span>
            <span>{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
            <span style={{ color: '#00d4ff', marginLeft: 4 }}>${wallet.usdcBalance}</span>
          </>
        ) : (
          <>
            <span style={{ color: '#ff4444' }}>●</span>
            <span>Connect Wallet</span>
          </>
        )}
      </div>
    </>
  )
}
