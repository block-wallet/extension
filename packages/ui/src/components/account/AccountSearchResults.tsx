import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { isValidAddress, toChecksumAddress } from "ethereumjs-util"
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
import searchNotFoundIcon from "../../assets/images/icons/searchnotfound.svg"
import searchIcon from "../../assets/images/icons/search.svg"
import SendPageLoadingSkeleton from "../skeleton/SendPageLoadingSkeleton"

type AccountSearchResultsProps = {
    filter: string
    resultsToDisplay?: {
        wallet?: boolean
        addressBook?: boolean
        ens?: boolean
        ud?: boolean
    }
    onSelect: (account: any) => void
    showSearchSkeleton: boolean
    setShowSearchSkeleton: React.Dispatch<React.SetStateAction<boolean>>
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
    showSearchSkeleton,
    setShowSearchSkeleton,
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
            !isValidAddress(filter) &&
            filter !== ""
        )
    }

    const displaySearchMessage = (): boolean => {
        return (
            noWalletResults &&
            noAddressBookResults &&
            noEnsResults &&
            noUDResults &&
            !isValidAddress(filter) &&
            filter === ""
        )
    }

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
            if (ensEnabled && ensEnabled.current)
                newResults.ens = filter ? await searchEns(filter) : undefined

            // Unstoppable Domains
            newResults.ud = filter ? await searchUD(filter) : undefined

            setResults(newResults)
            disableSkeleton()
        }

        search()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])

    const disableSkeleton = async () => {
        // await new Promise((resolve) => setTimeout(resolve, 1000))
        setShowSearchSkeleton(false)
    }

    return (
        <>
            {!noWalletResults && !showSearchSkeleton && (
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

            {!noAddressBookResults && !showSearchSkeleton && (
                <div className="flex flex-col px-6">
                    <AccountsList title="ADDRESS BOOK CONTACTS">
                        {results.addressBook.map((account) => (
                            <AccountDisplay
                                key={account.address}
                                account={account}
                                selected={
                                    isValidAddress(filter) &&
                                    toChecksumAddress(filter) ===
                                        account.address
                                }
                                showAddress={true}
                                onClickAccount={() => onSelect(account)}
                            />
                        ))}
                    </AccountsList>
                </div>
            )}

            {!noEnsResults && results.ens && !showSearchSkeleton && (
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

            {!noUDResults && results.ud && !showSearchSkeleton && (
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

            {displayEmptyResultsMessage() && !showSearchSkeleton && (
                <div className="flex flex-col">
                    <div className="flex justify-center items-center mb-6">
                        <img
                            src={searchNotFoundIcon}
                            alt="search"
                            className="w-7 h-7 absolute z-10"
                        />
                        <div className="w-20 h-20 bg-primary-grey-default rounded-full relative z-0"></div>
                    </div>
                    <span className="font-bold text-base text-center mb-2 -mt-1">
                        No results found.
                    </span>
                    <div className="flex justify-center items-center w-full text-center">
                        <span className="text-sm text-primary-grey-dark w-72">
                            We cannot find anything you are searching for. Try
                            to adjust your search.
                        </span>
                    </div>
                </div>
            )}

            {displaySearchMessage() && !showSearchSkeleton && (
                <div className="flex flex-col">
                    <div className="flex justify-center items-center mb-6">
                        <img
                            src={searchIcon}
                            alt="search"
                            className="w-7 h-7 absolute z-10"
                        />
                        <div className="w-20 h-20 bg-primary-grey-default rounded-full relative z-0"></div>
                    </div>
                    <div className="flex justify-center items-center w-full text-center">
                        <span className="text-sm text-primary-grey-dark w-9/12">
                            Add recipient by searching public address, name, or
                            select contact
                        </span>
                    </div>
                </div>
            )}

            {showSearchSkeleton && <SendPageLoadingSkeleton />}
        </>
    )
}

export default AccountSearchResults
