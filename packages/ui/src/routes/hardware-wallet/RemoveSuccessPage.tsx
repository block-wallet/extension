import LogoHeader from "../../components/LogoHeader"
import PageLayout from "../../components/PageLayout"

import logo from "../../assets/images/logo.svg"
import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { capitalize } from "../../util/capitalize"

const HardwareWalletRemoveSuccessPage = () => {
    const history = useOnMountHistory()!
    const vendor = history.location.state.vendor as Devices
    const vendorName = capitalize(vendor.toString().toLowerCase())

    return (
        <>
            <PageLayout
                centered
                className="relative overflow-hidden"
                displayWarningTip={true}
            >
                <div className="flex flex-col items-center relative py-14 z-10">
                    <LogoHeader />
                    <div className="flex flex-col items-center my-12 space-y-6">
                        <span className="font-title font-semibold text-5xl text-center">
                            {vendorName}
                            {" removed!"}
                        </span>
                        <div className="flex flex-col md:flex-row items-center space-x-1 w-92 px-4 md:px-0 md:w-full mx-auto text-gray-600 text-sm text-center leading-loose justify-center">
                            <span>
                                Your {vendorName} accounts were removed
                                successfully.
                                <br />
                                You can't access them anymore from BlockWallet.
                                <br />
                                If you'd like to, you can import them again.
                            </span>
                        </div>
                    </div>
                </div>
                <div
                    className="absolute w-64 h-64 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5"
                    style={{
                        color: "blue",
                        background: `url(${logo})`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                    }}
                />
            </PageLayout>
        </>
    )
}

export default HardwareWalletRemoveSuccessPage
