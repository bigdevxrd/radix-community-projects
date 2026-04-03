import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { RadixDappToolkit, DataRequestBuilder } from '@radixdlt/radix-dapp-toolkit'
import { CONFIG } from '../config'

interface RadixContextValue {
  account: string | null
  connected: boolean
  rdt: ReturnType<typeof RadixDappToolkit> | null
  sendTransaction: (manifest: string) => Promise<{ ok: boolean; txId?: string; error?: string }>
}

const RadixContext = createContext<RadixContextValue>({
  account: null,
  connected: false,
  rdt: null,
  sendTransaction: async () => ({ ok: false, error: 'Not initialized' }),
})

export function RadixProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const rdtRef = useRef<ReturnType<typeof RadixDappToolkit> | null>(null)

  useEffect(() => {
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: CONFIG.dAppDefinitionAddress,
      networkId: CONFIG.networkId,
      applicationName: 'Radix Guild',
      applicationVersion: '1.0.0',
    })
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().exactly(1))
    rdt.walletApi.walletData$.subscribe((data) => {
      if (data.accounts?.length > 0) {
        setAccount(data.accounts[0].address)
      } else {
        setAccount(null)
      }
    })
    rdtRef.current = rdt
    return () => rdt.destroy()
  }, [])

  async function sendTransaction(manifest: string) {
    if (!rdtRef.current) return { ok: false, error: 'Not connected' }
    try {
      const result = await rdtRef.current.walletApi.sendTransaction({ transactionManifest: manifest })
      if (result.isOk()) {
        return { ok: true, txId: result.value.transactionIntentHash }
      }
      return { ok: false, error: 'Transaction rejected' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  return (
    <RadixContext.Provider value={{ account, connected: !!account, rdt: rdtRef.current, sendTransaction }}>
      {children}
    </RadixContext.Provider>
  )
}

export function useRadix() {
  return useContext(RadixContext)
}
