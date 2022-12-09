const SwitchIcon: React.FC<{ className?: string }> = (
    { className } = { className: "w-4 h-4" }
) => {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="current"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0_265_2)">
                <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M11.1677 11.9997L7.14648 16.0137H9.96283L15.9961 9.99965H-3.91006e-05V11.9997H11.1677Z"
                    fill="black"
                />
                <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M4.82843 4.01402L8.84961 0H6.03327L0 6.01402H15.9961V4.01402H4.82843Z"
                    fill="black"
                />
            </g>
            <defs>
                <clipPath id="clip0_265_2">
                    <rect width="16" height="16" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default SwitchIcon
