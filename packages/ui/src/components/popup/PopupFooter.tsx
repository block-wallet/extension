import React, { FunctionComponent } from 'react'

const PopupFooter: FunctionComponent = ({ children }) => (
    <div className="flex flex-row w-full items-center space-x-4 py-5 px-6 mt-auto">
        {children}
    </div>
)

export default PopupFooter
