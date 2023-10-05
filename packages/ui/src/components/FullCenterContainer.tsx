import { FunctionComponent } from "react"
import classnames from "classnames"
import LogoHeader from "./LogoHeader"

const FullCenterContainer: FunctionComponent<{
    centered?: boolean
    screen?: boolean
    children: React.ReactNode
}> = ({ children, centered = false, screen = false }) => (
    <div
        className="w-full min-h-full flex bg-primary-grey-default"
        style={screen ? {} : { height: "fit-content" }}
    >
        <div
            className={classnames(
                "flex flex-col flex-1 md:flex-0",
                !screen && "px-2",
                "mx-auto",
                centered ? "my-auto" : !screen ? "mb-auto" : ""
            )}
        >
            {children}
        </div>
    </div>
)

export default FullCenterContainer
