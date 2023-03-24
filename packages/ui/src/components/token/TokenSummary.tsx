import { FC } from "react"
import classnames from "classnames"
import { useBlankState } from "../../context/background/backgroundHooks"
import BalanceLoadingSkeleton from "../skeleton/BalanceLoadingSkeleton"

interface TokenSummaryMembers {
    Balances: FC<{ children: React.ReactNode; className?: string }>
    TokenBalance: FC<{
        title?: string
        children: React.ReactNode
        className?: string
    }>
    ExchangeRateBalance: FC<{
        title?: string
        className?: string
        children: React.ReactNode
    }>
    TokenName: FC<{ title?: string; children: React.ReactNode }>
    Actions: FC<{ children: React.ReactNode; className?: string | undefined }>
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
                "flex flex-col items-center w-full space-y-5 justify-between rounded-md h-fit " +
                className
            }
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
    const state = useBlankState()!

    const isLoading =
        state.isNetworkChanging || state.isRatesChangingAfterNetworkChange

    return (
        <>
            {isLoading ? (
                <BalanceLoadingSkeleton />
            ) : (
                <div
                    className={
                        "flex flex-col items-center space-y-1 " + className
                    }
                >
                    {children}
                </div>
            )}
        </>
    )
}

const TokenBalance: FC<{
    title?: string
    className?: string
    children: React.ReactNode
}> = ({ children, title, className }) => {
    return (
        <span
            className={classnames("text-[32px] font-semibold", className)}
            title={title}
        >
            {children}
        </span>
    )
}

const ExchangeRateBalance: FC<{
    title?: string
    className?: string
    children: React.ReactNode
}> = ({ children, title, className }) => {
    return (
        <span
            className={classnames("text-sm text-primary-grey-dark", className)}
            title={title}
        >
            {children}
        </span>
    )
}

const TokenName: FC<{
    title?: string
    children: React.ReactNode
}> = ({ children, title }) => {
    return (
        <span className="text-xs text-primary-grey-dark" title={title}>
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
