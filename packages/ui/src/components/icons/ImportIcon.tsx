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
                d="M1.66663 13.332V18.332H18.3333V13.332"
                stroke="#0A121E"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
            <path
                d="M10 1.66602V14.166"
                stroke="#1673FF"
                strokeWidth="2"
                strokeMiterlimit="10"
            />
            <path
                d="M15 9.16602L10 14.166L5 9.16602"
                stroke="#1673FF"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
        </svg>
    )
}

export default ImportIcon
