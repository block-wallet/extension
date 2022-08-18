export type BlankSupportedFeatures = 'sends' | 'swaps' | 'tornado';

export const FEATURES: {
    [key in Uppercase<BlankSupportedFeatures>]: BlankSupportedFeatures;
} = {
    SENDS: 'sends',
    SWAPS: 'swaps',
    TORNADO: 'tornado',
};
