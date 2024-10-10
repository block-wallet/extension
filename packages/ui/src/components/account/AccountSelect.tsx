import { FunctionComponent, useState } from "react"
import AccountDisplay from "../account/AccountDisplay"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import AccountSearchBar from "./AccountSearchBar"
import {
    removeAccount,
    hideAccount,
    updateAccountFilters,
    unhideAccount,
} from "../../context/commActions"
import { AccountType } from "../../context/commTypes"
import { AccountMenuOptionType } from "./AccountDisplayMenu"
import { useHistory } from "react-router-dom"
import AccountsList from "./AccountsList"
import useAccountSearch from "../../util/hooks/account/useAccountSearch"
import { isActiveAccount, isHiddenAccount } from "../../util/account"
import type { LocationDescriptor } from "history"
import useConnectedAccounts from "../../util/hooks/account/useConnectedAccounts"
import { useBlankState } from "../../context/background/backgroundHooks"
import useAccountsFilter from "../../util/hooks/account/useAccountsFilter"
import AccountFilters from "./AccountFilters"
import { AccountFilter } from "../../util/filterAccounts"
import EmptyState from "../ui/EmptyState"
import OrderButton from "../button/OrderButton"

interface AccountSelectProps {
    accounts: AccountInfo[]
    selectedAccount: AccountInfo
    showSelectedCheckmark?: boolean
    onAccountChange: (account: AccountInfo) => void
    showMenu?: boolean
    customFilters?: AccountFilter[]
    showActionButtons?: boolean
    createAccountTo?: LocationDescriptor
}

