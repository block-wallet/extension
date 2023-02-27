import logo from "../assets/images/logo.svg"

const LogoHeader = () => (
    <div className="flex flex-row items-center space-x-1 text-primary-black-default">
        <img src={logo} alt="logo" className="w-6 h-6 rounded-md" />
        <span className="font-bold text-2xl">BlockWallet</span>
    </div>
)

export default LogoHeader
