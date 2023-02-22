import * as yup from "yup"

type ValidationInput<T> = [T, string]

type StringNumberValidator = {
    min?: ValidationInput<number>
}
/**
 * This function create a yup schema field when you need a number (most of the time gas fees) in a form.
 * If you need to add more verification you can do it like so:
 * ```js
 * makeStringNumberFormField('message').test('my-test', ...)
 * ```
 * @param requiredMessage The error message to show if the input is empty.
 * @param isGteThan0 Does the value needs to be greater or equal to 0. Is `true` by default.
 */
export const makeStringNumberFormField = (
    requiredMessage: string,
    isGteThan0: boolean = true,
    { min }: StringNumberValidator = {}
) => {
    let schema = yup
        .string()
        .required(requiredMessage)
        .test("is-correct", "Please enter a number.", (value) => {
            if (typeof value != "string") return false
            return !isNaN(parseFloat(value))
        })
        .test("is-correct", "Please enter a number.", (value) => {
            if (typeof value != "string") return false
            const regexp = /^\d+(\.\d+)?$/
            return regexp.test(value)
        })
        .test("is-correct", "Amount must be a positive number.", (value) => {
            if (typeof value != "string") return false
            return isGteThan0 ? parseFloat(value) >= 0 : parseFloat(value) > 0
        })

    if (min) {
        const [minValue, message] = min
        schema = schema.test("is-min", message, (value) => {
            if (
                typeof value !== "string" &&
                typeof minValue !== "undefined" &&
                value
            ) {
                return false
            }
            return parseFloat(value ?? "0") >= minValue
        })
    }
    return schema
}
/**
 * This function check if the input is a valid number
 * @param e Keyboard event
 */
export const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    const amt = Number(e.currentTarget.value)

    if (
        !isNaN(Number(e.key)) &&
        !isNaN(amt) &&
        amt >= Number.MAX_SAFE_INTEGER
    ) {
        e.preventDefault()
        e.stopPropagation()
    }
}

const makeHandleChangeAmount =
    (replace: RegExp) =>
    (cb: (value: string) => void, defaultValue: string = "") =>
    (event: React.ChangeEvent<any>) => {
        let value: string = event.target.value

        value = value
            .replace(",", ".")
            .replace(replace, "")
            .replace(/(\..*?)\..*/g, "$1")

        const match = value.match(/[0-9]+[.,]([0-9]+)/)

        if (match && match[1].length > 9) {
            value = value.substring(0, value.length - 1)
        }

        if (!value || value === ".") {
            value = defaultValue
        }

        cb(value)
    }

export const handleChangeAmountGwei = makeHandleChangeAmount(/[^0-9.]/g)

export const handleChangeAmountWei = makeHandleChangeAmount(/[^0-9]/g)
