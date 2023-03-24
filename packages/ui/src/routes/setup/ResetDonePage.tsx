import { useEffect, useState } from "react"

import Confetti from "react-dom-confetti"
import { IoLogoTwitter } from "react-icons/io"
import { FaGithub, FaTelegramPlane } from "react-icons/fa"

import LogoHeader from "../../components/LogoHeader"
import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"

import { completeSetup } from "../../context/commActions"

import logo from "../../assets/images/logo.svg"
import { LINKS } from "../../util/constants"

const links = [
    {
        icon: <FaGithub className="w-5 h-5" />,
        link: LINKS.GITHUB,
    },
    {
        icon: <IoLogoTwitter className="w-5 h-5" />,
        link: LINKS.TWITTER,
    },
    {
        icon: <FaTelegramPlane className="w-5 h-5" />,
        link: LINKS.TELEGRAM,
    },
]

const ResetDonePage = () => {
    const [confettiActive, setConfettiActive] = useState(false)
    useEffect(() => {
        setConfettiActive(true)
        completeSetup()
    }, [])
    const config = {
        angle: 90,
        spread: 360,
        startVelocity: 40,
        elementCount: 70,
        dragFriction: 0.12,
        duration: 3000,
        stagger: 3,
        width: "10px",
        height: "10px",
        perspective: "500px",
        colors: ["#000", "#333", "#666"],
    }
    return (
        <>
            <div className="absolute w-full h-full flex flex-row items-center justify-center overflow-hidden z-10">
                <Confetti active={confettiActive} config={config} />
            </div>
            <PageLayout header centered className="relative overflow-hidden">
                <div className="flex flex-col items-center relative py-14 z-10">
                    <div className="flex flex-col items-center my-12 space-y-6">
                        <span className="font-semibold text-5xl">
                            Reset completed!
                        </span>
                        <div className="flex flex-col items-center space-x-1 w-92 px-4 mx-auto text-primary-grey-dark text-base text-center leading-loose">
                            <span>
                                You can start using BlockWallet again.
                                <br />
                                Access your wallet by clicking on the extension
                                icon on your browser.
                            </span>
                            <Divider className="text-primary-grey-default my-6" />
                            <span>
                                Keep track of updates or ask us anything on
                                Twitter or Telegram.
                            </span>
                            <div className="flex space-x-4 text-black mt-4">
                                {links.map(({ link, icon }) => (
                                    <a
                                        href={link}
                                        target="_blank"
                                        className="text-sm font-semibold hover:underline flex items-center"
                                        rel="noopener noreferrer"
                                    >
                                        {icon}
                                    </a>
                                ))}
                            </div>
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

export default ResetDonePage
