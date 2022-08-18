import { timeExceedsTTL } from "../time"

describe("Time utils", () => {
    it("should return false if the time did not exceed the TTL", () => {
        const lastUpdateTime = new Date().getTime()
        expect(timeExceedsTTL(lastUpdateTime, 60000)).toBeFalsy()
    })
    it("should return true if the time exceeded the TTL", () => {
        //rest 2 minutes to the current data
        const lastUpdateTime = new Date().getTime() - 120000
        expect(timeExceedsTTL(lastUpdateTime, 60000)).toBeTruthy()
    })
})
