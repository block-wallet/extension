import PopupLayout from "../../components/popup/PopupLayout"
import PopupHeader from "../../components/popup/PopupHeader"
import AppVersion from "../../components/AppVersion"

import { IoLogoTwitter } from "react-icons/io"
import { HiGlobeAlt } from "react-icons/hi"
import { FaTelegramPlane } from "react-icons/fa"
import { RiDiscordFill } from "react-icons/ri"
import { BsShield, BsLightning, BsEye, BsChevronRight, BsHeart, BsCode } from "react-icons/bs"

import { LINKS } from "../../util/constants"
import logo from "../../assets/images/logo.svg"

const links = [
    {
        icon: <HiGlobeAlt className="w-5 h-5" />,
        link: LINKS.WEBSITE,
        text: "BlockWallet Website",
        description: "Visit our official website for more information"
    },
    {
        icon: <FaTelegramPlane className="w-5 h-5" />,
        link: LINKS.TELEGRAM,
        text: "Telegram Group",
        description: "Join our community chat for support and discussions"
    },
    {
        icon: <RiDiscordFill className="w-5 h-5" />,
        link: LINKS.DISCORD,
        text: "Discord Server",
        description: "Connect with the community on Discord"
    },
    {
        icon: <IoLogoTwitter className="w-5 h-5" />,
        link: LINKS.TWITTER,
        text: "Twitter",
        description: "Follow us for updates and announcements"
    },
]

const features = [
    {
        icon: <BsShield className="w-5 h-5 text-green-500 dark:text-green-400" />,
        title: "Privacy First",
        description: "Advanced privacy features including Tor integration and transaction mixing"
    },
    {
        icon: <BsLightning className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />,
        title: "Lightning Fast",
        description: "Optimized performance for smooth Web3 interactions"
    },
    {
        icon: <BsEye className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
        title: "User Focused",
        description: "Intuitive interface designed for both beginners and experts"
    },
]

const AboutPage = () => {
    const openExternalLink = (url: string) => {
        const anchor = document.createElement("a")
        Object.assign(anchor, {
            target: "_blank",
            href: url,
            rel: "noopener noreferrer",
        }).click()
    }

    return (
        <PopupLayout header={<PopupHeader title={"About"} close="/" />}>
            <div className="flex flex-col p-6 space-y-6">
                {/* Brand Section */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl border border-blue-200 dark:border-gray-600">
                    <div className="flex items-center mb-4">
                        <img
                            src={logo}
                            alt="BlockWallet logo"
                            className="w-8 h-8"
                        />
                        <span className="ml-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
                            BlockWallet
                        </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                        BlockWallet sets you free! Everything you need for a secure,
                        private and productive Web3 experience in one lightweight package.
                    </p>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <AppVersion />
                    </div>
                </div>

                {/* Key Features Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <BsLightning className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
                        Why BlockWallet?
                    </h3>

                    <div className="grid gap-3">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start space-x-3">
                                    {feature.icon}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                            {feature.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Community & Support Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <BsHeart className="w-5 h-5 mr-2 text-red-500 dark:text-red-400" />
                        Community & Support
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Connect with our community for support, updates, and discussions.
                    </p>

                    <div className="space-y-3">
                        {links.map((link, index) => (
                            <button
                                key={index}
                                onClick={() => openExternalLink(link.link)}
                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                                        {link.icon}
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {link.text}
                                        </span>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                            {link.description}
                                        </span>
                                    </div>
                                </div>
                                <BsChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Open Source & Development */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start space-x-3">
                        <BsCode className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                                Open Source & Transparent
                            </h4>
                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <p>• <span className="font-medium">Fully Open Source:</span> Code is publicly auditable and transparent</p>
                                <p>• <span className="font-medium">Community Driven:</span> Built with feedback from the Web3 community</p>
                                <p>• <span className="font-medium">Privacy Focused:</span> No tracking, no data collection, no compromises</p>
                                <p>• <span className="font-medium">Continuous Innovation:</span> Regular updates with new features and improvements</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support & Resources */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            📚 Additional Resources
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <p>• <span className="font-medium">Documentation:</span> Comprehensive guides and tutorials available online</p>
                            <p>• <span className="font-medium">Security Audits:</span> Regular security reviews and audits by third parties</p>
                            <p>• <span className="font-medium">Bug Reports:</span> Report issues through our community channels</p>
                            <p>• <span className="font-medium">Feature Requests:</span> Suggest improvements via our feedback channels</p>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AboutPage
