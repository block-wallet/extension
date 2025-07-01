const ChevronRightIcon = ({ className = "" }: { className?: string }) => {
    return (
        <svg
            width="8"
            height="12"
            viewBox="0 0 8 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`text-gray-400 dark:text-gray-500 transition-colors duration-200 ${className}`}
        >
            <path
                d="M7.39998 6.00039L1.99998 11.4004L0.599976 10.0004L4.59998 6.00039L0.599975 2.00039L1.99998 0.600391L7.39998 6.00039Z"
                fill="currentColor"
            />
        </svg>
    )
}

export default ChevronRightIcon
