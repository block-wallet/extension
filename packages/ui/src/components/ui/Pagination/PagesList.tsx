import { PropsWithChildren } from "react"
import classnames from "classnames"

const PageButton: React.FC<
    PropsWithChildren<{
        onClick: () => void
        selected: boolean
        disabled?: boolean
    }>
> = ({ children, onClick, selected, disabled }) => {
    return (
        <div
            className={classnames(
                "text-sm p-3",
                selected
                    ? "text-gray-800 font-semibold cursor-default"
                    : "text-primary-grey-dark cursor-pointer hover:text-gray-800 ",
                disabled && "text-primary-grey-dark !cursor-not-allowed"
            )}
            onClick={!disabled ? onClick : void 0}
        >
            {children}
        </div>
    )
}

const StickyFirstPage = ({
    currentPage,
    onClick,
    disabled,
}: {
    currentPage: number
    disabled?: boolean
    onClick: () => void
}) => {
    if (currentPage === 1) {
        return null
    }

    const button = (
        <PageButton selected={false} onClick={onClick} disabled={disabled}>
            1
        </PageButton>
    )

    if (currentPage === 2) {
        return button
    }

    return (
        <>
            {button}
            <span className="font-semibold text-sm p-3">...</span>
        </>
    )
}

const PagesList = ({
    stickyFirstPage,
    pages,
    currentPage,
    disabled,
    onChangePage,
}: {
    stickyFirstPage?: boolean
    disabled?: boolean
    pages: number
    currentPage: number
    onChangePage: (page: number) => void
}) => {
    let pagesToShow = pages
    if (currentPage === 2) {
        pagesToShow -= 1
    } else if (currentPage > 2) {
        pagesToShow -= 2
    }
    return (
        <div className="flex flex-row">
            {stickyFirstPage && (
                <StickyFirstPage
                    currentPage={currentPage}
                    disabled={disabled}
                    onClick={() => onChangePage(1)}
                />
            )}
            {Array.from(Array(pagesToShow).keys()).map((page) => {
                const pageNumber = page + currentPage
                return (
                    <PageButton
                        selected={currentPage === pageNumber}
                        key={pageNumber}
                        onClick={() => onChangePage(pageNumber)}
                        disabled={disabled}
                    >
                        {pageNumber}
                    </PageButton>
                )
            })}
        </div>
    )
}

export default PagesList
