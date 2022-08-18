const ContextMenuTrigger = ({ children }: { children: React.ReactNode }) => {
    document.addEventListener("contextmenu", (event) => {
        event.preventDefault()
    })
}

export default ContextMenuTrigger
