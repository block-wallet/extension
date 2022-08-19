import { useEffect, useRef } from "react"

/**
 * useDOMElementObserver
 * This hook observes the given html node reference and invokes the callback function when it is intersected.
 * @param domRef DOM ref element to listen
 * @param fn Callback function to execute
 * @param deps Dpendency list to re-run the observer
 * @returns
 */
const useDOMElementObserver = (
    domRef: React.RefObject<HTMLElement>,
    fn: () => void,
    deps?: React.DependencyList
) => {
    const observerRef = useRef<IntersectionObserver | null>(null)
    useEffect(() => {
        if (!domRef.current) return
        if (observerRef.current) observerRef.current.disconnect()
        observerRef.current = new IntersectionObserver(
            async (entries) => {
                const entry = entries[0]
                if (!entry || !entry.isIntersecting) return
                fn()
            },
            { threshold: 0.5 }
        )

        observerRef.current.observe(domRef.current)

        return () => {
            if (!observerRef.current) return

            observerRef.current.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
    return {}
}

export default useDOMElementObserver
