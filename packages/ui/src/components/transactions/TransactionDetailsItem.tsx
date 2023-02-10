import { FC } from "react"
import classnames from "classnames"
import { DetailedItem } from "./TransactionDetailsList"
import { capitalize } from "../../util/capitalize"
import ExpandableText from "../ExpandableText"
import { formatNumberLength } from "../../util/formatNumberLength"
import GenericTooltip from "../label/GenericTooltip"

import openIcon from "../../assets/images/icons/open_external.svg"

const TransactionDetailItem: FC<{ item: DetailedItem }> = ({ item }) => {
    const isNativeValue =
        typeof item.value === "string" || typeof item.value === "number"
    return (
        <div
            className={classnames(
                "w-full",
                item.noSpace ? "" : "mt-3",
                item.expandable
                    ? ""
                    : "flex justify-between items-center space-x-1"
            )}
        >
            <span
                className="text-sm font-semibold text-ellipsis overflow-hidden whitespace-nowrap w-36"
                title={item.label}
            >
                {capitalize(item.label)}
            </span>
            {item.expandable ? (
                <ExpandableText className="text-gray-600 mt-1 w-fulltext-sm allow-select">
                    {item.value ?? "N/A"}
                </ExpandableText>
            ) : (
                <GenericTooltip
                    content={item.info ?? ""}
                    divFull={false}
                    className="!w-60 !break-word !whitespace-normal !border !z-50"
                >
                    <span
                        className={classnames(
                            "text-sm",
                            isNativeValue &&
                                "whitespace-nowrap text-ellipsis overflow-hidden text-gray-600 allow-select",
                            item.expandable ? "w-11/12 mt-1" : ""
                        )}
                        title={
                            isNativeValue && !item.info
                                ? `${item.value ?? "N/A"} ${
                                      item.unitName ?? ""
                                  }`
                                : undefined
                        }
                    >
                        {item.link ? (
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 flex items-center"
                            >
                                {item.value && isNativeValue
                                    ? item.decimals
                                        ? `${formatNumberLength(
                                              item.value as string,
                                              item.decimals,
                                              false
                                          )} ${item.unitName ?? ""}`
                                        : `${item.value} ${item.unitName ?? ""}`
                                    : item.value}
                                <img
                                    src={openIcon}
                                    alt="Open icon"
                                    className="w-3 h-3 ml-2"
                                />
                            </a>
                        ) : item.value && isNativeValue ? (
                            item.decimals ? (
                                `${formatNumberLength(
                                    item.value as string,
                                    item.decimals,
                                    false
                                )} ${item.unitName ?? ""}`
                            ) : (
                                `${item.value} ${item.unitName ?? ""}`
                            )
                        ) : (
                            item.value
                        )}
                    </span>
                </GenericTooltip>
            )}
        </div>
    )
}

export default TransactionDetailItem
