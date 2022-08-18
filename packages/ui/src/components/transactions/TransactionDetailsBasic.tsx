import { BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import { FunctionComponent, useMemo, useState } from "react"
import { formatNumberLength } from "../../util/formatNumberLength"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { classnames } from "../../styles"
import { capitalize } from "../../util/capitalize"
import { getAccountColor } from "../../util/getAccountColor"
import Divider from "../Divider"
import ExpandableText from "../ExpandableText"
import AccountIcon from "../icons/AccountIcon"
import { TransactionDetailsTabProps } from "./TransactionDetails"
import arrowRight from "../../assets/images/icons/arrow_right_black.svg"
import CopyTooltip from "../label/СopyToClipboardTooltip"
import { formatHash, formatName } from "../../util/formatAccount"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { useAddressBook } from "../../context/hooks/useAddressBook"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"
import openIcon from "../../assets/images/icons/open_external.svg"
import {
    TransactionCategories,
    TransactionStatus,
} from "../../context/commTypes"
import { calcExchangeRate } from "../../util/exchangeUtils"
import isNil from "../../util/isNil"

const bnOr0 = (value: any = 0) => BigNumber.from(value)

export const TransactionDetails: FunctionComponent<
    TransactionDetailsTabProps & { nonce?: number }
> = ({ transaction, nonce: _nonce }) => {
    const state = useBlankState()!
    const { nativeCurrency } = useSelectedNetwork()
    const accounts = useSortedAccounts()
    const addressBook = useAddressBook()

    const details = useMemo(() => {
        const isConfirmed = transaction.status === TransactionStatus.CONFIRMED
        const nonce = transaction.transactionParams.nonce || _nonce
        const value = bnOr0(transaction.transactionParams.value)
        const gasPrice = bnOr0(
            transaction.transactionReceipt?.effectiveGasPrice ||
                transaction.transactionParams.gasPrice
        )
        const gasLimit = bnOr0(
            transaction.transactionReceipt?.gasUsed ||
                transaction.transactionParams.gasLimit
        )
        const maxFeePerGas = bnOr0(
            transaction.transactionReceipt?.effectiveGasPrice ||
                transaction.transactionParams.maxFeePerGas
        )
        const maxPriorityFeePerGas = bnOr0(
            transaction.transactionParams.maxPriorityFeePerGas
        )

        const details: (
            | {
                  label: string
                  value: string
                  noSpace?: boolean
                  expandable?: boolean
                  decimals?: number
                  unitName?: string
              }
            | undefined
        )[] = []

        // Swap details
        if (
            transaction.transactionCategory ===
                TransactionCategories.EXCHANGE &&
            transaction.exchangeParams !== undefined
        ) {
            if (transaction.transactionParams.hash !== undefined) {
                if (!isNil(nonce)) {
                    details.push({
                        label: "Nonce",
                        value: nonce!.toString(),
                        noSpace: false,
                    })
                }

                if (gasLimit.gt(0)) {
                    let txFee = BigNumber.from(0)

                    if (maxPriorityFeePerGas.gt(0) && maxFeePerGas.gt(0)) {
                        txFee = maxFeePerGas.mul(gasLimit)
                    } else if (gasPrice.gt(0)) {
                        txFee = gasPrice.mul(gasLimit)
                    }

                    if (txFee.gt(0)) {
                        details.push({
                            label: "Transaction fee",
                            value: formatUnits(txFee, nativeCurrency.decimals),
                            decimals: 10,
                            unitName: nativeCurrency.symbol,
                        })
                    }
                }
            }

            details.push({
                label: "Swap fee",
                value: formatUnits(
                    bnOr0(transaction.exchangeParams.blockWalletFee),
                    transaction.exchangeParams.fromToken.decimals
                ),
                decimals: 10,
                unitName: transaction.exchangeParams.fromToken.symbol,
            })

            details.push({
                label: isConfirmed ? "Spent" : "Spending",
                value: formatUnits(
                    bnOr0(transaction.exchangeParams.fromTokenAmount),
                    transaction.exchangeParams.fromToken.decimals
                ),
                decimals: 10,
                unitName: transaction.exchangeParams.fromToken.symbol,
            })

            details.push({
                label: isConfirmed ? "Received" : "Receiving",
                value: formatUnits(
                    bnOr0(transaction.exchangeParams.toTokenAmount),
                    transaction.exchangeParams.toToken.decimals
                ),
                decimals: 10,
                unitName: transaction.exchangeParams.toToken.symbol,
            })

            const rate = calcExchangeRate(
                bnOr0(transaction.exchangeParams.fromTokenAmount),
                transaction.exchangeParams.fromToken.decimals,
                bnOr0(transaction.exchangeParams.toTokenAmount),
                transaction.exchangeParams.toToken.decimals
            )

            details.push({
                label: "Rate",
                value: rate.toString(),
                decimals: 5,
                unitName: `${transaction.exchangeParams.toToken.symbol}/${transaction.exchangeParams.fromToken.symbol}`,
            })

            return details
        }

        if (nonce) {
            details.push({
                label: "Nonce",
                value: nonce.toString(),
                noSpace: false,
            })
        }

        // Check if it's a transfer and display amount as transferred amount
        if (
            transaction.transferType?.decimals &&
            transaction.transferType?.currency &&
            transaction.transferType?.amount
        ) {
            details.push({
                label: "Amount",
                value: formatUnits(
                    bnOr0(transaction.transferType.amount),
                    transaction.transferType.decimals
                ),
                decimals: 10,
                unitName: transaction.transferType.currency,
            })

            // Check if it's a withdraw
            if (
                transaction.transactionCategory ===
                    TransactionCategories.BLANK_WITHDRAWAL &&
                transaction.advancedData?.withdrawFee
            ) {
                details.push({
                    label: "Withdraw Fee",
                    value: formatUnits(
                        bnOr0(transaction.advancedData?.withdrawFee),
                        transaction.transferType.decimals
                    ),
                    decimals: 10,
                    unitName: transaction.transferType.currency,
                })
            }
        } else {
            // Or else display transaction value
            details.push({
                label: "Value",
                value: formatUnits(value, nativeCurrency.decimals),
                decimals: 10,
                unitName: nativeCurrency.symbol,
            })
        }

        // Gas and total calculation
        if (gasLimit.gt(0)) {
            details.push({
                label: "Gas limit",
                value: gasLimit.toString(),
            })

            let txFee = BigNumber.from(0)

            if (maxPriorityFeePerGas.gt(0) && maxFeePerGas.gt(0)) {
                details.push({
                    label: "Max priority fee",
                    value: formatUnits(maxPriorityFeePerGas, "gwei"),
                    unitName: "GWEI",
                })

                details.push({
                    label: "Max fee",
                    value: formatUnits(maxFeePerGas, "gwei"),
                    unitName: "GWEI",
                })

                txFee = maxFeePerGas.mul(gasLimit)
            } else if (gasPrice.gt(0)) {
                details.push({
                    label: "Gas price",
                    value: formatUnits(gasPrice, "gwei"),
                    unitName: "GWEI",
                    decimals: 10,
                })

                txFee = gasPrice.mul(gasLimit)
            }

            if (txFee.gt(0)) {
                details.push({
                    label: "Transaction fee",
                    value: formatUnits(txFee, nativeCurrency.decimals),
                    decimals: 10,
                    unitName: nativeCurrency.symbol,
                })

                if (value.gt(0)) {
                    details.push(undefined)

                    details.push({
                        label: "Total",
                        value: formatUnits(
                            txFee.add(value),
                            nativeCurrency.decimals
                        ),
                        noSpace: true,
                        decimals: 10,
                        unitName: nativeCurrency.symbol,
                    })
                }
            }
        }

        return details

        // eslint-disable-next-line
    }, [transaction, _nonce])

    const [copied, setCopied] = useState(-1)

    const copy = (value: string, i: number) => async () => {
        await navigator.clipboard.writeText(value)
        setCopied(i)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(-1)
    }

    const { from, to } = transaction.transactionParams

    let fromName
    if (from) {
        fromName = accounts.find(
            (account) => account.address.toLowerCase() === from.toLowerCase()
        )?.name

        //If from was not found in accounts, then we look into the address book.
        if (!fromName) {
            fromName = Object.values(addressBook).find(
                (address) => address.address.toLowerCase() === from
            )?.name
        }
    }

    let toName
    if (to) {
        toName = accounts.find(
            (account) => account.address.toLowerCase() === to.toLowerCase()
        )?.name

        //If to was not found in accounts, then we look into the address book.
        if (!toName) {
            toName = Object.values(addressBook).find(
                (address) => address.address.toLowerCase() === to
            )?.name
        }
    }

    const explorerName = getExplorerTitle(
        state.availableNetworks,
        state.selectedNetwork
    )

    return (
        <div className="-mt-8 pt-4 flex-1 flex flex-col">
            <div className="flex flex-row items-center justify-between w-full py-4 relative">
                <div
                    className="flex flex-row items-center w-1/2 justify-start group relative cursor-pointer"
                    onClick={copy(transaction.transactionParams.from ?? "", 0)}
                >
                    <div>
                        <AccountIcon
                            className="h-6 w-6"
                            fill={getAccountColor(
                                transaction.transactionParams.from!
                            )}
                        />
                    </div>
                    <span
                        title={transaction.transactionParams.from}
                        className="pl-2 font-bold text-sm truncate"
                    >
                        {fromName
                            ? formatName(fromName, 12)
                            : formatHash(
                                  transaction.transactionParams.from!,
                                  2
                              )}
                    </span>
                    <CopyTooltip copied={copied === 0} text="Copy address" />
                </div>
                <div className="w-8 border rounded-full bg-white z-10 absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <img
                        src={arrowRight}
                        className="p-2"
                        alt=""
                        draggable={false}
                    />
                </div>
                <div
                    className="absolute border-t transform rotate-90 z-0 left-1/2 -translate-x-1/2"
                    style={{ width: "58px" }}
                ></div>
                <div
                    className="relative flex flex-row items-center cursor-pointer group w-1/2 pl-6"
                    onClick={copy(
                        transaction.transferType?.to ??
                            transaction.transactionParams.to ??
                            "",
                        1
                    )}
                >
                    <div>
                        <AccountIcon
                            className="h-6 w-6"
                            fill={getAccountColor(
                                transaction.transactionParams.to!
                            )}
                        />
                    </div>
                    <span
                        title={transaction.transactionParams.to}
                        className="pl-2 font-bold text-sm truncate"
                    >
                        {toName
                            ? formatName(toName, 12)
                            : formatHash(transaction.transactionParams.to!, 2)}
                    </span>
                    <CopyTooltip copied={copied === 1} text="Copy address" />
                </div>
            </div>
            <div
                style={{
                    width: "calc(100% + 1.5rem)",
                    marginLeft: "-0.75rem",
                }}
            >
                <Divider />
            </div>
            <main>
                {details.map((detail, i) =>
                    detail ? (
                        <div
                            key={i.toString()}
                            className={classnames(
                                "w-full",
                                detail.noSpace ? "" : "mt-3",
                                detail.expandable
                                    ? ""
                                    : "flex justify-between items-center"
                            )}
                        >
                            <p className="text-sm font-semibold">
                                {capitalize(detail.label)}
                            </p>
                            {detail.expandable ? (
                                <ExpandableText className="text-gray-600 mt-1 w-fulltext-sm allow-select">
                                    {detail.value ?? "N/A"}
                                </ExpandableText>
                            ) : (
                                <span
                                    className={classnames(
                                        "text-gray-600 text-sm allow-select",
                                        detail.expandable ? "w-11/12 mt-1" : ""
                                    )}
                                    title={`${detail.value ?? "N/A"} ${
                                        detail.unitName ?? ""
                                    }`}
                                >
                                    {detail.value
                                        ? detail.decimals
                                            ? `${formatNumberLength(
                                                  detail.value,
                                                  detail.decimals,
                                                  false
                                              )} ${detail.unitName ?? ""}`
                                            : `${detail.value} ${
                                                  detail.unitName ?? ""
                                              }`
                                        : "N/A"}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div
                            className="py-3"
                            style={{
                                width: "calc(100% + 1.5rem)",
                                marginLeft: "-0.75rem",
                            }}
                            key={i.toString()}
                        >
                            <Divider />
                        </div>
                    )
                )}
            </main>
            {!!transaction.transactionParams.hash && (
                <div className="flex w-full items-center justify-start mt-3">
                    <a
                        href={generateExplorerLink(
                            state.availableNetworks,
                            state.selectedNetwork,
                            transaction.transactionParams.hash,
                            "tx"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row items-center space-x-2 text-sm font-bold text-primary-300"
                    >
                        <span>View on {explorerName}</span>
                        <img
                            src={openIcon}
                            alt="Open icon"
                            className="w-3 h-3"
                        />
                    </a>
                </div>
            )}
        </div>
    )
}

export default TransactionDetails
