import classnames from "classnames"

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-5 h-5", className)}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0_1_725)">
                <g filter="url(#filter0_d_1_725)">
                    <path
                        d="M5.00016 2.5H2.50016C1.57933 2.5 0.833496 3.24583 0.833496 4.16667C0.833496 5.0875 1.57933 5.83333 2.50016 5.83333"
                        stroke="#08090A"
                        stroke-width="2"
                        stroke-miterlimit="10"
                        stroke-linecap="square"
                    />
                    <path
                        d="M5 5.83398V0.833984H16.6667V5.83398"
                        stroke="#08090A"
                        stroke-width="2"
                        stroke-miterlimit="10"
                        stroke-linecap="square"
                    />
                    <path
                        d="M19.1668 5.83464H2.50016C1.57933 5.83464 0.833496 5.0888 0.833496 4.16797V16.668C0.833496 18.0488 1.95266 19.168 3.3335 19.168H19.1668V5.83464Z"
                        stroke="#08090A"
                        stroke-width="2"
                        stroke-miterlimit="10"
                        stroke-linecap="square"
                    />
                    <path
                        d="M14.1667 14.1673C15.0871 14.1673 15.8333 13.4211 15.8333 12.5007C15.8333 11.5802 15.0871 10.834 14.1667 10.834C13.2462 10.834 12.5 11.5802 12.5 12.5007C12.5 13.4211 13.2462 14.1673 14.1667 14.1673Z"
                        stroke="#08090A"
                        stroke-width="2"
                        stroke-miterlimit="10"
                        stroke-linecap="square"
                    />
                </g>
            </g>
            <defs>
                <filter
                    id="filter0_d_1_725"
                    x="-4.1665"
                    y="-0.166016"
                    width="28.3335"
                    height="28.334"
                    filterUnits="userSpaceOnUse"
                    color-interpolation-filters="sRGB"
                >
                    <feBlend
                        mode="normal"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_1_725"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_1_725"
                        result="shape"
                    />
                </filter>
                <clipPath id="clip0_1_725">
                    <rect width="20" height="20" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default WalletIcon
