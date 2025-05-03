import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import classnames from "classnames"
import { UseFormRegister, FieldError, Control, UseFormSetValue, UseFormClearErrors, UseFormGetValues } from "react-hook-form"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { DEFAULT_DECIMALS } from "../../util/constants"
import { Classes } from "../../styles"
import ErrorMessage from "../error/ErrorMessage"
import { getValueByKey } from "../../util/objectUtils"
import { ResponseGetState } from "@block-wallet/background/utils/types/communication"

// Debounce utility
const useDebounce = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debounced = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    ) as T;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debounced;
};

interface AmountInputProps {
    control: Control<any> // Use specific form data type if available
    register: UseFormRegister<any>
    setValue: UseFormSetValue<any>
    getValues: UseFormGetValues<any>
    clearErrors: UseFormClearErrors<any>
    errors: { amount?: FieldError }
    selectedToken: TokenWithBalance
    nativeToken: TokenWithBalance // Needed for balance checks? Maybe pass getMaxTransactionAmount directly
    getMaxTransactionAmount: () => BigNumber
    balance: BigNumber // User's native balance
    selectedGas: any // Type TransactionFeeData
    isEIP1559Compatible?: boolean
    onAmountChange: (amount: string) => void // Callback for parent state
    onMaxClick: (useMax: boolean) => void // Callback for parent state
    blankState: ResponseGetState // Use the imported type
    disabled?: boolean
    className?: string // Add className prop
}

