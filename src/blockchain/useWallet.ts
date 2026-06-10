import { useState, useEffect, useCallback } from 'react'
import { ARC_TESTNET, USDC_ADDRESS, USDC_DECIMALS, CONTRACTS, LAND_NFT_ABI, LAND_RENTAL_ABI, GAME_ECONOMY_ABI, USDC_ABI } from './config'

// Blockchain state singleton
const blockchainState = {
  address: null as string | null,
  chainId: null as number | null,
  provider: null as any,
  signer: null as any,
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(blockchainState.address)
  const [chainId, setChainId] = useState<number | null>(blockchainState.chainId)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<string>('0')

  const isConnected = !!address && chainId === ARC_TESTNET.id

  const connect = useCallback(async () => {
    if (!(window as any).ethereum) {
      setError('MetaMask not found. Please install MetaMask.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const ethereum = (window as any).ethereum

      // Request accounts
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      const addr = accounts[0]

      // Check/switch to Arc Testnet
      const currentChainId = await ethereum.request({ method: 'eth_chainId' })
      const chainIdNum = parseInt(currentChainId, 16)

      if (chainIdNum !== ARC_TESTNET.id) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${ARC_TESTNET.id.toString(16)}` }],
          })
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${ARC_TESTNET.id.toString(16)}`,
                chainName: ARC_TESTNET.name,
                nativeCurrency: ARC_TESTNET.nativeCurrency,
                rpcUrls: ARC_TESTNET.rpcUrls.default.http,
                blockExplorerUrls: [ARC_TESTNET.blockExplorers.default.url],
              }],
            })
          } else {
            throw switchError
          }
        }
      }

      blockchainState.address = addr
      blockchainState.chainId = ARC_TESTNET.id
      blockchainState.provider = ethereum

      setAddress(addr)
      setChainId(ARC_TESTNET.id)

      // Fetch USDC balance
      await fetchUsdcBalance(addr)

    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const fetchUsdcBalance = async (addr: string) => {
    try {
      const ethereum = (window as any).ethereum
      // balanceOf(address) selector: 0x70a08231
      const paddedAddr = addr.slice(2).padStart(64, '0')
      const data = `0x70a08231${paddedAddr}`

      const result = await ethereum.request({
        method: 'eth_call',
        params: [{ to: USDC_ADDRESS, data }, 'latest'],
      })

      const balance = BigInt(result)
      const formatted = (Number(balance) / Math.pow(10, USDC_DECIMALS)).toFixed(2)
      setUsdcBalance(formatted)
    } catch {
      setUsdcBalance('0')
    }
  }

  const disconnect = useCallback(() => {
    blockchainState.address = null
    blockchainState.chainId = null
    blockchainState.provider = null
    setAddress(null)
    setChainId(null)
    setUsdcBalance('0')
  }, [])

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        blockchainState.address = accounts[0]
        setAddress(accounts[0])
        fetchUsdcBalance(accounts[0])
      }
    }

    const handleChainChanged = (newChainId: string) => {
      const id = parseInt(newChainId, 16)
      blockchainState.chainId = id
      setChainId(id)
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    // Auto-connect if already connected
    ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts.length > 0) {
        blockchainState.address = accounts[0]
        setAddress(accounts[0])
        fetchUsdcBalance(accounts[0])
        ethereum.request({ method: 'eth_chainId' }).then((id: string) => {
          const chainIdNum = parseInt(id, 16)
          blockchainState.chainId = chainIdNum
          setChainId(chainIdNum)
        })
      }
    })

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [disconnect])

  return { address, chainId, isConnected, isConnecting, error, usdcBalance, connect, disconnect, fetchUsdcBalance: () => address && fetchUsdcBalance(address) }
}

// Helper to send contract transactions
export async function sendTransaction(to: string, data: string, value?: string) {
  const ethereum = (window as any).ethereum
  if (!ethereum) throw new Error('MetaMask not found')

  const txParams: any = { to, data }
  if (value) txParams.value = value

  const txHash = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ ...txParams, from: blockchainState.address }],
  })

  return txHash
}

// Helper to call contract read functions
export async function callContract(to: string, data: string) {
  const ethereum = (window as any).ethereum
  if (!ethereum) throw new Error('MetaMask not found')

  const result = await ethereum.request({
    method: 'eth_call',
    params: [{ to, data }, 'latest'],
  })

  return result
}

// Encode function call (simplified - for basic uint/string params)
export function encodeFunctionCall(sig: string, params: any[]): string {
  // This is a simplified encoder - for production use viem or ethers
  return '0x' // Placeholder - actual encoding handled by viem in production
}
