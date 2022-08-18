import classnames from "classnames"

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-5 h-5", className)}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clipPath="url(#clip0_6587_220)">
                <path
                    d="M5.00004 2.5H2.50004C1.57921 2.5 0.833374 3.24583 0.833374 4.16667C0.833374 5.0875 1.57921 5.83333 2.50004 5.83333"
                    stroke="#0A121E"
                    strokeWidth="2"
                    strokeMiterlimit="10"
                    strokeLinecap="square"
                />
                <path
                    d="M5 5.83398V0.833984H16.6667V5.83398"
                    stroke="#0A121E"
                    strokeWidth="2"
                    strokeMiterlimit="10"
                    strokeLinecap="square"
                />
                <path
                    d="M19.1667 5.83464H2.50004C1.57921 5.83464 0.833374 5.0888 0.833374 4.16797V16.668C0.833374 18.0488 1.95254 19.168 3.33337 19.168H19.1667V5.83464Z"
                    stroke="#0A121E"
                    strokeWidth="2"
                    strokeMiterlimit="10"
                    strokeLinecap="square"
                />
                <path
                    d="M14.1667 14.1673C15.0871 14.1673 15.8333 13.4211 15.8333 12.5007C15.8333 11.5802 15.0871 10.834 14.1667 10.834C13.2462 10.834 12.5 11.5802 12.5 12.5007C12.5 13.4211 13.2462 14.1673 14.1667 14.1673Z"
                    stroke="#1673FF"
                    strokeWidth="2"
                    strokeMiterlimit="10"
                    strokeLinecap="square"
                />
            </g>
            <defs>
                <clipPath id="clip0_6587_220">
                    <rect width="20" height="20" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default WalletIcon
