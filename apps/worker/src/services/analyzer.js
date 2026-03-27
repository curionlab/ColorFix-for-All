import { analyzeDesignInput, recommendFixes } from '@colorfix/core';
import { extractDesignInput } from '../adapters/html-parser';
export async function runAnalysis(url, mode) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    // Create a clone because HTMLRewriter consumes the body
    const { elements, declaredColors } = await extractDesignInput(response.clone());
    const analysisInput = {
        url,
        elements,
        declaredColors,
        sourceType: 'web',
        sourceUrl: url
    };
    const analysisResult = analyzeDesignInput(analysisInput);
    const recommendations = recommendFixes(analysisResult, mode);
    return {
        ...analysisResult,
        recommendations
    };
}
