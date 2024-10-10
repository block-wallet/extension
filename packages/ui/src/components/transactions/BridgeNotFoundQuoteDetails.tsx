import { FunctionComponent } from "react"
import Dialog from "../dialog/Dialog"
import CloseIcon from "../icons/CloseIcon"
import Divider from "../Divider"
import { Classes, classnames } from "../../styles"
import BridgeErrorDisplay from "../../components/bridge/BridgeQuoteNotFoundErrorDetails"
import { GetBridgeQuoteNotFoundResponse } from "@block-wallet/background/controllers/BridgeController"
import openIcon from "../../assets/images/icons/open_external.svg"
import download from "../../assets/images/icons/download.svg"
import { LINKS } from "../../util/constants"

export type BridgeNotFoundQuoteErrorsProps = {
    open: boolean
    onClose: () => void
    details: GetBridgeQuoteNotFoundResponse
}

export type BridgeError = {
    code: string
    type: string
    message: string
    fromToken: string
    toToken: string
}

export const BridgeNotFoundQuoteDetails: FunctionComponent<
    BridgeNotFoundQuoteErrorsProps
> = ({ open, onClose, details }) => {
    let errorsByTool = new Map<string, BridgeError[]>()

    details.errors.failed.forEach((error) => {
        Object.values(error.subpaths).forEach((subpaths) => {
            subpaths.forEach((subpath) => {
                const err = {
                    code: subpath.code,
                    type: subpath.tool,
                    message: subpath.message,
                    fromToken: subpath.action.fromToken.symbol,
                    toToken: subpath.action.toToken.symbol,
                }
                if (errorsByTool.has(subpath.tool)) {
                    errorsByTool.get(subpath.tool)?.push(err)
                } else {
                    errorsByTool.set(subpath.tool, [err])
                }
            })
        })
    })
    return (
        <Dialog open={open} onClickOutside={onClose}>
            <span className="absolute top-0 right-0 p-4 z-50">
                <div
                    onClick={onClose}
                    className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                >
                    <CloseIcon size="10" />
                </div>
            </span>

            <div className="flex flex-col w-full h-full">
                <h2 className="px-2 pr-0 pb-4 mt-2 text-lg font-semibold">
                    Unable to generate a quote
                </h2>
                <Divider />
                <div
                    className="flex flex-col h-[17rem] justify-between overflow-auto py-4 -ml-3 px-3"
                    style={{ width: "calc(100% + 1.5rem)" }}
                >
                    <div className="p-1">
                        <span className="text-sm font-semibold">Summary</span>
                        <div className="mt-2">{details.message}</div>

                        {errorsByTool && errorsByTool.size > 0 && (
                            <>
                                <div className="py-3">
                                    <Divider />
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <main className="p-1">
                                        <span className="text-sm font-semibold">
                                            Errors by tool
                                        </span>
                                        <br />
                                        <div className="flex flex-col">
                                            {Array.from(
                                                errorsByTool.keys()
                                            ).map((tool, i) => {
                                                const errors =
                                                    errorsByTool.get(tool)
                                                return (
                                                    errors && (
                                                        <div
                                                            className="mt-2"
                                                            key={i}
                                                        >
                                                            <BridgeErrorDisplay
                                                                tool={tool}
                                                                bridgeError={
                                                                    errors
                                                                }
                                                            />
                                                        </div>
                                                    )
                                                )
                                            })}
                                        </div>
                                    </main>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex w-full items-center justify-between mt-2">
                        <a
                            href={LINKS.ARTICLES.BRIDGES}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-row items-center space-x-2 text-xs font-semibold text-primary-blue-default"
                        >
                            <span>Read about bridges</span>
                            <img
                                src={openIcon}
                                alt="Open icon"
                                className="w-3 h-3"
                            />
                        </a>{" "}
                        <a
                            href={`data:text/json;chatset=utf-8,${encodeURIComponent(
                                JSON.stringify(details)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={"quote_not_found.json"}
                            className="flex flex-row items-center space-x-2 text-xs font-semibold text-primary-blue-default"
                        >
                            <span>Download report</span>
                            <img
                                src={download}
                                alt="Download icon"
                                className="w-3 h-3"
                            />
                        </a>
                    </div>
                </div>
            </div>
            <div className="-mx-3">
                <Divider />
            </div>
            <div className="-mx-3">
                <Divider />
            </div>
            <button
                onClick={onClose}
                className={classnames(Classes.liteButton, "mt-4")}
                type="button"
            >
                Close
            </button>
        </Dialog>
    )
}

export default BridgeNotFoundQuoteDetails
