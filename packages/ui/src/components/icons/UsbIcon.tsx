import classnames from "classnames"

const UsbIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-5 h-5", className)}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M9.99951 19.166V1.66602"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
            />
            <path
                d="M7.49951 4.16602L9.99951 1.66602L12.4995 4.16602"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
                stroke-linecap="square"
            />
            <path
                d="M14.9995 11.666V14.166L9.99951 17.4993"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
            />
            <path
                d="M5 10V13.3333L10 16.6667"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
            />
            <path
                d="M16.6663 8.33203H13.333V11.6654H16.6663V8.33203Z"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
                stroke-linecap="square"
            />
            <path
                d="M4.99967 9.99935C5.92015 9.99935 6.66634 9.25316 6.66634 8.33268C6.66634 7.41221 5.92015 6.66602 4.99967 6.66602C4.0792 6.66602 3.33301 7.41221 3.33301 8.33268C3.33301 9.25316 4.0792 9.99935 4.99967 9.99935Z"
                stroke="#08090A"
                stroke-width="1.5"
                stroke-miterlimit="10"
                stroke-linecap="square"
            />
        </svg>
    )
}

export default UsbIcon
