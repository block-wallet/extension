export const getFormattedSlackMessage = (
    errorMessage: string,
    error: any,
    extraParams: any
): string => {
    return `"blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Catch exception",
                    "emoji": true
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "rich_text",
                "elements": [
                    {
                        "type": "rich_text_section",
                        "elements": [
                            {
                                "type": "text",
                                "text": "Error message:\n"
                            },
                            {
                                "type": "text",
                                "text": ${errorMessage},
                                "style": {
                                    "bold": true
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "type": "rich_text",
                "elements": [
                    {
                        "type": "rich_text_section",
                        "elements": [
                            {
                                "type": "text",
                                "text": "Error:\n"
                            },
                            {
                                "type": "text",
                                "text": ${error.toString()},
                                "style": {
                                    "bold": true
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "type": "rich_text",
                "elements": [
                    {
                        "type": "rich_text_section",
                        "elements": [
                            {
                                "type": "text",
                                "text": "Additional information:\n"
                            },
                            {
                                "type": "text",
                                "text": ${extraParams.toString()},
                                "style": {
                                    "bold": true
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    `;
};
