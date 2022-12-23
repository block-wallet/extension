import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import * as yup from "yup"
import { BigNumber } from "@ethersproject/bignumber"
import { DEFAULT_DECIMALS } from "../constants"
import { parseUnits } from "@ethersproject/units"

export const GetAmountYupSchema = (
    fromToken: Token | undefined,
    fromTokenBalance: BigNumber
) => {
    return yup.object({
        amount: yup
            .string()
            .required("Enter an amount")
            .test("decimals", "Too many decimals", (value?: string) => {
                if (typeof value !== "string") return false
                if (!value.includes(".")) return true

                const decimals = fromToken?.decimals || DEFAULT_DECIMALS
                const valueDecimals = value.split(".")[1].length

                return valueDecimals <= decimals
            })
            .test("bad-input", "Invalid amount", (value?: string) => {
                if (typeof value !== "string") return false

                try {
                    parseUnits(value, fromToken?.decimals)

                    return true
                } catch (error) {
                    return false
                }
            })
            .test("no-balance", "Insufficient balance", (value?: string) => {
                if (!fromToken) return true
                if (typeof value !== "string") return false

                try {
                    const parsed = parseUnits(value, fromToken.decimals)

                    return parsed.lte(fromTokenBalance)
                } catch (error) {
                    return false
                }
            }),
    })
}
