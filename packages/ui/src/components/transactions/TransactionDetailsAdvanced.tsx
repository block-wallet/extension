import React, { FunctionComponent, useState } from "react"
import { BigNumber, utils } from "ethers"
import { TransactionArgument } from "@block-wallet/background/controllers/transactions/ContractSignatureParser"
import { TransactionDetailsTabProps } from "./TransactionDetails"
import ExpandableText from "../ExpandableText"
import classNames from "classnames"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import openIcon from "../../assets/images/icons/open_external.svg"
import { generateExplorerLink } from "../../util/getExplorer"
import { useBlankState } from "../../context/background/backgroundHooks"
import GenericTooltip from "../label/GenericTooltip"
import { formatName } from "../../util/formatAccount"

export interface TransactionDetailsProps {
    transactionArgs: TransactionArgument[]
}

const ArgumentValue = ({
    unformattedValue,
}: {
    unformattedValue: any[] | string | BigNumber
}) => {
    const { availableNetworks, selectedNetwork } = useBlankState()!

    if (!unformattedValue) return null

    if (Array.isArray(unformattedValue)) {
        // Call format argument again
        return (
            <>
                {unformattedValue.map((value, i) => (
                    <div key={`${i}-${value}`}>
                        <Argument value={value} i={i} canCollapse={false} />
                    </div>
                ))}
            </>
        )
    }

    let parsedValue = unformattedValue

    // BigNumber
    // @ts-ignore
    if (!!unformattedValue.hex) {
        parsedValue = BigNumber.from(unformattedValue).toString()
    }

    return (
        <div className="flex">
            <ExpandableText
                key={parsedValue.toString()}
                className="allow-select text-gray-600 pt-1"
            >
                {parsedValue as string}
            </ExpandableText>
            {utils.isAddress(parsedValue as string) && (
                <a
                    href={generateExplorerLink(
                        availableNetworks,
                        selectedNetwork,
                        parsedValue as string,
                        "address"
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 block"
                >
                    <img src={openIcon} alt="Open icon" className="w-6 h-6" />
                </a>
            )}
        </div>
    )
}

const Argument = ({
    value,
    i,
    name,
    canCollapse = true,
}: {
    value: any
    i: number
    name?: string | null
    canCollapse?: boolean
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true)

    return (
        <div className={!name ? "flex items-start" : ""}>
            <div
                className="flex items-center cursor-pointer"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}
            >
                {canCollapse && (
                    <div className="mt-1">
                        <ArrowUpDown active={!isCollapsed} />
                    </div>
                )}
                <p className="pl-1 pt-1 font-bold">{name ?? `${i + 1}.`}</p>
            </div>
            <div
                className={classNames(
                    "overflow-hidden",
                    canCollapse && isCollapsed ? "h-0" : ""
                )}
            >
                <div className="w-11/12 ml-2">
                    <ArgumentValue unformattedValue={value} />
                </div>
            </div>
        </div>
    )
}

export const TransactionDetails: FunctionComponent<TransactionDetailsTabProps> = ({
    transaction,
}) => {
    const signature = transaction.methodSignature

    if (!signature) {
        return (
            <div className="h-full flex items-center">
                <p className="w-full text-lg text-center text-gray-600">
                    Details are not available
                </p>
            </div>
        )
    } else {
        let parsedName = signature.name.split(" ").join("")

        parsedName = parsedName.charAt(0).toLowerCase() + parsedName.slice(1)

        return (
            <div className="flex flex-col px-3 space-y-1 break-all text-sm">
                <div className="overflow-x-auto whitespace-nowrap horizontal-custom-scroll py-1">
                    <pre className="bg-gray-100 w-full p-4 rounded">
                        <code className="allow-select">
                            <span className="font-bold allow-select">
                                <GenericTooltip
                                    bottom
                                    disabled={parsedName.length < 25}
                                    className="w-52 p-2 left-0"
                                    content={
                                        <p className="whitespace-normal break-all">
                                            {parsedName}
                                        </p>
                                    }
                                >
                                    {formatName(parsedName, 25)}
                                </GenericTooltip>
                            </span>
                            (
                            {signature.args.map((arg, i) => (
                                <span className="allow-select" key={i}>
                                    <br />
                                    <span className="text-primary-300 allow-select">{`\u00A0\u00A0\u00A0\u00A0${arg.type}`}</span>
                                    {arg.name ? ` ${arg.name}` : ""}
                                    {i !== signature.args.length - 1 ? "," : ""}
                                </span>
                            ))}
                            {signature.args.length > 0 ? <br /> : null})
                        </code>
                    </pre>
                </div>
                <div>
                    {signature.args.map(({ name, value }, index) => (
                        <div key={`${index}-${name}-${value}`} className="mt-2">
                            <Argument name={name} value={value} i={index} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}

export default TransactionDetails