type AccountsData = {
    otherAccounts: AccountInfo[]
    hiddenAccounts: AccountInfo[]
    currentAccount: AccountInfo | undefined
}
const AccountSelect: FunctionComponent<AccountSelectProps> = ({
    accounts,
    selectedAccount,
    showSelectedCheckmark = false,
    showMenu = true,
    customFilters = undefined,
    showActionButtons = true,
    onAccountChange,
    createAccountTo = { pathname: "/accounts/create" },
}) => {
    const { isAccountConnected } = useConnectedAccounts()
    const { filters } = useBlankState()!
    const [filterValue, setFilterValue] = useState(filters.account)
    const {
        search,
        accounts: searchedAccounts,
        onChangeSearch,
    } = useAccountSearch(accounts)

    //All the accounts after filtering
    const filteredAccounts = useAccountsFilter(
        search ? searchedAccounts : accounts,
        filterValue
    )

    const currentAccountAddress = useSelectedAccount().address

    const { currentAccount, otherAccounts, hiddenAccounts } =
        filteredAccounts.reduce(
            (acc: AccountsData, account) => {
                if (account.address === currentAccountAddress) {
                    return {
                        ...acc,
                        currentAccount: account,
                    }
                }
                if (isHiddenAccount(account)) {
                    return {
                        ...acc,
                        hiddenAccounts: [...acc.hiddenAccounts, account],
                    }
                }
                return {
                    ...acc,
                    otherAccounts: [...acc.otherAccounts, account],
                }
            },
            { currentAccount: undefined, otherAccounts: [], hiddenAccounts: [] }
        )

    const history = useHistory()

    const accountsNumber = accounts.filter((account) =>
        isActiveAccount(account)
    ).length

    const getAccountOptions = (account: AccountInfo) => {
        if (!showMenu) return undefined

        const options = []

        if (currentAccount?.address === account.address) {
            options.push({
                optionType: AccountMenuOptionType.SETTINGS,
                handler: () => {
                    history.push({
                        pathname: "/accounts/menu",
                        state: {
                            fromAccountList: true,
                        },
                    })
                },
            })
        }

        if (account.accountType === AccountType.HD_ACCOUNT) {
            if (isHiddenAccount(account)) {
                options.push({
                    optionType: AccountMenuOptionType.UNHIDE_ACCOUNT,
                    handler: unhideAccount,
                })
            } else {
                options.push({
                    optionType: AccountMenuOptionType.HIDE_ACCOUNT,
                    handler: hideAccount,
                    disabled: accountsNumber === 1,
                })
            }
        } else {
            options.push({
                optionType: AccountMenuOptionType.REMOVE_ACCOUNT,
                handler: removeAccount,
                disabled: accountsNumber === 1,
            })
        }

        return options
    }

    let searchedActiveAccounts = otherAccounts
    if (currentAccount) {
        searchedActiveAccounts = [currentAccount, ...searchedActiveAccounts]
    }

    let showEmptyState = false
    if (search) {
        showEmptyState =
            searchedActiveAccounts.length === 0 && hiddenAccounts.length === 0
    } else {
        showEmptyState =
            !currentAccount &&
            otherAccounts.length === 0 &&
            hiddenAccounts.length === 0
    }

    return (
        <div className="flex flex-col p-6 space-y-5 text-sm text-primary-grey-dark pb-3">
            <div className="flex flex-row justify-between space-x-2 w-full">
                <AccountSearchBar
                    onChange={onChangeSearch}
                    createAccountTo={createAccountTo}
                    setIsSearching={(isSearching: boolean) => {
                        if (!isSearching) {
                            onChangeSearch("")
                        }
                    }}
                />
                <AccountFilters
                    customFilters={customFilters}
                    filters={filterValue}
                    onChangeFilters={async (newFilters: string[]) => {
                        const prevValue = [...filterValue]
                        try {
                            //optimhistic update to avoid weird UI while awating for the background to persist the state
                            setFilterValue(newFilters)
                            await updateAccountFilters(newFilters)
                        } catch (e) {
                            //if failed, set the previous value
                            setFilterValue(prevValue)
                        }
                    }}
                    searchButtonClassName="!h-10 !w-3"
                />
                <OrderButton
                    onClick={() => {
                        history.push({
                            pathname: "/accounts/menu/order",
                        })
                    }}
                    title="Edit accounts order"
                />
            </div>
            {showEmptyState && (
                <EmptyState title="No results" className="p-6">
                    The account you are searching for does not exist. Try
                    adjusting your search term or filter.
                </EmptyState>
            )}
            {search === "" ? (
                <>
                    {currentAccount && (
                        <AccountsList
                            title="CURRENT ACCOUNT"
                            key={"current-account"}
                        >
                            <AccountDisplay
                                key={`current-account-${currentAccount.index}`}
                                onClickAccount={() => {
                                    if (
                                        selectedAccount.address !==
                                            currentAccount.address &&
                                        onAccountChange
                                    )
                                        onAccountChange(currentAccount)
                                }}
                                account={currentAccount}
                                showSelectedCheckmark={showSelectedCheckmark}
                                showConnected={isAccountConnected(
                                    currentAccount.address
                                )}
                                menu={getAccountOptions(currentAccount!)}
                                selected={
                                    selectedAccount.address ===
                                    currentAccount!.address
                                }
                            />
                        </AccountsList>
                    )}
                    {otherAccounts.length > 0 && (
                        <AccountsList title="OTHER ACCOUNTS">
                            {otherAccounts.map((account) => (
                                <AccountDisplay
                                    key={`other-${account.address}`}
                                    onClickAccount={onAccountChange}
                                    account={account}
                                    menu={getAccountOptions(account)}
                                    selected={
                                        selectedAccount.address ===
                                        account.address
                                    }
                                    showConnected={isAccountConnected(
                                        account.address
                                    )}
                                />
                            ))}
                        </AccountsList>
                    )}
                    {hiddenAccounts.length > 0 && (
                        <AccountsList title="HIDDEN ACCOUNTS">
                            {hiddenAccounts.map((account) => (
                                <AccountDisplay
                                    key={`hidden-${account.address}`}
                                    account={account}
                                    menu={getAccountOptions(account)}
                                />
                            ))}
                        </AccountsList>
                    )}
                </>
            ) : (
                <>
                    {searchedActiveAccounts.length > 0 && (
                        <AccountsList title="SEARCH RESULTS">
                            {searchedActiveAccounts.map((account) => (
                                <AccountDisplay
                                    key={`result-${account.address}`}
                                    onClickAccount={onAccountChange}
                                    account={account}
                                    menu={getAccountOptions(account)}
                                    selected={
                                        selectedAccount.address ===
                                        account!.address
                                    }
                                    showConnected={isAccountConnected(
                                        account!.address
                                    )}
                                />
                            ))}
                        </AccountsList>
                    )}
                    {hiddenAccounts.length > 0 && (
                        <AccountsList title="SEARCH RESULTS (HIDDEN ACCOUNTS)">
                            {hiddenAccounts.map((account) => (
                                <AccountDisplay
                                    key={`hidden-result-${account.address}`}
                                    account={account}
                                    menu={getAccountOptions(account)}
                                />
                            ))}
                        </AccountsList>
                    )}
                </>
            )}
        </div>
    )
}

export default AccountSelect
