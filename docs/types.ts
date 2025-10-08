// TypeScript interfaces for Befree API responses
// Copy these interfaces to your frontend project

export interface SearchResponse {
  success: boolean;
  message: string;
  searchResult: SearchResult;
}

export interface SearchResult {
  query: string;
  type: 'barcode' | 'product_name' | 'ingredient';
  analysis: NutritionalAnalysis;
  timestamp: string; // ISO 8601 format
  isPersonalized: boolean;
  isFallback: boolean;
}

export interface NutritionalAnalysis {
  // Core Analysis
  healthImpact: 'positive' | 'negative' | 'neutral' | 'caution';
  score: number; // 0-100
  analysis: string; // Main description in simple language
  
  // User-Friendly Recommendations
  recommendations: string[]; // Array of simple advice
  warnings: string[]; // Array of health warnings
  benefits: string[]; // Array of health benefits
  
  // Nutritional Facts
  nutritionalFacts: NutritionalFacts;
  
  // Summary
  simpleSummary: string; // One-line summary
  
  // Metadata
  isFallback: boolean; // True if using fallback analysis
  fallbackReason?: string; // Reason for fallback if applicable
  rawResponse?: string; // Original AI response (for debugging)
}

export interface NutritionalFacts {
  calories: string; // Simple description like "About 100 calories per serving"
  macros: string; // Simple breakdown like "Mostly carbs with some protein"
  keyNutrients: string[]; // Array of key nutrients like ["Vitamin C", "Fiber", "Iron"]
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Example usage in React/TypeScript:
/*
import { SearchResponse, NutritionalAnalysis } from './types';

const handleSearchResponse = (response: SearchResponse) => {
  if (response.success) {
    const analysis: NutritionalAnalysis = response.searchResult.analysis;
    
    // Use the guaranteed fields
    console.log('Health Impact:', analysis.healthImpact);
    console.log('Score:', analysis.score);
    console.log('Summary:', analysis.simpleSummary);
    console.log('Recommendations:', analysis.recommendations);
    console.log('Warnings:', analysis.warnings);
    console.log('Benefits:', analysis.benefits);
    
    // Handle fallback cases
    if (analysis.isFallback) {
      console.warn('Using fallback analysis:', analysis.fallbackReason);
    }
  }
};
*/

