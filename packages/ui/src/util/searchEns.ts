import { utils } from 'ethers'
import { resolveEnsName, lookupAddressEns } from '../context/commActions'

export type EnsResult = {
    name: string
    address: any
}

export const searchEns = async (
    search: string,
    setEnsSearch: React.Dispatch<React.SetStateAction<string>>,
    setEnsResult: React.Dispatch<React.SetStateAction<EnsResult | undefined>>
) => {
    if (search === '') return setEnsResult(undefined)

    setEnsSearch(search)
    const isAddress = utils.isAddress(`${search}`)

    // Search from address
    if (isAddress) {
        const result = await lookupAddressEns(search)
        if (result) {
            return setEnsResult({ name: result, address: search })
        }
        else return setEnsResult(undefined)
    }
    // Search from ENS
    else {
        let suffixValue
        search.includes('.') ? suffixValue = search : suffixValue = search + '.eth'

        // Check result
        const result = await resolveEnsName(suffixValue)
        if (result) return setEnsResult({ name: suffixValue, address: result })
        else setEnsResult(undefined)
    }
}
