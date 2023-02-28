import { FunctionComponent } from "react"
import logo from "../assets/images/logo.svg"
import { classnames } from "../styles"

const LogoHeader: FunctionComponent<{
    className?: string
}> = ({ className }) => (
    <div
        className={classnames(
            "flex flex-row items-center space-x-1 text-primary-black-default",
            className
        )}
    >
        <img src={logo} alt="logo" className="w-6 h-6 rounded-md" />
        <span className="font-bold text-2xl">BlockWallet</span>
    </div>
)

export default LogoHeader
