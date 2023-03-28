import { useEffect, useRef, useState } from "react"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { MaxUint256 } from "@ethersproject/constants"
import * as yup from "yup"
import { AiFillInfoCircle } from "react-icons/ai"

import { Classes } from "../../styles"
import ErrorMessage from "../error/ErrorMessage"
import Dialog from "../dialog/Dialog"
import CloseIcon from "../icons/CloseIcon"
import { formatRoundedUp } from "../../util/formatRounded"

const UNLIMITED_ALLOWANCE = MaxUint256

// Schema
const getAllowanceAmountYupSchema = (
    tokenDecimals: number,
    minAllowance: BigNumber,
    currentAllowance?: BigNumber
) => {
    return yup.object({
        allowanceAmount: yup
            .string()
            .test(
                "req",
                "Please enter an allowance amount",
                (value?: string) => {
                    if (!value) return false
                    return true
                }
            )
            .test(
                "decimals",
                "Value has too many decimal numbers",
                (value?: string) => {
                    if (!value) return false
                    if (!value.includes(".")) return true

                    const valueDecimals = value.split(".")[1].length

                    return valueDecimals <= tokenDecimals
                }
            )
            .test(
                "equal-current",
                "Value is the same as current allowance",
                (value?: string) => {
                    if (!value) return false
                    try {
                        if (!currentAllowance) return true
                        const parsed = parseUnits(value, tokenDecimals)
                        return !BigNumber.from(currentAllowance).eq(parsed)
                    } catch (error) {
                        return false
                    }
                }
            )
            .test(
                "too-low",
                `Value is less than the minimum allowance (${formatUnits(
                    minAllowance,
                    tokenDecimals
                )})`,
                (value?: string) => {
                    if (!value) return false
                    try {
                        const parsed = parseUnits(value, tokenDecimals)

                        return minAllowance.lte(parsed)
                    } catch (error) {
                        return false
                    }
                }
            )
            .test(
                "too-large",
                "Value is larger than the unlimited allowance",
                (value?: string) => {
                    if (!value) return false
                    try {
                        const parsed = parseUnits(value, tokenDecimals)

                        return UNLIMITED_ALLOWANCE.gte(parsed)
                    } catch (error) {
                        return false
                    }
                }
            ),
    })
}

const optionsText = [
    {
        title: "Unlimited:",
        description:
            "Spender can automate any transaction with any amount. Best for frequent actions.",
    },
    {
        title: "Custom:",
        description:
            "Specify the max value the spender can automate each time. Best for one time use.",
    },
    {
        title: "Revoke:",
        description:
            "Set allowance to 0. Spender will no longer be able to automate your transactions.",
    },
]

/**
 *
 * Allowance Amount input component
 *
 * @param onChange - function to call when the input changes
 * @param setIsValid - function to set if the input is valid or invalid
 * @param tokenDecimals - token decimals
 * @param tokenName - token name
 * @param defaultValue - default value for the input
 * @param minimumAllowance - minimum allowance for the input (used for validations)
 * @param currentAllowance - current allowance (used for validations)
 *
 */
