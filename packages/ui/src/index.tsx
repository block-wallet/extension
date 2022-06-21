import log, { LogLevelDesc } from "loglevel"
import React from "react"
import ReactDOM from "react-dom"
import Modal from "react-modal"
import App from "./App"

import "./styles"

// Setting the default log level
log.setLevel((process.env.LOG_LEVEL as LogLevelDesc) || "error")

Modal.setAppElement("#root")

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root")
)
