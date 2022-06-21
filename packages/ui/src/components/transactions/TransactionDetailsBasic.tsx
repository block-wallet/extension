import { BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import React, { FunctionComponent, useMemo, useState } from "react"
import { TransactionType } from "../../context/commTypes"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { classnames } from "../../styles"
import { capitalize } from "../../util/capitalize"
import { getAccountColor } from "../../util/getAccountColor"
import { getTransactionType } from "../../util/getTransactionType"
import Divider from "../Divider"
import ExpandableText from "../ExpandableText"
import AccountIcon from "../icons/AccountIcon"
import { TransactionDetailsTabProps } from "./TransactionDetails"
import arrowRight from "../../assets/images/icons/arrow_right_black.svg"
import CopyTooltip from "../label/СopyToClipboardTooltip"
import { formatHash, formatName } from "../../util/formatAccount"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"
import openIcon from "../../assets/images/icons/open_external.svg"

const bnOr0 = (value: any = 0) => BigNumber.from(value)

export const TransactionDetails: FunctionComponent<
    TransactionDetailsTabProps & { nonce?: number }
> = ({ transaction, nonce: _nonce }) => {
    const state = useBlankState()!
    const { nativeCurrency } = useSelectedNetwork()
    const accounts = useSortedAccounts()

    const details = useMemo(() => {
        const {
            nonce,
            value,
            gasPrice,
            gasLimit,
            maxPriorityFeePerGas,
            maxFeePerGas,
        } = transaction.transactionParams

        const details: (
            | {
                  label: string
                  value: string
                  noSpace?: boolean
                  expandable?: boolean
              }
            | undefined
        )[] = []

        if (nonce || _nonce) {
            details.push({
                label: "Nonce",
                value: nonce?.toString() ?? _nonce?.toString() ?? "",
                noSpace: false,
            })
        }
        if (value) {
            let token = nativeCurrency
            if (transaction.transferType) {
                const { decimals, currency } = transaction.transferType
                if (decimals && currency) {
                    token = {
                        name: "",
                        decimals: decimals,
                        symbol: currency,
                    }
                }
            }

            details.push({
                label: "Amount",
                value: `${formatUnits(bnOr0(value), token.decimals)} ${
                    token.symbol
                }`,
            })
        }
        if (gasLimit) {
            details.push({
                label: "Gas limit",
                value: `${formatUnits(bnOr0(gasLimit), "wei")}`,
            })
        }

        const transactionType = getTransactionType(
            transaction.transactionParams
        )

        if (transactionType !== TransactionType.FEE_MARKET_EIP1559) {
            if (gasLimit && gasPrice) {
                details.push({
                    label: "Gas price",
                    value: `${formatUnits(bnOr0(gasPrice), "gwei")} GWEI`,
                })
                details.push(undefined)
                details.push({
                    label: "Total",
                    value: `${formatUnits(
                        bnOr0(gasPrice).mul(BigNumber.from(gasLimit)),
                        nativeCurrency.decimals
                    )} ${nativeCurrency.symbol}`,
                    noSpace: true,
                })
            }
        } else {
            if (maxPriorityFeePerGas && maxFeePerGas && gasLimit) {
                details.push({
                    label: "Max priority fee",
                    value: `${
                        maxPriorityFeePerGas
                            ? formatUnits(bnOr0(maxPriorityFeePerGas), "gwei")
                            : "-"
                    } GWEI`,
                })
                details.push({
                    label: "Max fee",
                    value: `${
                        maxFeePerGas
                            ? formatUnits(bnOr0(maxFeePerGas), "gwei")
                            : "-"
                    } GWEI`,
                })
                details.push(undefined)
                details.push({
                    label: "Total",
                    value: `${
                        maxFeePerGas && gasLimit
                            ? formatUnits(
                                  bnOr0(maxFeePerGas).mul(
                                      BigNumber.from(gasLimit)
                                  ),
                                  nativeCurrency.decimals
                              )
                            : "-"
                    } ${nativeCurrency.symbol}`,
                    noSpace: true,
                })
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

    const fromName = accounts.find(
        (account) =>
            account.address.toLowerCase() ===
            transaction.transactionParams.from?.toLowerCase()
    )?.name

    const toName = accounts.find(
        (account) =>
            account.address.toLowerCase() ===
            transaction.transactionParams.to?.toLowerCase()
    )?.name

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
                                  3
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
                            : formatHash(transaction.transactionParams.to!, 3)}
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
                                >
                                    {detail.value ?? "N/A"}
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
                <div className="flex w-full items-center justify-start mt-auto">
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