export const AmountInput: React.FC<AmountInputProps> = ({
    register,
    setValue,
    getValues,
    clearErrors,
    errors,
    selectedToken,
    getMaxTransactionAmount,
    onAmountChange,
    onMaxClick,
    blankState,
    disabled,
    className, // Destructure className
}) => {
    const [inputFocus, setInputFocus] = useState(false)
    const [usingMax, setUsingMax] = useState(false)
    const [nativeCurrencyAmt, setNativeCurrency] = useState(0)
    const [userIsTyping, setUserIsTyping] = useState(false)
    const prevAmountRef = useRef<string>("");

    const calcNativeCurrency = useCallback(() => {
        if (!selectedToken) return 0;
        try {
            const amountStr = getValues().amount || "0";
            const amount: number = Number(amountStr);
            const assetAmount: number = !isNaN(amount) && amount ? amount : 0;
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            const symbol =
                selectedToken?.token.symbol.toUpperCase() ||
                blankState.networkNativeCurrency.symbol; // Use network native symbol
            const txAmount: BigNumber = parseUnits(
                assetAmount.toString(),
                decimals
            );
            const rate = getValueByKey(blankState.exchangeRates, symbol, 0);
            const nativeAmount = toCurrencyAmount(txAmount, rate, decimals);
            setNativeCurrency(nativeAmount);
            return nativeAmount;
        } catch {
            setNativeCurrency(0);
            return 0;
        }
    }, [selectedToken, getValues, blankState.exchangeRates, blankState.networkNativeCurrency.symbol]);

    // Debounced version of the native currency calculation
    const debouncedCalcNativeCurrency = useDebounce(calcNativeCurrency, 300);

    // Calculate initial native currency amount on token/exchange rate change only
    useEffect(() => {
        // Only recalculate if not actively typing
        if (!userIsTyping) {
            calcNativeCurrency();
        }
    }, [calcNativeCurrency, selectedToken, blankState.exchangeRates, userIsTyping]);

    // Actual input change handler with improved typing experience
    const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserIsTyping(true);

        // If user is typing, disable max mode
        if (usingMax) {
            setUsingMax(false);
            onMaxClick(false);
        }

        let value = e.target.value
            ? e.target.value
                .replace(/[^0-9.,]/g, "")
                .replace(",", ".")
                .replace(/(\..*?)\..*/g, "$1")
            : "";

        if (value === ".") {
            value = "";
        }

        // Store current value for comparison
        prevAmountRef.current = value;

        if (value === "") {
            setValue("amount", "");
            clearErrors("amount");
        } else {
            // Basic validation before setting state
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            if (value.includes(".") && value.split(".")[1].length > decimals) {
                value = value.substring(0, value.indexOf(".") + decimals + 1);
            }

            setValue("amount", value, {
                shouldValidate: true, // Trigger validation
            });
        }

        // Notify parent right away for interface responsiveness
        onAmountChange(value);

        // Schedule debounced calculation for currency conversion
        debouncedCalcNativeCurrency();

        // Reset typing state after a delay
        setTimeout(() => {
            setUserIsTyping(false);
        }, 500);
    };

    // Max button handling improved to prevent conflicts with manual input
    const handleMaxClick = () => {
        const newUsingMax = !usingMax;
        setUsingMax(newUsingMax);

        if (newUsingMax) {
            const maxTransactionAmount = getMaxTransactionAmount();
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            const formatAmount = formatUnits(
                BigNumber.from(maxTransactionAmount),
                decimals
            );

            setValue("amount", formatAmount, {
                shouldValidate: true,
            });
            onAmountChange(formatAmount);
            prevAmountRef.current = formatAmount;
        } else {
            setValue("amount", "", {
                shouldValidate: false,
            });
            clearErrors("amount");
            onAmountChange("");
            prevAmountRef.current = "";
        }

        // Calculate native currency without debounce for immediate feedback
        calcNativeCurrency();
        onMaxClick(newUsingMax);
    };

    const hasBalance = useMemo(() =>
        selectedToken && !BigNumber.from(selectedToken.balance).isZero(),
        [selectedToken]
    );

    // Memoize the input value to prevent rerenders
    const inputValue = useMemo(() => getValues().amount || "", [getValues().amount]);

    return (
        <div
            className={classnames(
                "flex flex-col",
                !errors.amount && "mb-3",
                className
            )}
        >
            <div className="flex flex-row justify-between items-center">
                <label
                    htmlFor="amount"
                    className="ml-1 mb-2 text-[13px] font-medium text-primary-grey-dark"
                >
                    Amount
                </label>
                {/* Optional: Display token balance here */}
                {/* <span className="text-xs text-primary-grey-dark">
                    Balance: {formatUnits(selectedToken?.balance || 0, selectedToken?.token.decimals || DEFAULT_DECIMALS)} {selectedToken?.token.symbol}
                 </span> */}
            </div>

            <div
                className={classnames(
                    Classes.greySection,
                    inputFocus && "bg-primary-grey-hover",
                    errors.amount && "border border-red-400",
                    disabled && "opacity-50 cursor-not-allowed",
                    "p-2"
                )}
            >
                <div className="flex flex-col items-start flex-grow mr-2">
                    <input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        {...register("amount")}
                        className={classnames(
                            Classes.blueSectionInput,
                            "py-2 sm:py-1"
                        )}
                        placeholder={`0 ${selectedToken
                            ? selectedToken.token.symbol
                            : ""
                            }`}
                        autoComplete="off"
                        value={inputValue}
                        onFocus={() => !disabled && setInputFocus(true)}
                        onBlur={() => {
                            setInputFocus(false);
                            setUserIsTyping(false);
                        }}
                        onKeyDown={(e) => {
                            if (disabled) return;
                            // Prevent excessive numbers
                            const amt = Number(e.currentTarget.value + e.key);
                            if (
                                !isNaN(Number(e.key)) &&
                                !isNaN(Number(e.currentTarget.value)) &&
                                Number(e.currentTarget.value) >= Number.MAX_SAFE_INTEGER / 10
                            ) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }}
                        onChange={handleAmountInputChange}
                        disabled={disabled}
                    />
                    <span className="text-xs text-primary-grey-dark mt-1 h-4">
                        {!disabled && formatCurrency(nativeCurrencyAmt, {
                            currency: blankState.nativeCurrency,
                            locale_info: blankState.localeInfo,
                            showSymbol: true,
                        })}
                    </span>
                </div>
                <div className="w-auto flex items-center justify-end">
                    <button
                        type="button"
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-2 text-xs font-medium",
                            usingMax
                                ? "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300",
                            (!hasBalance || disabled) &&
                            "pointer-events-none opacity-50 text-primary-grey-dark",

                        )}
                        title={disabled ? "Amount locked" : "Use all available funds"}
                        onClick={!disabled ? handleMaxClick : undefined}
                        disabled={!hasBalance || disabled}
                    >
                        max
                    </button>
                </div>
            </div>
            {/* Error Message Display */}
            <div
                className={classnames(
                    "h-5 mt-1",
                    errors.amount?.message ? "pl-1" : null
                )}
            >
                <ErrorMessage>
                    {errors.amount?.message}
                </ErrorMessage>
            </div>
        </div>
    )
} 