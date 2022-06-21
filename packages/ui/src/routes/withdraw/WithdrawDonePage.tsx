import React from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"

import LinkButton from "../../components/button/LinkButton"
import AnimatedIcon, { AnimatedIconName } from "../../components/AnimatedIcon"

const WithdrawDonePage = () => {
    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <LinkButton location="/" text="Done" classes="w-full" />
                </PopupFooter>
            }
        >
            <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="flex flex-col items-center space-y-4">
                    <AnimatedIcon
                        icon={AnimatedIconName.Success}
                        className="w-24 h-24 pointer-events-none"
                    />
                    <span className="text-2xl font-bold text-gray-900">
                        Success.
                    </span>
                    <span className="w-48 text-sm text-center text-gray-700">
                        You've initiated the withdrawal.
                    </span>
                </div>
            </div>
        </PopupLayout>
    )
}

export default WithdrawDonePage
