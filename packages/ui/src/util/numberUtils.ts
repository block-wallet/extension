import { BigNumber } from "@ethersproject/bignumber"

export const bnOr0 = (value: any): BigNumber => BigNumber.from(value || "0")
