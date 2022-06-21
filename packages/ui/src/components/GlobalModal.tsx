import React, { useContext } from 'react'
import Modal from 'react-modal'
import { ModalContext } from '../context/ModalContext'

const GlobalModal = () => {
    const { isOpen, content, close } = useContext(ModalContext)
    return (
        <Modal isOpen={isOpen} onRequestClose={close}>
            {content}
        </Modal>
    )
}

export default GlobalModal
