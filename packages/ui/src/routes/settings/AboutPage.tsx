import React from "react"

import PopupLayout from "../../components/popup/PopupLayout"
import PopupHeader from "../../components/popup/PopupHeader"
import AppVersion from "../../components/AppVersion"

import { IoLogoTwitter } from "react-icons/io"
import { HiGlobeAlt } from "react-icons/hi"
import { FaTelegramPlane } from "react-icons/fa"
import { GrReddit } from "react-icons/gr"
import logo from "../../assets/images/logo.svg"

const links = [
    {
        icon: <HiGlobeAlt className="w-5 h-5" />,
        link: "https://blockwallet.io",
        text: "blockwallet.io",
    },
    {
        icon: <FaTelegramPlane className="w-5 h-5" />,
        link: "https://t.me/blockwallet",
        text: "t.me/blockwallet",
    },
    {
        icon: <GrReddit className="w-5 h-5" />,
        link: "https://www.reddit.com/r/BlankWallet/",
        text: "reddit.com/blockwallet",
    },
    {
        icon: <IoLogoTwitter className="w-5 h-5" />,
        link: "https://twitter.com/GetBlockWallet",
        text: "blockwallet.io",
    },
]
const AboutPage = () => {
    return (
        <PopupLayout header={<PopupHeader title={"About"} close="/" />}>
            <div className="space-y-6 p-6">
                <div className="rounded border border-gray-200 p-4">
                    <div className="flex items-center">
                        <img
                            src={logo}
                            alt="Blockwallet logo"
                            className="w-5 h-5"
                        />
                        <span className="ml-2 text-lg font-bold">
                            BlockWallet
                        </span>
                    </div>
                    <p className="mt-4">
                        BlockWallet is the most private, non-custodial browser
                        extension wallet where users can store funds and
                        interact with their favorite blockchain applications
                        anonymously.
                    </p>
                    <p>Join us today and reclaim your privacy.</p>
                    <div className="mt-4">
                        <AppVersion />
                    </div>
                </div>
                <div className="rounded border border-gray-200 p-4">
                    <span className="text-lg font-bold">Contacts</span>
                    <div className="space-y-4 mt-4">
                        {links.map(({ text, link, icon }) => (
                            <a
                                href={link}
                                target="_blank"
                                className="text-base font-bold hover:underline flex items-center"
                                rel="noopener noreferrer"
                            >
                                {icon}
                                <span className="ml-2">{text}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AboutPage
