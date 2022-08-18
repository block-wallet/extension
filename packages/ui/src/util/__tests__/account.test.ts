import { Accounts } from "@block-wallet/background/controllers/AccountTrackerController"
import { AccountType } from "../../context/commTypes"
import {
    accountNameExists,
    getDefaultAccountName,
    getNextAccountName,
    isHardwareWallet,
    isInternalAccount,
} from "../account"

describe("Account helpers tests", () => {
    describe("Account name", () => {
        it("Should generate account name correctly", () => {
            expect(getDefaultAccountName(1)).toStrictEqual("Account 1")
            expect(getDefaultAccountName(2)).toStrictEqual("Account 2")
            expect(getDefaultAccountName(2000)).toStrictEqual("Account 2000")
        })
        it("Should retrun that the account name exists", () => {
            const account = { name: "Account 1" } as any
            const accounts = {
                a_dummy_address: account,
            } as Accounts
            expect(accountNameExists(accounts, "Account 1")).toBeTruthy()
            expect(accountNameExists(accounts, "account 1")).toBeTruthy()
            expect(accountNameExists(accounts, "    account 1")).toBeTruthy()
            expect(accountNameExists(accounts, "Account      1")).toBeTruthy()
            expect(accountNameExists(accounts, "Account1")).toBeTruthy()
            expect(accountNameExists(accounts, "Ac c o un t 1")).toBeTruthy()
        })
        it("Should retrun that the account doesn't exist", () => {
            const account = { name: "Account 2" } as any
            const accounts = {
                a_dummy_address: account,
            } as Accounts
            expect(accountNameExists(accounts, "Account 1")).toBeFalsy()
        })
        it("Should retrun the next account name based on the current existing accounts and the start number", () => {
            const accountA = { name: "Account 2" } as any
            const accountB = { name: "Account 9" } as any
            const accounts = {
                a_dummy_address1: accountA,
                a_dummy_address2: accountB,
            } as Accounts
            expect(getNextAccountName(accounts, 2)).toStrictEqual("Account 3")
            expect(getNextAccountName(accounts, 3)).toStrictEqual("Account 3")
            expect(getNextAccountName(accounts, 9)).toStrictEqual("Account 10")
        })
    })
    describe("Account type", () => {
        it("Should return that is not a hardware wallet", () => {
            expect(isHardwareWallet(AccountType.HD_ACCOUNT)).toBeFalsy()
        })
        it("Should return that it is a hardware wallet", () => {
            expect(isHardwareWallet(AccountType.TREZOR)).toBeTruthy()
            expect(isHardwareWallet(AccountType.LEDGER)).toBeTruthy()
        })
        it("Should return that it is not an internal account", () => {
            expect(isInternalAccount(AccountType.TREZOR)).toBeFalsy()
            expect(isInternalAccount(AccountType.EXTERNAL)).toBeFalsy()
            expect(isInternalAccount(AccountType.LEDGER)).toBeFalsy()
        })
        it("Should return that it is an internal account", () => {
            expect(isInternalAccount(AccountType.HD_ACCOUNT)).toBeTruthy()
        })
    })
})
