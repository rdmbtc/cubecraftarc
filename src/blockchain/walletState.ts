import { proxy } from 'valtio'

export const walletState = proxy({
  connected: false,
  address: null as string | null,
  usdcBalance: '0.00',
  showWalletModal: false,
  showLandMarket: false,
  showBusinessPanel: false,
  showEconomyDashboard: false,
})

// Arc Testnet USDC address
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
const ARC_CHAIN_ID = 5042002
const ARC_CHAIN_ID_HEX = '0x4CE2E2'
const ARC_RPC = 'https://rpc.testnet.arc.network'

export const connectWallet = async () => {
  const ethereum = (window as any).ethereum
  if (typeof ethereum === 'undefined') {
    alert('Please install MetaMask or another Web3 wallet to connect!')
    return
  }

  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[]

    if (accounts.length > 0) {
      walletState.connected = true
      walletState.address = accounts[0]

      // Try to switch to Arc Testnet
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID_HEX }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ARC_CHAIN_ID_HEX,
              chainName: 'Arc Testnet',
              nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
              rpcUrls: [ARC_RPC],
              blockExplorerUrls: ['https://testnet.arcscan.app'],
            }],
          })
        }
      }

      // Fetch USDC balance using eth_call
      await fetchUsdcBalance(accounts[0])
    }
  } catch (err) {
    console.error('Failed to connect wallet:', err)
  }
}

export const disconnectWallet = () => {
  walletState.connected = false
  walletState.address = null
  walletState.usdcBalance = '0.00'
}

export const fetchUsdcBalance = async (address: string) => {
  try {
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    // balanceOf(address) = 0x70a08231
    const paddedAddr = address.toLowerCase().replace('0x', '').padStart(64, '0')
    const data = '0x70a08231' + paddedAddr

    const result = await ethereum.request({
      method: 'eth_call',
      params: [{ to: USDC_ADDRESS, data }, 'latest'],
    })

    // USDC has 6 decimals
    const balance = BigInt(result)
    walletState.usdcBalance = (Number(balance) / 1_000_000).toFixed(2)
  } catch (err) {
    console.error('Failed to fetch USDC balance:', err)
    walletState.usdcBalance = '0.00'
  }
}

// Listen for account changes
if (typeof window !== 'undefined' && (window as any).ethereum) {
  const ethereum = (window as any).ethereum
  ethereum.on?.('accountsChanged', (accounts: string[]) => {
    if (accounts.length > 0) {
      walletState.address = accounts[0]
      fetchUsdcBalance(accounts[0])
    } else {
      disconnectWallet()
    }
  })

  ethereum.on?.('chainChanged', () => {
    if (walletState.address) {
      fetchUsdcBalance(walletState.address)
    }
  })
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on?: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}
