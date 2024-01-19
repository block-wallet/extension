import log from "loglevel"
import { postSlackMessage } from "../commActions"

/**
 * User gesture to request access to video
 * @returns boolean if user granted permissions to video
 */
export const requestMediaAccess = () => {
    return navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((mediaAccess) => {
            return mediaAccess.getVideoTracks().length > 0
        })
        .catch((error) => {
            postSlackMessage(
                "Error requesting media access",
                error,
                "File: requestMediaAccess"
            )
            log.error("error ", error)
            return false
        })
}
