import classnames from "classnames"

const GroupIcon: React.FC<{ className: string }> = ({ className }) => {
    return (
        <svg
            width="16"
            height="14"
            viewBox="0 0 16 14"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M9 14H7C6.448 14 6 13.552 6 13C6 12.448 6.448 12 7 12H9C9.552 12 10 12.448 10 13C10 13.552 9.552 14 9 14Z" />
            <path d="M11 10H5C4.448 10 4 9.552 4 9C4 8.448 4.448 8 5 8H11C11.552 8 12 8.448 12 9C12 9.552 11.552 10 11 10Z" />
            <path d="M13 6H3C2.448 6 2 5.552 2 5C2 4.448 2.448 4 3 4H13C13.552 4 14 4.448 14 5C14 5.552 13.552 6 13 6Z" />
            <path d="M15 2H1C0.448 2 0 1.552 0 1C0 0.448 0.448 0 1 0H15C15.552 0 16 0.448 16 1C16 1.552 15.552 2 15 2Z" />
        </svg>
    )
}

export default GroupIcon
