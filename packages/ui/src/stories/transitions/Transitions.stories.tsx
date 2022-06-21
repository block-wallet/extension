import React, { FunctionComponent, useState } from 'react'
import { Meta } from '@storybook/react'
import { HashRouter } from 'react-router-dom'
import { TransitionRoute } from '../../router/TransitionRoute'
import PopupPage from '../../routes/PopupPage'
import SettingsPage from '../../routes/settings/SettingsPage'
import MockBackgroundState from '../../mock/MockBackgroundState'
import { Classes } from '../../styles'
import classnames from 'classnames'

import './slideVertical.css'
import './slideHorizontal.css'
import './fade.css'
import './scaleOut.css'
import '../../router/routeTransitions.css'

const MinimalApp: FunctionComponent<{ transition: string }> = ({
    transition,
}) => {
    const [main, setMain] = useState(true)
    return (
        <div className="flex flex-col space-y-4 pb-8">
            <div
                className="relative overflow-hidden rounded-md border border-gray-500"
                style={{ width: 357, height: 600 }}
            >
                <MockBackgroundState>
                    <HashRouter>
                        <TransitionRoute
                            path={main ? '/' : '/x'}
                            exact
                            transition={transition}
                            component={PopupPage}
                        />
                        <TransitionRoute
                            path={main ? '/x' : '/'}
                            exact
                            transition={transition}
                            component={SettingsPage}
                        />
                    </HashRouter>
                </MockBackgroundState>
            </div>
            <button
                className={classnames(Classes.button)}
                onClick={() => {
                    setMain(!main)
                }}
            >
                Transition
            </button>
        </div>
    )
}

export const TransitionSlideDown = () => (
    <MinimalApp transition="slide-vertical" />
)

export const TransitionSlideLeft = () => (
    <MinimalApp transition="slide-left" />
)

export const TransitionSlideRight = () => (
    <MinimalApp transition="slide-right" />
)

export const TransitionFade = () => <MinimalApp transition="fade" />

export const TransitionScaleOut = () => <MinimalApp transition="scale-out" />

export default { title: 'Transitions' } as Meta
