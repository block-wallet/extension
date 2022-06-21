import React, { useState } from "react"

// External components
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import TokenDisplay from "../../components/TokenDisplay"

// Utils
import { addCustomTokens } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

// Types
import { TokenResponse } from "./AddTokensPage"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"

const AddTokensConfirmPage = (props: any) => {
    const history: any = useOnMountHistory()
    const [addingTokens, setAddingTokens] = useState(false)
    const tokenList: any = history.location.state.tokens
    const { clear: clearLocationRecovery } = useLocationRecovery()

    // Handlers
    const onSubmit = async () => {
        try {
            setAddingTokens(true)
            clearLocationRecovery()
            addCustomTokens(tokenList)
            history.push("/")
        } finally {
            setAddingTokens(false)
        }
    }

    return (
        <PopupLayout
            header={<PopupHeader title="Add Tokens" close="/" keepState />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="button"
                        onClick={onSubmit}
                        isLoading={addingTokens}
                        label={"Add Tokens"}
                    ></ButtonWithLoading>
                </PopupFooter>
            }
        >
            {/* MAIN */}
            <div className="flex-1 flex flex-col w-full h-0 max-h-screen pb-0">
                <div className="text-sm text-grey-200 p-6 pb-3">
                    {tokenList.length > 1
                        ? "Would you like to add these tokens?"
                        : "Would you like to add this token?"}
                </div>
                <div className="p-3 pt-0">
                    {tokenList.map((token: TokenResponse) => {
                        // Selected tokens
                        return (
                            <div key={`selected-${token.address}`}>
                                <TokenDisplay
                                    data={token}
                                    clickable={false}
                                    active={false}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* FOOTER */}
        </PopupLayout>
    )
}

export default AddTokensConfirmPage
