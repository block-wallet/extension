import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { utils } from "ethers"
import { useRef, useEffect, useReducer } from "react"
import { useAddressBookAccounts } from "../../context/hooks/useAddressBookAccounts"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { filterAccounts } from "../../util/filterAccounts"
import { mergeReducer } from "../../util/reducerUtils"
import { searchEns } from "../../util/searchEns"
import { searchUD } from "../../util/searchUD"
import AccountDisplay from "./AccountDisplay"
import AccountsList from "./AccountsList"

type AccountSearchResultsProps = {
    filter: string
    resultsToDisplay?: {
        wallet?: boolean
        addressBook?: boolean
        ens?: boolean
        ud?: boolean
    }
    onSelect: (account: any) => void
    setIsInContacts?: (isInContacts: boolean) => void
}

export type AccountResult = {
    name: string
    address: string
}

type AccountsResultsType = {
    wallet: AccountInfo[]
    addressBook: AccountInfo[]
    ens?: AccountResult
    ud?: AccountResult
}

const AccountSearchResults = ({
    filter,
    onSelect,
    resultsToDisplay = { wallet: true, addressBook: true, ens: true, ud: true },
    setIsInContacts,
}: AccountSearchResultsProps) => {
    // Hooks
    const { ens } = useSelectedNetwork()

    // Default values
    const defaultAccounts = useRef<AccountInfo[]>(
        useSortedAccounts({
            filterCurrentAccount: true,
        })
    )
    const addressBookAccounts = useRef<AccountInfo[]>(useAddressBookAccounts())
    const ensEnabled = useRef<boolean>(ens)

    // State
    const [results, setResults] = useReducer(
        mergeReducer<AccountsResultsType, Partial<AccountsResultsType>>(),
        {
            wallet: defaultAccounts.current,
            addressBook: addressBookAccounts.current,
        }
    )

    const noWalletResults =
        !resultsToDisplay.wallet || results.wallet.length === 0
    const noAddressBookResults =
        !resultsToDisplay.addressBook || results.addressBook.length === 0
    const noEnsResults = !resultsToDisplay.ens || !results.ens
    const noUDResults = !resultsToDisplay.ud || !results.ud
    const displayEmptyResultsMessage = (): boolean => {
        return (
            noWalletResults &&
            noAddressBookResults &&
            noEnsResults &&
            noUDResults &&
            !utils.isAddress(filter) &&
            filter !== ""
        )
    }

    useEffect(() => {
        setIsInContacts && setIsInContacts(!noAddressBookResults)
    }, [noAddressBookResults])

    useEffect(() => {
        const search = async () => {
            // Filter Wallet Accounts
            const newResults = {
                ...results,
                wallet: filterAccounts(defaultAccounts.current, {
                    term: filter.toLowerCase(),
                }),
            }

            // If any, filter address book accounts
            if (addressBookAccounts.current.length > 0) {
                newResults.addressBook = filterAccounts(
                    addressBookAccounts.current,
                    {
                        term: filter.toLowerCase(),
                    }
                )
            }

            // If Ens enabled, search for it
            if (ensEnabled && ensEnabled.current) {
                newResults.ens = filter ? await searchEns(filter) : undefined
            }

            // Unstoppable Domains
            newResults.ud = filter ? await searchUD(filter) : undefined

            setResults(newResults)
        }

        search()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])

    return (
        <>
            {!noWalletResults && (
                <div className="flex flex-col px-6">
                    <AccountsList title="OTHER ACCOUNTS">
                        {results.wallet.map((account) => (
                            <AccountDisplay
                                key={account.address}
                                account={account}
                                selected={filter === account.address}
                                showAddress={true}
                                onClickAccount={() => onSelect(account)}
                            />
                        ))}
                    </AccountsList>
                </div>
            )}

            {!noAddressBookResults && (
                <div className="flex flex-col px-6">
                    <AccountsList title="ADDRESS BOOK CONTACTS">
                        {results.addressBook.map((account) => (
                            <AccountDisplay
                                key={account.address}
                                account={account}
                                selected={filter === account.address}
                                showAddress={true}
                                onClickAccount={() => onSelect(account)}
                            />
                        ))}
                    </AccountsList>
                </div>
            )}

            {!noEnsResults && results.ens && (
                <div className="flex flex-col px-6  ">
                    <AccountsList title="ENS RESULT">
                        <AccountDisplay
                            key={results.ens.address}
                            account={
                                {
                                    name: results.ens.name,
                                    address: results.ens.address,
                                } as AccountInfo
                            }
                            selected={filter === results.ens.address}
                            showAddress={true}
                            onClickAccount={() => onSelect(results.ens)}
                        />
                    </AccountsList>
                </div>
            )}

            {!noUDResults && results.ud && (
                <div className="flex flex-col px-6  ">
                    <AccountsList title="UD RESULT">
                        <AccountDisplay
                            key={results.ud.address}
                            account={
                                {
                                    name: results.ud.name,
                                    address: results.ud.address,
                                } as AccountInfo
                            }
                            selected={filter === results.ud.address}
                            showAddress={true}
                            onClickAccount={() => onSelect(results.ud)}
                        />
                    </AccountsList>
                </div>
            )}

            {displayEmptyResultsMessage() && (
                <div className="text-base font-bold text-black w-full text-center mt-4">
                    <span>No results found.</span>
                </div>
            )}
        </>
    )
}

export default AccountSearchResults
