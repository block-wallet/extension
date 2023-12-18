import { DeviceAccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "ethers/lib/utils"
import { useState } from "react"
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

export const HardwareWalletAccount = ({
    account,
    accountsBalances,
    selected = false,
    disabled = false,
    onChange,
    onBalanceFetched,
}: {
    account: DeviceAccountInfo
    accountsBalances: { [address in string]: BigNumber }
    selected: boolean
    disabled: boolean
    onChange: () => void
    onBalanceFetched: (address: string, balance: BigNumber) => void
}) => {
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

    const fetchBalance = async () => {
        try {
            setIsLoading(true)
            const balanceFetched = await getAccountBalance(account.address)
            onBalanceFetched(account.address, balanceFetched)
            setBalance(
                formatRounded(
                    formatUnits(
                        balanceFetched || "0",
                        nativeToken.token.decimals
                    ),
                    5
                ) + ` ${nativeToken.token.symbol}`
            )
        } catch (error) {
            setBalance("<Error fetching>")
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <label
            className={classnames(
                "flex flex-row items-center space-x-4 rounded-md pl-2 py-2",
                disabled
                    ? "bg-gray-50"
                    : "cursor-pointer hover:bg-primary-grey-default"
            )}
            key={account.index}
            htmlFor={`account-${account.index}`}
        >
            <input
                type="checkbox"
                className={classnames(
                    Classes.checkboxAlt,
                    disabled && "text-gray-200 pointer-events-none"
                )}
                defaultChecked={selected || disabled}
                id={`account-${account.index}`}
                onChange={onChange}
                disabled={disabled}
            />
            <AccountIcon
                className="w-10 h-10"
                fill={getAccountColor(account.address)}
            />
            <div className="flex flex-col">
                <span className="font-semibold">{account.name}</span>
                <div className="flex space-x-2 w-full text-primary-grey-dark text-xs">
                    <span className="w-20" title={account.address}>
                        {formatHash(account.address)}
                    </span>
                    <span className="text-gray-200">|</span>
                    <div className="inline w-40">Balance: {balance}</div>
                </div>
            </div>
            <div className="flex space-x-3 items-center">
                <div
                    className={classnames(
                        "text-primary-black-default hover:text-primary-blue-default",
                        !isLoading && "cursor-pointer"
                    )}
                    title="Fetch Balance"
                    onClick={(e) => {
                        if (!isLoading) {
                            fetchBalance()
                        }
                        e.preventDefault()
                    }}
                >
                    {isLoading ? (
                        <Spinner color="black" size="16" />
                    ) : (
                        <EyeRevealIcon />
                    )}
                </div>
                <ViewOnExplorerButton
                    mode="icon"
                    hash={account.address}
                    type="address"
                />
            </div>
        </label>
    )
}
