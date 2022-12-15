import { FC } from "react"
import classnames from "classnames"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"
interface TokenSummaryMembersProps {
    title?: string
    className?: string
    children: React.ReactNode
    isLoading?: boolean
}

interface TokenSummaryMembers {
    Balances: FC<{ children: React.ReactNode; className?: string }>
    TokenBalance: FC<TokenSummaryMembersProps>
    ExchangeRateBalance: FC<TokenSummaryMembersProps>
    Actions: FC<{ children: React.ReactNode; className?: string | undefined }>
    TokenName: FC<{ title?: string; children: React.ReactNode }>
}

const TokenSummary: FC<{
    minHeight?: string | number
    children: React.ReactNode
    className?: string | undefined
}> &
    TokenSummaryMembers = ({ children, minHeight, className }) => {
    return (
        <div
            className={
                "flex flex-col items-center w-full justify-between rounded-md bg-primary-100 h-fit " +
                className
            }
            style={{ minHeight: minHeight ?? "10rem" }}
        >
            {children}
        </div>
    )
}

const Balances = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => {
    return (
        <div
            className={classnames(
                "flex flex-col items-center space-y-1",
                className
            )}
        >
            {children}
        </div>
    )
}

const TokenBalance: FC<TokenSummaryMembersProps> = ({
    children,
    title,
    className,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <AnimatedIcon
                icon={AnimatedIconName.BlueLineLoadingSkeleton}
                className="w-32 h-4 pointer-events-none"
                svgClassName="rounded-md"
            />
        )
    }
    return (
        <span
            className={classnames("text-2xl font-bold", className)}
            title={title}
        >
            {children}
        </span>
    )
}

const ExchangeRateBalance: FC<TokenSummaryMembersProps> = ({
    children,
    title,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <AnimatedIcon
                icon={AnimatedIconName.BlueLineLoadingSkeleton}
                className="w-16 h-4 pointer-events-none rotate-180"
                svgClassName="rounded-md"
            />
        )
    }
    return (
        <span className="text-sm text-gray-600" title={title}>
            {children}
        </span>
    )
}

const TokenName: FC<{
    title?: string
    children: React.ReactNode
}> = ({ children, title }) => {
    return (
        <span className="text-xs text-gray-600" title={title}>
            {children}
        </span>
    )
}

const Actions: FC<{
    children: React.ReactNode
    className?: string
}> = ({ children, className }) => {
    return (
        <div
            className={
                "flex flex-row items-center justify-around w-full " + className
            }
        >
            {children}
        </div>
    )
}

TokenSummary.Balances = Balances
TokenSummary.TokenBalance = TokenBalance
TokenSummary.ExchangeRateBalance = ExchangeRateBalance
TokenSummary.TokenName = TokenName
TokenSummary.Actions = Actions
export default TokenSummary
