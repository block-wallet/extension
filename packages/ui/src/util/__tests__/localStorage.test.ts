import LocalStorageMock from "../../mock/LocalStorageMock"
import {
    clearVolatileLocalStorageItems,
    clearLocalStorageItems,
    generateVolatileLocalStorageKey,
    retrieveLocalStorageItem,
    saveLocalStorageItem,
} from "../localSotrage"
describe("Local storage management tests", () => {
    let windowLocalStorage: any
    beforeAll(() => {
        windowLocalStorage = window.localStorage
    })
    beforeEach(() => {
        Object.defineProperty(window, "localStorage", {
            value: LocalStorageMock,
        })
        window.localStorage.clear()
    })
    afterAll(() => {
        Object.defineProperty(window, "localStorage", {
            value: windowLocalStorage,
        })
    })
    describe("Should store and retrieve items from the local storage", () => {
        test("Should store without windowId", () => {
            expect(window.localStorage.getItem("mykey")).toBeNull()
            saveLocalStorageItem("mykey", "myData")
            expect(
                JSON.parse(window.localStorage.getItem("mykey")!)
            ).toStrictEqual({ value: "myData", updateTime: expect.any(Number) })
        })
        test("Should store with windowId", () => {
            expect(window.localStorage.getItem("mykey")).toBeNull()
            saveLocalStorageItem("mykey", "myData", 123)
            expect(
                JSON.parse(window.localStorage.getItem("mykey")!)
            ).toStrictEqual({
                value: "myData",
                windowId: 123,
                updateTime: expect.any(Number),
            })
        })
        test("Should store objects as values correctly with windowId", () => {
            expect(window.localStorage.getItem("mykey")).toBeNull()
            saveLocalStorageItem(
                "mykey",
                {
                    firstKey: 1,
                    secondKey: {
                        thirdKey: 3,
                    },
                },
                123
            )
            expect(JSON.parse(window.localStorage.getItem("mykey")!)).toEqual({
                value: {
                    firstKey: 1,
                    secondKey: {
                        thirdKey: 3,
                    },
                },
                windowId: 123,
                updateTime: expect.any(Number),
            })
        })
        test("Should retrieve undefined if the key does not exit", () => {
            saveLocalStorageItem("mykey", "myData")
            expect(retrieveLocalStorageItem("nonExistantKey")).toBeNull()
        })
        test("Should retrieve item value without a windowId", () => {
            saveLocalStorageItem("mykey", "myData")
            expect(retrieveLocalStorageItem("mykey")).toStrictEqual("myData")
        })
        test("Should retrieve item value with a windowId", () => {
            saveLocalStorageItem("mykey", "myData", 123)
            expect(retrieveLocalStorageItem("mykey", 123)).toStrictEqual(
                "myData"
            )
        })
        test("Should retrieve undefined when the windowId doesnt match", () => {
            saveLocalStorageItem("mykey", "myData", 123)
            expect(retrieveLocalStorageItem("mykey", 200)).toBeNull()
        })
        test("Should retrieve item when the windowId is not provided", () => {
            saveLocalStorageItem("mykey", "myData", 123)
            expect(retrieveLocalStorageItem("mykey")).toStrictEqual("myData")
        })
        test("Should not return an item if the ttl has expried", async () => {
            saveLocalStorageItem("mykeyWithTTL", "myData", 123)
            expect(
                retrieveLocalStorageItem("mykeyWithTTL", 123, 1000)
            ).toStrictEqual("myData")
            //wait 2 seconds
            await new Promise((r) => setTimeout(r, 2000))
            //Item should not be valid anymroe
            expect(
                retrieveLocalStorageItem("mykeyWithTTL", 123, 1000)
            ).toBeNull()
        })
    })
    describe("Key generation", () => {
        test("Should put volatile prefix if it is not present", () => {
            expect(generateVolatileLocalStorageKey("form")).toStrictEqual(
                "volatile.form"
            )
        })
        test("Should not put volatile prefix if it is already present", () => {
            expect(
                generateVolatileLocalStorageKey("volatile.form")
            ).toStrictEqual("volatile.form")
        })
    })
    describe("Clear storage", () => {
        test("Should not clear items if the query does not match", () => {
            saveLocalStorageItem("mykey1", "myData1", 123)
            saveLocalStorageItem("mykey2", "myData2", 123)
            saveLocalStorageItem("mykey3", "myData3", 123)
            expect(window.localStorage.length).toBe(3)
            clearLocalStorageItems("notAKey")
            expect(window.localStorage.length).toBe(3)
        })
        test("Should clear items that matches the query", () => {
            saveLocalStorageItem("mykey1", "myData1", 123)
            saveLocalStorageItem("mykey2", "myData2", 123)
            saveLocalStorageItem("mykey3", "myData3", 123)
            saveLocalStorageItem("anotherKey", "myData3", 123)
            expect(window.localStorage.length).toBe(4)
            clearLocalStorageItems(new RegExp("mykey", "i"))
            expect(window.localStorage.length).toBe(1)
        })
        test("Should clear volatile items", () => {
            saveLocalStorageItem("volatile.test1", "myData1", 123)
            saveLocalStorageItem("volatile.test2", "myData2", 123)
            saveLocalStorageItem("mykey3", "myData3", 123)
            saveLocalStorageItem("volatile.test3", "myData3", 123)
            expect(window.localStorage.length).toBe(4)
            clearVolatileLocalStorageItems()
            expect(window.localStorage.length).toBe(1)
        })
    })
})
