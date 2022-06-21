import React from 'react'
import { Meta } from '@storybook/react'
import classnames from 'classnames'

import { Classes } from '../styles'
import Placeholder from '../components/Placeholder'

export const BasePlaceholder = () => (
    <Placeholder className={classnames('h-32 w-64')} />
)

export const ComposedPlaceholder = () => (
    <div className="flex flex-col items-start space-y-4">
        <div className="flex flex-row items-center space-x-4">
            <Placeholder className="w-16 h-16 rounded-full" />
            <Placeholder className="h-8 w-44" />
        </div>
        <Placeholder className="w-64 h-16" />
    </div>
)

export default { title: 'Loading' } as Meta
