import { Reducer } from "react"

/**
 * Simple reducer that merges every new input to the state with the previous state.
 * @type S State type
 * @type A Action type
 * @returns a reducer function
 */
const mergeReducer = <S, A>(): Reducer<S, A> => {
    return (s: S, a: A): S => ({ ...s, ...a })
}

export { mergeReducer }
