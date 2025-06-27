import { DeviceAccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { useState, useMemo } from "react"
import { getAccountBalance } from "../../context/commActions"
import { useTokensList } from "../../context/hooks/useTokensList"
import { Classes } from "../../styles"
import { formatHash } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { getAccountColor } from "../../util/getAccountColor"
import { ViewOnExplorerButton } from "../button/ViewOnExplorerButtons"
import AccountIcon from "../icons/AccountIcon"
import EyeRevealIcon from "../icons/EyeRevealIcon"
import Spinner from "../spinner/Spinner"
import Checkbox from "../input/Checkbox"

interface HardwareWalletAccountProps {
    account: DeviceAccountInfo
    accountsBalances: { [address: string]: BigNumber }
    selected: boolean
    disabled: boolean
    onChange: () => void
    onBalanceFetched: (address: string, balance: BigNumber) => void
}

export const HardwareWalletAccount = ({
    account,
    selected,
    disabled,
    onChange,
    accountsBalances,
    onBalanceFetched,
}: HardwareWalletAccountProps) => {
    const { nativeToken } = useTokensList()
    const [isLoading, setIsLoading] = useState(false)
    const [balance, setBalance] = useState<string>(
        account.address in accountsBalances
            ? formatRounded(
                formatUnits(
                    accountsBalances[account.address] || "0",
                    nativeToken.token.decimals
                ),
                5
            ) + ` ${nativeToken.token.symbol}`
            : "*******"
    )

    const formatAddress = (address: string): string => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatBalance = (balance: BigNumber | null): string => {
        if (!balance) return '*******'
        return formatUnits(balance, 18)
    }

    const formattedBalance = useMemo(() => {
        const balance = accountsBalances[account.address]
        return formatBalance(balance || null)
    }, [account.address, accountsBalances])

    const fetchBalance = async () => {
        try {
            setIsLoading(true)
            const balanceFetched = await getAccountBalance(account.address)

            // Store the balance in the parent component
            onBalanceFetched(account.address, balanceFetched)

            // Format the balance for display
            const formattedValue = formatRounded(
                formatUnits(
                    balanceFetched || "0",
                    nativeToken.token.decimals
                ),
                5
            ) + ` ${nativeToken.token.symbol}`

            // Update the local state
            setBalance(formattedValue)

            // Add a quick flash effect to show the balance was updated
            const balanceElement = document.getElementById(`balance-${account.address}`)
            if (balanceElement) {
                balanceElement.classList.add('text-green-600', 'dark:text-green-400')
                setTimeout(() => {
                    balanceElement.classList.remove('text-green-600', 'dark:text-green-400')
                }, 1000)
            }
        } catch (error) {
            console.error("Error fetching balance:", error)
            setBalance("<Error fetching>")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className={classnames(
                "flex items-center justify-between py-4 px-6 transition-all duration-200",
                "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
                "border-b border-gray-200 dark:border-gray-600",
                {
                    "cursor-pointer": !disabled,
                    "cursor-not-allowed opacity-60": disabled,
                    "ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-blue-900/20": selected,
                }
            )}
            onClick={() => !disabled && onChange()}
        >
            <div className="flex items-center space-x-4">
                <Checkbox
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onChange()}
                    label={<span className="sr-only">{`Select ${account.name}`}</span>}
                />
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {account.name}
                        </span>
                        {disabled && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                                Imported
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {formatAddress(account.address)}
                    </span>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <div className="text-right">
                    <span
                        id={`balance-${account.address}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors duration-300"
                    >
                        Balance: <span className="font-mono">{balance}</span>
                    </span>
                </div>
                <div className="flex space-x-2">
                    <button
                        type="button"
                        className={classnames(
                            "inline-flex items-center rounded-full p-2 transition-colors duration-200",
                            "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
                            "hover:bg-gray-100 dark:hover:bg-gray-600",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchBalance();
                        }}
                        title="Fetch Balance"
                        aria-label="Fetch account balance"
                    >
                        {isLoading ? (
                            <Spinner color="currentColor" size="16" />
                        ) : (
                            <EyeRevealIcon />
                        )}
                    </button>
                    <div className="opacity-70 hover:opacity-100 transition-opacity">
                        <ViewOnExplorerButton
                            mode="icon"
                            hash={account.address}
                            type="address"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
