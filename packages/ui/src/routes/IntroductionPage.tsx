import { Link } from "react-router-dom"

import { Classes, classnames } from "../styles/classes"
import PageLayout from "../components/PageLayout"
import logo from "../assets/images/logo.svg"

const IntroductionPage = () => (
    <PageLayout header className="relative overflow-hidden">
        <div className="flex flex-col items-center relative my-10 mx-18 z-10">
            <div className="flex flex-col items-center my-12 space-y-6">
                <span className="font-title font-semibold text-5xl">
                    Welcome to BlockWallet
                </span>
                <div className="flex flex-col md:flex-row items-center space-x-1 w-52 md:w-full mx-auto text-gray-600 text-lg justify-center text-center">
                    <span>Protecting you on Web3 without compromises.</span>
                </div>
            </div>
            <Link
                to="/setup"
                className={classnames(Classes.button, "font-semibold")}
            >
                Get Started
            </Link>
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
)

export default IntroductionPage
