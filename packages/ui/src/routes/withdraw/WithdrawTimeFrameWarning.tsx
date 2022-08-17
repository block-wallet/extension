import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import bellIcon from "../../assets/images/icons/bell.svg"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"

export const WithdrawTimeFrameWarning: React.FunctionComponent<{
    onConfirm: any
    onCancel: any
    currency: string
}> = ({ onConfirm, onCancel, currency }) => (
    <PopupLayout
        header={
            <PopupHeader title="Confirm Withdraw" close="/" onBack={onCancel} />
        }
        footer={
            <PopupFooter>
                <ButtonWithLoading
                    label="Got it, proceed"
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
                You are going to withdraw your {currency.toUpperCase()} having
                deposited into the same pool in the past 24 hours. This
                increases the risk of getting the withdrawal linked to a
                deposit, making yourself vulnerable to deanonymization. Please,
                read more about on{" "}
                <a
                    className="underline text-blue-600 hover:text-blue-800"
                    href="https://help.blockwallet.io/hc/en-us/articles/4408778013969-Optimal-Online-Privacy-With-BlockWallet"
                    target="_blank"
                    rel="noreferrer"
                >
                    how to stay anonymous
                </a>
            </span>
        </div>
    </PopupLayout>
)
