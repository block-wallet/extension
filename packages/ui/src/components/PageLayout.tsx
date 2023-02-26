import { FunctionComponent } from "react"
import { classnames } from "../styles/classes"
import FullCenterContainer from "./FullCenterContainer"
import LogoHeader from "./LogoHeader"

const PageLayout: FunctionComponent<{
    centered?: boolean
    header?: boolean
    className?: string
    maxWidth?: string
    style?: React.CSSProperties
    sideComponent?: React.ReactNode
    children?: React.ReactNode
    screen?: boolean
    displayWarningTip?: boolean
}> = ({
    children,
    centered = false,
    header = false,
    className,
    maxWidth,
    style,
    sideComponent,
    screen = false,
    displayWarningTip = false,
}) => (
    <FullCenterContainer
        centered={centered}
        screen={screen}
        displayWarningTip={displayWarningTip}
    >
        <div className="flex-1 flex flex-col items-center">
            {header ? (
                <div className="mt-8 mb-4">
                    <LogoHeader />
                </div>
            ) : null}
            <div
                className={classnames(
                    "flex-1 flex flex-row w-full justify-center",
                    !screen && "my-4"
                )}
            >
                <div
                    className={classnames(
                        "flex-1 flex flex-col items-center shadow-lg bg-white",
                        screen ? "" : "rounded-md",
                        maxWidth || "max-w-2xl",
                        className
                    )}
                    style={style}
                >
                    {children}
                </div>
                {sideComponent}
            </div>
        </div>
    </FullCenterContainer>
)

export default PageLayout
