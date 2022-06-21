import React, { FC } from "react"

interface TokenSummaryMembers {
    Balances: FC
    TokenBalance: FC<{ title?: string }>
    ExchangeRateBalance: FC<{ title?: string }>
    Actions: FC
}

const TokenSummary: FC<{ minHeight?: string | number }> &
    TokenSummaryMembers = ({ children, minHeight }) => {
    return (
        <div
            className="flex flex-col items-center w-full p-4 justify-between rounded-md bg-primary-100 h-fit"
            style={{ minHeight: minHeight ?? "10rem" }}
        >
            {children}
        </div>
    )
}

const Balances: FC = ({ children }) => {
    return (
        <div className="flex flex-col items-center space-y-1">{children}</div>
    )
}

const TokenBalance: FC<{ title?: string }> = ({ children, title }) => {
    return (
        <span className="text-2xl font-bold" title={title}>
            {children}
        </span>
    )
}

const ExchangeRateBalance: FC<{ title?: string }> = ({ children, title }) => {
    return (
        <span className="text-sm text-gray-600" title={title}>
            {children}
        </span>
    )
}

const Actions: FC = ({ children }) => {
    return (
        <div className="flex flex-row items-center justify-around w-full">
            {children}
        </div>
    )
}

TokenSummary.Balances = Balances
TokenSummary.TokenBalance = TokenBalance
TokenSummary.ExchangeRateBalance = ExchangeRateBalance
TokenSummary.Actions = Actions
export default TokenSummary
