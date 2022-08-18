import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import LinkButton from "../components/button/LinkButton"
import logo from "../assets/images/logo.svg"
import PopupFooter from "../components/popup/PopupFooter"

const BackupDonePage = () => {
    return (
        <PopupLayout
            header={<PopupHeader title="You’re Now Safe!" backButton={false} />}
            footer={
                <PopupFooter>
                    <LinkButton location="/" text="Done" lite />
                </PopupFooter>
            }
        >
            <div className="flex flex-col items-center justify-center w-full h-full space-y-6 p-6">
                <span className=" text-center font-base font-semibold text-base">
                    You’ve successfully backed your seed phrase.
                </span>
                <img src={logo} alt="logo" className="w-12 h-12 mx-auto" />
                <span className="font-base text-center text-sm">
                    You can now continue using BlockWallet.
                </span>
            </div>
        </PopupLayout>
    )
}

export default BackupDonePage
