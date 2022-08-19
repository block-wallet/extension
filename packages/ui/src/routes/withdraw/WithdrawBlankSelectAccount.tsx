import { FunctionComponent, useState } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import AccountSelect from "../../components/account/AccountSelect"
import bellIcon from "../../assets/images/icons/bell.svg"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { hasDepositedFromAddress } from "../../context/commActions"
import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { AccountFilter } from "../../util/filterAccounts"

const Warning: FunctionComponent<{
    onConfirm: any
    onCancel: any
    currency: string
}> = ({ onConfirm, onCancel, currency }) => (
    <PopupLayout
        header={
            <PopupHeader title="Confirm Withdraw" onBack={onCancel} keepState />
        }
        footer={
            <PopupFooter>
                <ButtonWithLoading
                    label="Got it, proceed"
                    type="button"
                    onClick={onConfirm}
                />
            </PopupFooter>
        }
    >
        <div className="flex flex-col items-center p-6 pt-20 space-y-4">
            <img src={bellIcon} className="w-16 h-16" alt="bell" />
            <span className="text-xl font-bold text-gray-900 font-title">
                Warning!
            </span>
            <span className="w-64 text-sm text-center text-gray-500">
                You are going to withdraw your {currency.toUpperCase()} to the
                same address you have made a deposit from, which defeats the
                purpose of the privacy pools and makes your transactions
                visible.
            </span>
        </div>
    </PopupLayout>
)

const WithdrawBlankSelectAccount = () => {
    const history: any = useOnMountHistory()
    const { pair, preSelectedAsset, isAssetDetailsPage } = history.location
        .state as {
        pair: CurrencyAmountPair
        preSelectedAsset: TokenWithBalance
        isAssetDetailsPage: boolean
    }

    const accountArray = useSortedAccounts()
    const currentAccount = useSelectedAccount()

    const [selectedAccount, setSelectedAccount] = useState(currentAccount)

    const [showWarning, setShowWarning] = useState(false)

    const next = async (force = false) => {
        if (!force) {
            const hasDeposited = await hasDepositedFromAddress(
                selectedAccount.address,
                pair
            )

            if (hasDeposited) {
                return setShowWarning(true)
            }
        }

        history.push({
            pathname: "/privacy/withdraw/block/accounts/step/confirm",
            state: {
                address: selectedAccount.address,
                pair,
                preSelectedAsset,
                isAssetDetailsPage,
            },
        })
    }

    return showWarning ? (
        <Warning
            onConfirm={() => next(true)}
            onCancel={() => setShowWarning(false)}
            currency={pair.currency}
        />
    ) : (
        <PopupLayout
            header={
                <PopupHeader
                    title="Withdraw From Privacy Pool"
                    onBack={() => {
                        history.push({
                            pathname: "/privacy/withdraw/select",
                            state: {
                                pair,
                                preSelectedAsset,
                                isAssetDetailsPage,
                            },
                        })
                    }}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading label="Next" onClick={() => next()} />
                </PopupFooter>
            }
        >
            <AccountSelect
                customFilters={[
                    AccountFilter.ALL,
                    AccountFilter.EXTERNAL,
                    AccountFilter.HARDWARE,
                ]}
                accounts={accountArray}
                selectedAccount={selectedAccount}
                onAccountChange={(account: AccountInfo) =>
                    setSelectedAccount(account)
                }
                createAccountTo={{
                    pathname: "/privacy/withdraw/block/accounts/create",
                    state: { pair, preSelectedAsset, isAssetDetailsPage },
                }}
                showSelectedCheckmark
                showActionButtons={false}
                showMenu={false}
            />
        </PopupLayout>
    )
}

export default WithdrawBlankSelectAccount
