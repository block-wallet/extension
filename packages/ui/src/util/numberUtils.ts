import { BigNumber } from "ethers"

export const bnOr0 = (value: any): BigNumber => BigNumber.from(value || "0")
