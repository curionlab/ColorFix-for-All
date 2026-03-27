import { AnalyzeResult, AnalyzeMode } from '@colorfix/schemas';
import { analyzeDesignInput, recommendFixes } from '@colorfix/core';
import { extractDesignInput } from '../adapters/html-parser';

export async function runAnalysis(url: string, mode: AnalyzeMode, brandColor?: string): Promise<AnalyzeResult & { recommendations: any[] }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  
  try {
    const { elements, declaredColors, assets } = await extractDesignInput(response);
    
    const analysisInput = {
      url,
      elements,
      declaredColors,
      sourceType: 'web' as const,
      sourceUrl: url
    };
    
    const analysisResult = analyzeDesignInput(analysisInput);
    const recommendations = recommendFixes(analysisResult, mode, brandColor || undefined);
    
    return {
      ...analysisResult,
      declaredColors,
      recommendations,
      assets
    };
  } finally {
    // Ensure the response body is consumed or cancelled to prevent stream leaks
    if (!response.bodyUsed) {
      await response.arrayBuffer().catch(() => {});
    }
  }
}
