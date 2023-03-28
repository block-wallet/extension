export const ENVIRONMENT = process.env.NODE_ENV;

function isDevEnvironment(): boolean {
    return ENVIRONMENT === 'development';
}

export { isDevEnvironment };
