import { PropsWithChildren } from "react"
import classnames from "classnames"
import arrow from "../../../assets/images/icons/arrow_down.svg"
import PagesList from "./PagesList"

const PageControlButton: React.FC<
    PropsWithChildren<{
        onClick: () => void
        disabled?: boolean
    }>
> = ({ children, onClick, disabled }) => {
    return (
        <button
            className={classnames(
                "border rounded-md border-primary-200 hover:border-primary-blue-default p-3 cursor-pointer items-center",
                "disabled:border-primary-grey-hover disabled:pointer-events-none disabled:cursor-default disabled:bg-gray-100"
            )}
            onClick={onClick}
            disabled={disabled}
            style={{ height: "38px" }}
        >
            {children}
        </button>
    )
}

const Previous: React.FC<{
    currentPage: number
    disabled?: boolean
    onChangePage: (nextPage: number) => void
}> = ({ currentPage, onChangePage, disabled }) => {
    const isDisabled = disabled || currentPage === 1
    return (
        <PageControlButton
            onClick={() =>
                !isDisabled ? onChangePage(currentPage - 1) : void 0
            }
            disabled={isDisabled}
        >
            <img src={arrow} alt="Previous" className="rotate-90" />
        </PageControlButton>
    )
}

const Next: React.FC<{
    currentPage: number
    disabled?: boolean
    onChangePage: (nextPage: number) => void
}> = ({ currentPage, onChangePage, disabled }) => {
    return (
        <PageControlButton
            onClick={() => (!disabled ? onChangePage(currentPage + 1) : void 0)}
            disabled={disabled}
        >
            <img src={arrow} alt="Next" className="-rotate-90" />
        </PageControlButton>
    )
}

const PaginationControls: React.FC<{
    disabled?: boolean
    stickyFirstPage?: boolean
    pages: number
    currentPage: number
    onChangePage: (nextPage: number) => void
    className?: string
    showArrows?: boolean
}> = ({
    pages,
    stickyFirstPage,
    currentPage,
    onChangePage,
    disabled,
    className,
    showArrows = true,
}) => {
    return (
        <div
            className={classnames(
                "flex justify-evenly items-center",
                className
            )}
        >
            {showArrows && (
                <Previous
                    disabled={disabled}
                    currentPage={currentPage}
                    onChangePage={onChangePage}
                />
            )}
            <div className="fullscreen-x-scrollbar" style={{ maxWidth: 230 }}>
                <PagesList
                    disabled={disabled}
                    stickyFirstPage={stickyFirstPage}
                    pages={pages}
                    currentPage={currentPage}
                    onChangePage={onChangePage}
                />
            </div>
            {showArrows && (
                <Next
                    disabled={disabled}
                    currentPage={currentPage}
                    onChangePage={onChangePage}
                />
            )}
        </div>
    )
}

export default PaginationControls
