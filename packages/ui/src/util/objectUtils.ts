function deepEqual(object1: any, object2: any) {
    const keys1 = Object.keys(object1)
    const keys2 = Object.keys(object2)
    if (keys1.length !== keys2.length) {
        return false
    }
    for (const key of keys1) {
        const val1 = object1[key]
        const val2 = object2[key]
        const areObjects = isObject(val1) && isObject(val2)
        if (
            (areObjects && !deepEqual(val1, val2)) ||
            (!areObjects && val1 !== val2)
        ) {
            return false
        }
    }
    return true
}
function isObject(object: Object) {
    return object != null && typeof object === "object"
}

/**
 * Returns true if the specified key exists in the key-value pair object.
 * @param key to check
 * @param object
 * @returns boolean
 */
function existsKeyInObject(key: any, object: Object) {
    return Object.keys(object).includes(key)
}


/**
 * Checks if a key exists in an object and if it does, returns the value. Otherwise, returns a default value.
 * @param object key-value pair object
 * @param key
 * @param defaultValue
 * @returns
 */
function getValueByKey<T extends object>(object: T, key: keyof T, defaultValue: typeof object[keyof T]) {

    return existsKeyInObject(key, object)
        ? object[key]
        : defaultValue
}

export { deepEqual, existsKeyInObject, getValueByKey }
