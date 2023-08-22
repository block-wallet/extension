const OrderIcon: React.FC<{ className?: string }> = (
    { className } = { className: "w-8 h-8" }
) => {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M2.5 6H17.5"
                stroke="#08090A"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="round"
            />
            <path
                d="M2.5 10H17.5"
                stroke="#08090A"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="round"
            />
            <path
                d="M2.5 14H17.5"
                stroke="#08090A"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="round"
            />
            <path
                d="M7.5 3.45452L10 1L12.5 3.45452"
                stroke="#08090A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12.5 16.5452L10 18.9997L7.5 16.5452"
                stroke="#08090A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default OrderIcon
