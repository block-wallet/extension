import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useBlankState } from "../background/backgroundHooks"
import { useEffect, useState } from "react"
import { subscribeSelectedAccountInfo } from "../commActions"

export const useSelectedAccount = (): AccountInfo => {
    const { accounts, selectedAddress } = useBlankState()!
    const [slice, setSlice] = useState<AccountInfo | null>(null)

    useEffect(() => {
        let mounted = true
        subscribeSelectedAccountInfo((acc) => {
            if (mounted) setSlice(acc)
        })
        return () => {
            mounted = false
        }
    }, [])

    if (slice) return slice
    const normalizedAddress = selectedAddress.toLowerCase()
    return accounts[normalizedAddress]
}
