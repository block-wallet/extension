import { useState } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import TokenDisplay from "../../components/token/TokenDisplay"

import { addCustomTokens } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { TokenResponse } from "./AddTokensPage"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"

const AddTokensConfirmPage = () => {
    const history: any = useOnMountHistory()
    const [addingTokens, setAddingTokens] = useState(false)
    const tokenList: any = history.location.state.tokens

    const state = {
        ...(history.location.state?.addTokenState || {}),
        token: tokenList[0],
    }

    const { clear: clearLocationRecovery } = useLocationRecovery()

    const onSubmit = async () => {
        try {
            setAddingTokens(true)
            clearLocationRecovery()
            addCustomTokens(tokenList)
            state.redirectTo
                ? history.push({
                    pathname: state.redirectTo,
                    state,
                })
                : history.push("/")
        } finally {
            setAddingTokens(false)
        }
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Add Tokens"
                    networkIndicator
                    onBack={() => {
                        history.push({
                            pathname: "/settings/tokens/add",
                            state: {
                                searchValue:
                                    tokenList.length > 1 ||
                                        history.location.state?.searchedValue
                                        ? history.location.state?.searchedValue
                                        : state.token.address,
                            },
                        })
                    }}
                />
            }
            submitOnEnter={{ onSubmit }}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="button"
                        onClick={onSubmit}
                        isLoading={addingTokens}
                        label={tokenList.length > 1 ? "Add Tokens" : "Add Token"}
                        buttonClass="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-md"
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-green-900/10"></div>

            <div className="relative z-10 flex-1 flex flex-col w-full h-full max-h-screen">
                <div className="p-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Confirm Addition
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {tokenList.length > 1
                                    ? `Review and confirm adding ${tokenList.length} tokens to your wallet`
                                    : "Review and confirm adding this token to your wallet"
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        {tokenList.length > 1 ? "Multiple Tokens" : "Token Information"}
                                    </h3>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {tokenList.length > 1
                                            ? "These tokens will be added to your current network"
                                            : "This token will be added to your current network"
                                        }
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                        {tokenList.length} {tokenList.length === 1 ? 'token' : 'tokens'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>TOKENS TO ADD</span>
                            </h3>
                            <div className="space-y-2">
                                {tokenList.map((token: TokenResponse, index: number) => (
                                    <div
                                        key={`selected-${token.address}`}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                                    >
                                        <TokenDisplay
                                            data={token}
                                            clickable={false}
                                            active={false}
                                        />
                                        <div className="px-4 pb-4">
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">Address:</span>
                                                    <p className="font-mono text-gray-900 dark:text-gray-100 break-all">
                                                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">Decimals:</span>
                                                    <p className="text-gray-900 dark:text-gray-100">
                                                        {token.decimals || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                            <div className="flex space-x-3">
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                    <p className="font-medium mb-1">Security Notice</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Only add tokens from sources you trust</li>
                                        <li>• Verify contract addresses before proceeding</li>
                                        <li>• Be aware of potential scam tokens</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AddTokensConfirmPage
