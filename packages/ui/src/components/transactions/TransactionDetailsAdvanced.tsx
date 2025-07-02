import { FunctionComponent, useState } from "react"
import { BigNumber } from "@ethersproject/bignumber"
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
import { isValidAddress } from "ethereumjs-util"
import log from "loglevel"

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
        return (
            <>
                {unformattedValue.map((value, i) => (
                    <div key={`20${i}`}>
                        <Argument
                            value={value}
                            name={(i + 1).toString()}
                            canCollapse={false}
                        />
                    </div>
                ))}
            </>
        )
    }

    let parsedValue: string = ""

    if (typeof unformattedValue === "string") {
        parsedValue = unformattedValue
    } else {
        try {
            parsedValue = BigNumber.from(unformattedValue).toString()
        } catch (error) {
            log.error("Can't parse transaction detail parameter", parsedValue)
        }
    }

    return (
        <div className="flex">
            <ExpandableText className="allow-select text-gray-600 dark:text-gray-400 pt-1">
                {parsedValue as string}
            </ExpandableText>
            {isValidAddress(parsedValue as string) && (
                <a
                    href={generateExplorerLink(
                        availableNetworks,
                        selectedNetwork,
                        parsedValue as string,
                        "address"
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 block hover:opacity-75 transition-opacity duration-200"
                >
                    <img src={openIcon} alt="Open icon" className="w-6 h-6" />
                </a>
            )}
        </div>
    )
}

const Argument = ({
    value,
    name,
    canCollapse = true,
}: {
    value: any
    name: string
    canCollapse?: boolean
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true)

    return (
        <>
            <div
                className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded transition-colors duration-200"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}
            >
                {canCollapse && (
                    <div className="mt-1">
                        <ArrowUpDown active={!isCollapsed} />
                    </div>
                )}
                <p className="pl-1 pt-1 font-semibold text-gray-900 dark:text-gray-100">{name}</p>
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
        </>
    )
}

export const TransactionDetails: FunctionComponent<
    TransactionDetailsTabProps
> = ({ transaction }) => {
    const signature = transaction.methodSignature

    if (!signature) {
        return (
            <div className="h-full flex items-center bg-white dark:bg-gray-900">
                <p className="w-full text-lg text-center text-gray-500 dark:text-gray-400">
                    Details are not available
                </p>
            </div>
        )
    } else {
        let parsedName = signature.name.split(" ").join("")

        parsedName = parsedName.charAt(0).toLowerCase() + parsedName.slice(1)

        return (
            <div className="px-3 break-all text-sm bg-white dark:bg-gray-900">
                <div className="overflow-x-auto whitespace-nowrap horizontal-custom-scroll py-1">
                    <pre className="bg-gray-100 dark:bg-gray-800 w-full p-4 rounded border border-gray-200 dark:border-gray-700">
                        <code className="allow-select text-gray-900 dark:text-gray-100">
                            <span className="font-semibold allow-select">
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
                                    <span className="text-primary-blue-default dark:text-primary-blue-400 allow-select">{`\u00A0\u00A0\u00A0\u00A0${arg.type}`}</span>
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
                        <div key={`1${index}`} className="mt-1">
                            <Argument
                                name={name || (index + 1).toString()}
                                value={value}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}

export default TransactionDetails
