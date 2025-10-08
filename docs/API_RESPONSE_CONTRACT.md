# API Response Contract

## Search Analysis Response Structure

### Main Response Object
```typescript
interface SearchResponse {
  success: boolean;
  message: string;
  searchResult: SearchResult;
}

interface SearchResult {
  query: string;
  type: 'barcode' | 'product_name' | 'ingredient';
  analysis: NutritionalAnalysis;
  timestamp: string; // ISO 8601 format
  isPersonalized: boolean;
  isFallback: boolean;
}
```

### Nutritional Analysis Object
```typescript
interface NutritionalAnalysis {
  // Core Analysis
  healthImpact: 'positive' | 'negative' | 'neutral' | 'caution';
  score: number; // 0-100
  analysis: string; // Clean, readable paragraph (2-3 sentences) in simple language
  
  // User-Friendly Recommendations
  recommendations: string[]; // Array of simple advice
  warnings: string[]; // Array of health warnings
  benefits: string[]; // Array of health benefits
  
  // Nutritional Facts
  nutritionalFacts: NutritionalFacts;
  
  // Summary
  simpleSummary: string; // One-line summary
  
  // Metadata
  isFallback?: boolean; // True if using fallback analysis
  fallbackReason?: string; // Reason for fallback if applicable
  rawResponse?: string; // Original AI response (for debugging)
}
```

### Nutritional Facts Object
```typescript
interface NutritionalFacts {
  calories: string; // Simple description like "About 100 calories per serving"
  macros: string; // Simple breakdown like "Mostly carbs with some protein"
  keyNutrients: string[]; // Array of key nutrients like ["Vitamin C", "Fiber", "Iron"]
}
```

## Example Response

```json
{
  "success": true,
  "message": "Search completed successfully",
  "searchResult": {
    "query": "apple",
    "type": "product_name",
    "analysis": {
      "healthImpact": "positive",
      "score": 95,
      "analysis": "Hey there, let's talk about the humble apple! This classic fruit is a real superstar when it comes to healthy eating. Apples are basically nature's perfect snack – they're crunchy, sweet (or sometimes a little tart), and super refreshing.",
      "recommendations": [
        "Great choice for a healthy snack anytime!",
        "Add sliced apples to your oatmeal or yogurt for extra crunch and sweetness.",
        "Bake them into a healthy dessert like baked apples (skip the added sugar if you can!).",
        "Always wash your apple thoroughly before eating."
      ],
      "warnings": [
        "None really! Apples are generally fantastic for everyone. Just be sure to wash them well."
      ],
      "benefits": [
        "Good for your heart health.",
        "Helps with digestion thanks to all that fiber.",
        "Boosts your immune system with Vitamin C.",
        "Helps you feel full and satisfied, which can be great for managing your weight.",
        "Gives you natural, steady energy."
      ],
      "nutritionalFacts": {
        "calories": "A medium apple gives you about 95-100 units of energy.",
        "macros": "It's mostly natural sugar with some fiber and a tiny bit of protein.",
        "keyNutrients": ["Vitamin C", "Fiber", "Potassium", "Antioxidants"]
      },
      "simpleSummary": "Apples are a super healthy fruit that's good for your heart and gives you energy!",
      "isFallback": false
    },
    "timestamp": "2025-10-05T21:46:26.280Z",
    "isPersonalized": false,
    "isFallback": false
  }
}
```

## Error Response Structure

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

## Language Guidelines

All text content follows these principles:
- **Simple Language**: "Good for you" instead of "beneficial"
- **Friendly Tone**: Conversational and approachable
- **Everyday Words**: "Energy" instead of "calories" when talking to users
- **Clear Benefits**: "Good for your heart" instead of "cardiovascular benefits"
- **Practical Advice**: Actionable recommendations users can follow

## Frontend Integration Notes

1. **Always check `success` field** before accessing `searchResult`
2. **Handle `isFallback` flag** - show appropriate messaging when true
3. **Display `simpleSummary`** as the main headline
4. **Use `healthImpact`** for color coding (positive=green, caution=yellow, etc.)
5. **Show `score`** as a visual indicator (0-100 scale)
6. **Display arrays** as bullet points or cards
7. **Handle empty arrays** gracefully (recommendations, warnings, benefits)
