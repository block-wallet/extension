import classnames from "classnames"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

const DefaultGasPreferencesPage = () => {
    return (
        <PopupLayout
            header={<PopupHeader title="Default Gas Setting" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading label="Save" />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <span className="text-sm text-gray-500">
                    Set your preferred gas setting for all future transactions.
                </span>
                <div className="flex flex-col w-full space-y-2">
                    <div
                        //key={option.label}
                        className="w-full flex flex-col space-y-2 items-center p-4 cursor-pointer rounded-md hover:bg-gray-100 border"
                        onClick={() => {}}
                    >
                        <label
                            className={classnames(
                                "text-base font-semibold cursor-pointer capitalize"
                                //selectedOption.label === option.label &&
                                //    "text-primary-300"
                            )}
                        >
                            Low{/*{option.label}*/}
                        </label>
                        <span className="text-sm">Cheap</span>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default DefaultGasPreferencesPage
