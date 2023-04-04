import classnames from "classnames"

const EmptyDrawer: React.FC<{ className: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 88 88"
            fill="none"
            className={classnames("w-20 h-20", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0_1_908)">
                <path
                    d="M21 19H12.5L2 51H86L75.5 19H67"
                    stroke="#08090A"
                    stroke-width="4"
                />
                <path
                    d="M86 51H2V86H86V51Z"
                    stroke="#08090A"
                    stroke-width="4"
                />
                <path d="M65 64H24V74H65V64Z" fill="#3742F7" />
                <path
                    d="M69 51.5V2H19V51.5"
                    stroke="#08090A"
                    stroke-width="4"
                    stroke-dasharray="5 5"
                />
                <path d="M44 11V29.5" stroke="#08090A" stroke-width="4" />
                <path d="M44 36V41" stroke="#08090A" stroke-width="4" />
            </g>
            <defs>
                <clipPath id="clip0_1_908">
                    <rect width="88" height="88" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default EmptyDrawer
