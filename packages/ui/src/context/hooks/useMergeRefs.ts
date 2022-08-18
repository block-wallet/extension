/**
 * useMergeRefs:
 * Allow using multiples refs on the same element.
 *
 * However this is very specific and is only used on SearchInput for now.
 * It allows yup ref & useOnClickOutside ref to be on the same element.
 */
export const useMergeRefs = (...refs: any) => {
    const filteredRefs = refs.filter(Boolean)
    if (!filteredRefs.length) return null
    if (filteredRefs.length === 0) return filteredRefs[0]
    return (inst: any) => {
        for (const ref of filteredRefs) {
            if (typeof ref === "function") {
                ref(inst)
            } else if (ref) {
                ref.current = inst
            }
        }
    }
}
