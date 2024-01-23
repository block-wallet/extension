import { getSlackService } from './slackService';

export const postBkgSlackMessage = (
    message: string,
    error: any,
    extraParams?: any | undefined
): void => {
    const slackService = getSlackService();
    slackService.postMessage(message, error, extraParams);
};

export const slackMessageBody = (
    message: string,
    error: any,
    extraParams?: any | undefined
): string => {
    const body = `{
        "blocks": [
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
                                "text": "${message}",
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
                                "text": "${error}",
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
                                "text": "${extraParams}",
                                "style": {
                                    "bold": true
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }`;

    return body;
};
