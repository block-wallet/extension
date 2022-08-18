import { useContext } from 'react'
import BackgroundContext from './backgroundContext'

export const useBlankState = () => useContext(BackgroundContext).blankState
