import { FunctionComponent, useState } from "react"

import classnames from "classnames"
import WarningTip from "./label/WarningTip"
import IsBetaDialog from "./dialog/IsBetaDialog"

const FullCenterContainer: FunctionComponent<{
    centered?: boolean
    screen?: boolean
    children: React.ReactNode
    displayWarningTip?: boolean
}> = ({
    children,
    centered = false,
    screen = false,
    displayWarningTip = false,
}) => {
    const [isBetaDiallogOpen, setIsBetaDiallogOpen] = useState(false)
    return (
        <>
            <IsBetaDialog
                isOpen={isBetaDiallogOpen}
                onClick={() => {
                    setIsBetaDiallogOpen(false)
                }}
            />
            {displayWarningTip && (
                <div onClick={() => setIsBetaDiallogOpen(true)}>
                    <WarningTip
                        text={
                            <>
                                <b>Warning!</b> This is an experimental version
                                of BlockWallet
                            </>
                        }
                        fontSize="text-sm"
                        justify="justify-center"
                        className="w-full cursor-pointer"
                    />
                </div>
            )}
            <div
                className="w-full min-h-full flex bg-primary-100"
                style={screen ? {} : { height: "fit-content" }}
            >
                <div
                    className={classnames(
                        "flex flex-1 md:flex-0",
                        !screen && "px-2",
                        "mx-auto",
                        centered ? "my-auto" : !screen ? "mb-auto" : ""
                    )}
                >
                    {children}
                </div>
            </div>
        </>
    )
}

export default FullCenterContainer
