import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { walletState, connectWallet, disconnectWallet } from './walletState'
import { ARC_TESTNET } from './config'

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
    padding: 32,
    minWidth: 360,
    border: '1px solid #16213e',
    color: 'white',
    fontFamily: 'Minecraft, monospace',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    color: '#00d4ff',
    textAlign: 'center' as const,
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold' as const,
    fontFamily: 'Minecraft, monospace',
    transition: 'all 0.2s',
  },
  connectBtn: {
    background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
    color: 'white',
  },
  disconnectBtn: {
    background: 'linear-gradient(135deg, #ff4444, #cc0000)',
    color: 'white',
  },
  balance: {
    background: '#0f3460',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  address: {
    background: '#16213e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 12,
    wordBreak: 'break-all' as const,
    color: '#aaa',
  },
  chain: {
    fontSize: 11,
    color: '#4ecca3',
    textAlign: 'center' as const,
    marginTop: 8,
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 12,
    right: 16,
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 20,
    cursor: 'pointer',
  },
}

export default function WalletConnect() {
  const { connected, address, usdcBalance, showWalletModal } = useSnapshot(walletState)
  const [isConnecting, setIsConnecting] = useState(false)

  if (!showWalletModal) return null

  const handleConnect = async () => {
    setIsConnecting(true)
    await connectWallet()
    setIsConnecting(false)
  }

  return (
    <div style={styles.overlay} onClick={() => walletState.showWalletModal = false}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={() => walletState.showWalletModal = false}>×</button>

        <div style={styles.title}>
          💰 Arc Wallet
        </div>

        {connected ? (
          <>
            <div style={styles.balance}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>USDC Balance</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00d4ff' }}>
                ${usdcBalance}
              </div>
              <div style={{ fontSize: 11, color: '#4ecca3', marginTop: 4 }}>on Arc Testnet</div>
            </div>

            <div style={styles.address}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Connected Address</div>
              {address}
            </div>

            <div style={styles.chain}>
              ✓ Chain ID: {ARC_TESTNET.id} ({ARC_TESTNET.name})
            </div>

            <button
              style={{ ...styles.button, ...styles.disconnectBtn, marginTop: 16 }}
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16, color: '#aaa', fontSize: 13 }}>
              Connect your wallet to buy land, build businesses,<br />
              and earn USDC on Arc Testnet
            </div>

            <button
              style={{ ...styles.button, ...styles.connectBtn }}
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#555' }}>
              Network: Arc Testnet (Chain ID: {ARC_TESTNET.id})<br />
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener"
                style={{ color: '#00d4ff' }}
              >
                Get testnet USDC →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
