import classnames from "classnames"
const ThreeDotsIcon: React.FC<any> = ({ className }) => {
    return (
        <svg
            width="4"
            height="12"
            viewBox="0 0 4 12"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1.99998 6.66663C2.36817 6.66663 2.66665 6.36815 2.66665 5.99996C2.66665 5.63177 2.36817 5.33329 1.99998 5.33329C1.63179 5.33329 1.33331 5.63177 1.33331 5.99996C1.33331 6.36815 1.63179 6.66663 1.99998 6.66663Z"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
            />
            <path
                d="M1.99998 1.99996C2.36817 1.99996 2.66665 1.70148 2.66665 1.33329C2.66665 0.965103 2.36817 0.666626 1.99998 0.666626C1.63179 0.666626 1.33331 0.965103 1.33331 1.33329C1.33331 1.70148 1.63179 1.99996 1.99998 1.99996Z"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
            />
            <path
                d="M1.99998 11.3333C2.36817 11.3333 2.66665 11.0348 2.66665 10.6666C2.66665 10.2984 2.36817 9.99996 1.99998 9.99996C1.63179 9.99996 1.33331 10.2984 1.33331 10.6666C1.33331 11.0348 1.63179 11.3333 1.99998 11.3333Z"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
            />
        </svg>
    )
}

export default ThreeDotsIcon
