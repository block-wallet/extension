import React from 'react'
import {
    TransitionRoute,
    TransitionRouteProps,
} from '../router/TransitionRoute'

export const makeRoutes = (routes: TransitionRouteProps[]) =>
    routes.map((route, i) => <TransitionRoute {...route} key={i} />)
