import PopupLayout from "../../components/popup/PopupLayout"
import PopupHeader from "../../components/popup/PopupHeader"
import AppVersion from "../../components/AppVersion"

import { IoLogoTwitter } from "react-icons/io"
import { HiGlobeAlt } from "react-icons/hi"
import { FaTelegramPlane } from "react-icons/fa"
import { RiDiscordFill } from "react-icons/ri"

import { LINKS } from "../../util/constants"
import logo from "../../assets/images/logo.svg"
import VerticalSelect from "../../components/input/VerticalSelect"

const links = [
    {
        icon: <HiGlobeAlt className="w-[22px] h-[22px]" />,
        link: LINKS.WEBSITE,
        text: "BlockWallet Website",
    },
    {
        icon: <FaTelegramPlane className="w-[22px] h-[22px]" />,
        link: LINKS.TELEGRAM,
        text: "Telegram Group Chat",
    },
    {
        icon: <RiDiscordFill className="w-[22px] h-[22px]" />,
        link: LINKS.DISCORD,
        text: "Discord Server",
    },
    {
        icon: <IoLogoTwitter className="w-[22px] h-[22px]" />,
        link: LINKS.TWITTER,
        text: "Twitter",
    },
]
const AboutPage = () => {
    return (
        <PopupLayout header={<PopupHeader title={"About"} close="/" />}>
            <div className="space-y-4 p-6 py-4">
                <div>
                    <div className="flex items-center">
                        <img
                            src={logo}
                            alt="Blockwallet logo"
                            className="w-5 h-5"
                        />
                        <span className="ml-2 text-lg font-semibold">
                            BlockWallet
                        </span>
                    </div>
                    <p className="mt-4 text-[14px] leading-6 text-primary-black-default opacity-90">
                        BlockWallet sets you free! Everything you need for a
                        secure, private and productive Web3 experience in one
                        lightweight package.
                    </p>
                    <div className="mt-4">
                        <AppVersion />
                    </div>
                </div>
                <div>
                    <div className="space-y-4 mt-4">
                        <VerticalSelect
                            options={links}
                            value={undefined}
                            containerClassName="flex flex-col space-y-4"
                            display={(option) => {
                                return (
                                    <a
                                        href={option.link}
                                        target="_blank"
                                        className="text-sm font-semibold flex items-center"
                                        rel="noopener noreferrer"
                                    >
                                        <div className="flex flex-row space-x-3 items-center text-gray-900">
                                            {option.icon}
                                            <span className="font-semibold">
                                                {option.text}
                                            </span>
                                        </div>
                                    </a>
                                )
                            }}
                        />
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AboutPage
