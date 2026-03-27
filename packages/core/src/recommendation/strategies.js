export function brandFirstStrategy() {
    return {
        mode: 'brand',
        weightAccessibility: 0.4,
        weightBrand: 0.6
    };
}
export function balancedStrategy() {
    return {
        mode: 'balanced',
        weightAccessibility: 0.5,
        weightBrand: 0.5
    };
}
export function readabilityFirstStrategy() {
    return {
        mode: 'readability',
        weightAccessibility: 0.7,
        weightBrand: 0.3
    };
}
export function getStrategy(mode) {
    if (mode === 'brand')
        return brandFirstStrategy();
    if (mode === 'readability')
        return readabilityFirstStrategy();
    return balancedStrategy();
}
