import React, { FunctionComponent } from 'react'

import classnames from 'classnames'

const FullCenterContainer: FunctionComponent<{
    centered?: boolean
    screen?: boolean
}> = ({ children, centered = false, screen = false }) => (
    <div
        className="w-full min-h-full flex bg-primary-100"
        style={screen ? {} : { height: 'fit-content' }}
    >
        <div
            className={classnames(
                'flex flex-1 md:flex-0',
                !screen && 'px-2',
                'mx-auto',
                centered ? 'my-auto' : !screen ? 'mb-auto' : ''
            )}
        >
            {children}
        </div>
    </div>
)

export default FullCenterContainer
