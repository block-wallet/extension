import { FunctionComponent } from "react"

import classnames from "classnames"
import WarningTip from "./label/WarningTip"

const FullCenterContainer: FunctionComponent<{
    centered?: boolean
    screen?: boolean
    children: React.ReactNode
}> = ({ children, centered = false, screen = false }) => (
    <>
        <WarningTip
            text={
                <>
                    <b>Warning!</b> This is an experimental version of
                    BlockWallet
                </>
            }
            fontSize="text-sm"
            justify="justify-center"
            className="w-full"
        />
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

export default FullCenterContainer
