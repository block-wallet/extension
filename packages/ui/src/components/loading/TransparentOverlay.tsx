/*
 * Transparent overlay component to prevent clicks on all the extension buttons while loading.
 */
const TransparentOverlay = () => (
    <div className="fixed inset-0 w-full h-screen z-50"></div>
)

export default TransparentOverlay
