import { FunctionComponent, PropsWithChildren } from "react"
import infoIcon from "../assets/images/icons/info_circle.svg"
import { classnames } from "../styles"

const InfoComponent: FunctionComponent<
    PropsWithChildren<{ className?: string }>
> = ({ children, className }) => (
    <div
        className={classnames(
            "flex flex-row items-start space-x-2 text-xs text-primary-grey-dark",
            className
        )}
    >
        <img
            src={infoIcon}
            alt="info"
            className="w-3 h-3 mt-1"
            draggable={false}
        />
        <span>{children}</span>
    </div>
)

export default InfoComponent
