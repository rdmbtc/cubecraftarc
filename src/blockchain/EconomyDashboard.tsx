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
    marginBottom: 20,
    color: '#00d4ff',
    textAlign: 'center' as const,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    background: '#16213e',
    borderRadius: 8,
    padding: 16,
    textAlign: 'center' as const,
  },
  section: {
    background: '#0f3460',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #16213e',
  },
}

interface LeaderboardEntry {
  name: string
  balance: number
  totalEarned: number
  totalSpent: number
  income: number
}

interface EconomyStats {
  totalPlayers: number
  totalBalance: number
  totalEarned: number
  totalSpent: number
}

interface LandStats {
  total: number
  claimed: number
  unclaimed: number
  forSale: number
}

export default function EconomyDashboard() {
  const { connected, usdcBalance } = useSnapshot(walletState)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null)
  const [landStats, setLandStats] = useState<LandStats | null>(null)
  const [playerData, setPlayerData] = useState<LeaderboardEntry | null>(null)

  if (!walletState.showEconomyDashboard) return null

  useEffect(() => {
    if (!walletState.showEconomyDashboard) return

    const fetchData = async () => {
      try {
        const [lbRes, ecoRes, landRes] = await Promise.all([
          fetch(`${API_BASE}/api/leaderboard?limit=10`).then(r => r.json()),
          fetch(`${API_BASE}/api/economy`).then(r => r.json()),
          fetch(`${API_BASE}/api/land/parcels`).then(r => r.json()),
        ])
        setLeaderboard(lbRes || [])
        setEconomyStats(ecoRes || null)
        setLandStats(landRes || null)

        const botUsername = (window as any).bot?.username
        if (botUsername) {
          const playerRes = await fetch(`${API_BASE}/api/player/${encodeURIComponent(botUsername)}`).then(r => r.json()).catch(() => null)
          if (playerRes) setPlayerData(playerRes)
        }
      } catch (e) {
        console.error('Failed to fetch economy data:', e)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [walletState.showEconomyDashboard])

  return (
    <div style={styles.overlay} onClick={() => walletState.showEconomyDashboard = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>📊 Economy Dashboard</div>

        {/* Player stats */}
        <div style={styles.grid}>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>My Balance</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#4ecca3' }}>
              {playerData ? playerData.balance : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>coins</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>My Income</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff9f43' }}>
              {playerData ? `+${playerData.income}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>per tick</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Total Earned</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>
              {playerData ? playerData.totalEarned : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#4ecca3' }}>coins all-time</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>USDC Wallet</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>
              ${connected ? usdcBalance : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>on Arc Testnet</div>
          </div>
        </div>

        {/* World stats */}
        {economyStats && landStats && (
          <div style={styles.section}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#00d4ff' }}>
              🌍 World Economy
            </div>
            <div style={styles.row}>
              <span style={{ color: '#aaa' }}>Total Players</span>
              <span style={{ color: '#4ecca3', fontWeight: 'bold' }}>{economyStats.totalPlayers}</span>
            </div>
            <div style={styles.row}>
              <span style={{ color: '#aaa' }}>Total Economy</span>
              <span style={{ color: '#ff9f43', fontWeight: 'bold' }}>{economyStats.totalBalance} coins</span>
            </div>
            <div style={styles.row}>
              <span style={{ color: '#aaa' }}>Land Claimed</span>
              <span style={{ color: 'white' }}>{landStats.claimed}/{landStats.total}</span>
            </div>
            <div style={{ ...styles.row, borderBottom: 'none' }}>
              <span style={{ color: '#aaa' }}>Parcels For Sale</span>
              <span style={{ color: '#ff4444', fontWeight: 'bold' }}>{landStats.forSale}</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div style={styles.section}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#ff9f43' }}>
            🏆 Leaderboard
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: 16 }}>
              No players yet. Be the first to join!
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <div key={entry.name} style={styles.row}>
                <span>
                  <span style={{
                    color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aaa',
                    fontWeight: 'bold',
                    marginRight: 8,
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span style={{ color: 'white' }}>{entry.name}</span>
                </span>
                <span style={{ color: '#4ecca3', fontWeight: 'bold' }}>{entry.balance} coins</span>
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
          Economy auto-updates • Revenue collected every minute • Powered by Arc Testnet
        </div>
      </div>
    </div>
  )
}
