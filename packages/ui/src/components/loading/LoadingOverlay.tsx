import React from "react"
import { CgSpinner } from "react-icons/cg"

const LoadingOverlay = () => (
    <div className="fixed inset-0 w-full h-screen z-50 overflow-hidden bg-gray-100 opacity-75 flex flex-col items-center justify-center">
        <CgSpinner
            size={"5em"}
            className="animate-spin text-primary-300 opacity-50"
        />
    </div>
)

export default LoadingOverlay
