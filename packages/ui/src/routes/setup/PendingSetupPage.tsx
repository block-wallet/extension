import PopupLayout from "../../components/popup/PopupLayout"
import cross from "../../assets/images/icons/cross.svg"
import classnames from "classnames"
import { Classes } from "../../styles/classes"
import { returnToOnboarding } from "../../context/commActions"

const PendingSetupPage = () => {
    return (
        <PopupLayout>
            <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center space-y-4">
                        <img
                            src={cross}
                            alt="checkmark"
                            className="w-24 h-24"
                        />
                        <span className="text-gray-900 font-bold text-2xl">
                            Oops...
                        </span>
                        <span className="text-gray-700 text-center text-sm w-64">
                            It seems you have not completed your wallet setup
                            yet.
                        </span>
                    </div>
                    <button
                        onClick={() => returnToOnboarding()}
                        className={classnames(Classes.button, "mt-12")}
                    >
                        Back to Onboarding
                    </button>
                </div>
            </div>
        </PopupLayout>
    )
}

export default PendingSetupPage
