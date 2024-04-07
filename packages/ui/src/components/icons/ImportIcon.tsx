import classnames from "classnames"

const ImportIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-5 h-5", className)}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1.6665 13.332V18.332H18.3332V13.332"
                stroke="#08090A"
                stroke-width="2"
                stroke-miterlimit="10"
                stroke-linecap="square"
            />
            <path
                d="M10 1.66602V14.166"
                stroke="#08090A"
                stroke-width="2"
                stroke-miterlimit="10"
            />
            <path
                d="M15 9.16602L10 14.166L5 9.16602"
                stroke="#08090A"
                stroke-width="2"
                stroke-miterlimit="10"
                stroke-linecap="square"
            />
        </svg>
    )
}

export default ImportIcon
