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
    width: 500,
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
  progressBar: {
    width: '100%',
    height: 8,
    background: '#0f3460',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease',
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

export default function EconomyDashboard() {
  const { connected, usdcBalance } = useSnapshot(walletState)

  if (!walletState.showEconomyDashboard) return null

  const stats = {
    landOwned: 5,
    totalLand: 1024,
    businesses: 3,
    revenuePerHour: 4.9,
    totalEarned: 118.1,
    rentalCosts: 15.0,
    netProfit: 103.1,
    developmentLevel: 2.4,
  }

  return (
    <div style={styles.overlay} onClick={() => walletState.showEconomyDashboard = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>📊 Economy Dashboard</div>

        <div style={styles.grid}>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Land Owned</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#4ecca3' }}>{stats.landOwned}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{((stats.landOwned / stats.totalLand) * 100).toFixed(1)}% of world</div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(stats.landOwned / stats.totalLand) * 100}%`, background: 'linear-gradient(90deg, #4ecca3, #2d8f72)' }} />
            </div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Businesses</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff9f43' }}>{stats.businesses}</div>
            <div style={{ fontSize: 10, color: '#555' }}>Avg Level: {stats.developmentLevel}</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Revenue/hr</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>${stats.revenuePerHour}</div>
            <div style={{ fontSize: 10, color: '#4ecca3' }}>↑ Active income</div>
          </div>
          <div style={styles.stat}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Wallet Balance</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>${connected ? usdcBalance : '—'}</div>
            <div style={{ fontSize: 10, color: '#555' }}>USDC on Arc</div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#ff9f43' }}>💰 Financial Summary</div>
          <div style={styles.row}>
            <span style={{ color: '#aaa' }}>Total Revenue Earned</span>
            <span style={{ color: '#4ecca3', fontWeight: 'bold' }}>${stats.totalEarned}</span>
          </div>
          <div style={styles.row}>
            <span style={{ color: '#aaa' }}>Rental Costs</span>
            <span style={{ color: '#ff4444', fontWeight: 'bold' }}>-${stats.rentalCosts}</span>
          </div>
          <div style={{ ...styles.row, borderBottom: 'none' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>Net Profit</span>
            <span style={{ color: '#4ecca3', fontWeight: 'bold', fontSize: 18 }}>${stats.netProfit}</span>
          </div>
        </div>

        <div style={styles.section}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#00d4ff' }}>🏆 Portfolio</div>
          <div style={styles.row}>
            <span style={{ color: '#aaa' }}>Land Value</span>
            <span style={{ color: 'white' }}>~$250 USDC</span>
          </div>
          <div style={styles.row}>
            <span style={{ color: '#aaa' }}>Business Value</span>
            <span style={{ color: 'white' }}>~$180 USDC</span>
          </div>
          <div style={{ ...styles.row, borderBottom: 'none' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>Total Portfolio</span>
            <span style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: 18 }}>~$430 USDC</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
          All values in USDC • Powered by Arc Testnet
        </div>
      </div>
    </div>
  )
}
