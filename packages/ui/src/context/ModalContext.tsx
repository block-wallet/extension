import { createContext, useState } from "react"

type ModalState = {
    isOpen: boolean
    content?: React.ReactNode
    open: (node: React.ReactNode) => void
    close: () => void
}

export const ModalContext = createContext<ModalState>({
    isOpen: false,
    content: undefined,
    open: () => null,
    close: () => null,
})

export const ModalProvider = ({
    children,
}: {
    children: React.ReactNode | undefined
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState<React.ReactNode>()
    const open = (n: React.ReactNode) => {
        setIsOpen(true)
        setContent(n)
    }
    const close = () => {
        setIsOpen(false)
        setContent(undefined)
    }
    return (
        <ModalContext.Provider value={{ isOpen, content, open, close }}>
            {children}
        </ModalContext.Provider>
    )
}