const AllowanceInput = ({
    onChange,
    setIsValid,
    tokenDecimals,
    tokenName,
    defaultValue,
    minimumAllowance = BigNumber.from(0),
    currentAllowance,
}: {
    onChange: (value: string) => void
    setIsValid: (value: boolean) => void
    tokenDecimals: number
    tokenName: string
    defaultValue: string
    minimumAllowance?: BigNumber
    currentAllowance?: BigNumber
}) => {
    const [allowanceAmount, setAllowanceAmount] = useState(
        formatRoundedUp(formatUnits(defaultValue, tokenDecimals))
    )
    const [error, setError] = useState("")

    const [usingUnlimited, setUsingUnlimited] = useState(false)
    const [usingRevoke, setUsingRevoke] = useState(false)

    const [showOptionsInfo, setShowOptionsInfo] = useState(false)

    const [inputFocus, setInputFocus] = useState(false)
    const inputRef = useRef(null)

    // Validator
    const schema = getAllowanceAmountYupSchema(
        tokenDecimals,
        minimumAllowance,
        currentAllowance
    )

    const handleChangeAllowanceAmount = (value: string) => {
        // Replace commas with periods
        value = value.replace(",", ".")
        // Remove everything that is not a number or period
        value = value.replace(/[^0-9.]/g, "")
        // Remove all periods except the first one
        value = value.replace(/(\..*?)\..*/g, "$1")

        if (!value || value === ".") {
            value = ""
        }
        schema
            .validate({ allowanceAmount: value })
            .then(() => {
                setError("")
                setIsValid(true)
            })
            .catch(() => {
                setIsValid(false)
            })
        setAllowanceAmount(value)

        const isRevoke = parseFloat(value) === 0
        const isUnlimited =
            parseFloat(value) ===
            parseFloat(formatUnits(UNLIMITED_ALLOWANCE, tokenDecimals))

        setUsingRevoke(isRevoke)
        setUsingUnlimited(isUnlimited)
        adjustInputCursor(value.length)
        onChange(value)
    }

    const validate = (value: string) => {
        schema
            .validate({ allowanceAmount: value })
            .then(() => {
                setError("")
                setIsValid(true)
            })
            .catch((err) => {
                setError(err.errors[0])
                setIsValid(false)
            })
    }

    const resetAllowanceValue = () => {
        handleChangeAllowanceAmount("")
        focusOnInput()
    }

    const focusOnInput = () => {
        setTimeout(() => {
            const input: any = inputRef.current
            if (input) input.focus()
        }, 0)
    }

    // Adjust input cursor position
    const adjustInputCursor = (position: number) => {
        setTimeout(() => {
            const input: any = inputRef.current
            if (input) input.setSelectionRange(position, position)
        }, 0)
    }

    useEffect(() => {
        const isUnlimited = BigNumber.from(UNLIMITED_ALLOWANCE).eq(defaultValue)
        const isRevoke = BigNumber.from(0).eq(defaultValue)

        setUsingRevoke(isRevoke)
        setUsingUnlimited(isUnlimited)
        setAllowanceAmount(
            formatRoundedUp(formatUnits(defaultValue, tokenDecimals))
        )
        // Needed in dependency array to update the input value when the defaultValue changes if there is multiple allowance approvals in the queue
    }, [defaultValue])

    return (
        <div className={classnames("flex flex-col")}>
            <div className="flex flex-row">
                <div className="flex items-center w-1/3 mb-1">
                    <label
                        htmlFor="allowanceAmount"
                        className="text-sm text-primary-grey-dark"
                    >
                        Allowance
                    </label>
                    <AiFillInfoCircle
                        size={25}
                        className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                        onClick={() => setShowOptionsInfo(true)}
                    />
                </div>
            </div>

            <div
                className={classnames(
                    Classes.greySection,
                    "px-4 py-3",
                    inputFocus && "bg-primary-grey-hover",
                    error && "border-red-400"
                )}
            >
                <div className="flex flex-col items-start w-2/5">
                    {usingUnlimited && (
                        <div
                            className={classnames(
                                Classes.blueSectionInput,
                                "mb-0 text-xl flex items-center"
                            )}
                            title={`${Number(
                                formatUnits(UNLIMITED_ALLOWANCE, tokenDecimals)
                            )} ${tokenName}`}
                            onClick={() => {
                                resetAllowanceValue()
                            }}
                        >
                            &#8734;{" "}
                            <span className="text-sm ml-2">{tokenName}</span>
                            <span className="w-24"></span>
                        </div>
                    )}

                    <input
                        id="allowanceAmount"
                        type="text"
                        ref={inputRef}
                        className={classnames(
                            Classes.blueSectionInput,
                            "mb-0 text-sm w-[130px]",
                            usingUnlimited && "hidden"
                        )}
                        placeholder={`0 ${tokenName}`}
                        autoComplete="off"
                        autoFocus={false}
                        onFocus={() => {
                            adjustInputCursor(allowanceAmount.length)
                            setInputFocus(true)
                        }}
                        onBlur={() => {
                            setInputFocus(false)
                            validate(allowanceAmount)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                                let newAllowanceAmount = allowanceAmount.slice(
                                    0,
                                    -1
                                )

                                if (
                                    newAllowanceAmount[
                                        newAllowanceAmount.length - 1
                                    ] === "."
                                ) {
                                    newAllowanceAmount =
                                        newAllowanceAmount.slice(0, -1)
                                }

                                handleChangeAllowanceAmount(newAllowanceAmount)
                            }
                            const amt = Number(e.currentTarget.value)
                            if (
                                !isNaN(Number(e.key)) &&
                                !isNaN(amt) &&
                                amt >= Number.MAX_SAFE_INTEGER
                            ) {
                                e.preventDefault()
                                e.stopPropagation()
                            }
                        }}
                        value={`${allowanceAmount} ${tokenName}`}
                        title={`${allowanceAmount} ${tokenName}`}
                        onInput={(e: any) => {
                            adjustInputCursor(allowanceAmount.length)
                            handleChangeAllowanceAmount(e.target.value)
                        }}
                    />
                </div>
                <div className="flex space-x-2">
                    <span
                        className={classnames(
                            "w-16 text-center float-right rounded-md cursor-pointer border p-1",
                            usingRevoke
                                ? "bg-gray-500 border-gray-500 text-white hover:bg-gray-400 hover:border-gray-400"
                                : "bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400"
                        )}
                        title={`Revoke value`}
                        onClick={() => {
                            handleChangeAllowanceAmount(
                                formatUnits(0, tokenDecimals)
                            )
                            validate(formatUnits(0, tokenDecimals))
                        }}
                    >
                        Revoke
                    </span>
                    <span
                        className={classnames(
                            "w-16 text-center float-right rounded-md cursor-pointer border p-1",
                            usingUnlimited
                                ? "bg-gray-500 border-gray-500 text-white hover:bg-gray-400 hover:border-gray-400"
                                : "bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400"
                        )}
                        title={`Unlimited value`}
                        onClick={() => {
                            handleChangeAllowanceAmount(
                                formatUnits(
                                    UNLIMITED_ALLOWANCE.toHexString(),
                                    tokenDecimals
                                )
                            )
                            validate(
                                formatUnits(
                                    UNLIMITED_ALLOWANCE.toHexString(),
                                    tokenDecimals
                                )
                            )
                        }}
                    >
                        Unlimited
                    </span>
                </div>
            </div>
            <div className={`${error ? "pl-1" : null}`}>
                <ErrorMessage>{error}</ErrorMessage>
            </div>
            <Dialog
                open={showOptionsInfo}
                onClickOutside={() => setShowOptionsInfo(false)}
            >
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setShowOptionsInfo(false)}
                        className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="flex flex-col w-full space-y-2">
                    <div className="z-10 flex flex-row items-center p-2 bg-white bg-opacity-75">
                        <h2 className="px-2 pr-0 text-lg font-semibold">
                            Allowance Options
                        </h2>
                    </div>
                    <div className="px-4 space-y-2 text-primary-black-default pb-2">
                        <h3 className="text-md font-medium">
                            Allowances let DApps automate transactions for you.
                            These are your options.
                        </h3>
                        {optionsText.map((item, index) => (
                            <div
                                className="flex flex-col space-y-1"
                                key={index}
                            >
                                <h4 className="text-primary-black-default font-semibold">
                                    {item.title}
                                </h4>
                                <p className="text-primary-grey-dark">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default AllowanceInput
