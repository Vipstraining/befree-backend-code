const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../config/logger');

class ClaudeAIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
  }

  async analyzeProduct(searchQuery, searchType, userProfile = null, productData = null) {
    try {
      logger.info('Starting Claude AI analysis', {
        query: searchQuery,
        type: searchType,
        hasUserProfile: !!userProfile,
        hasProductData: !!productData,
        model: this.model
      });

      const prompt = this.createAnalysisPrompt(searchQuery, searchType, userProfile, productData);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = response.content[0].text;

      logger.info('Claude AI analysis completed', {
        query: searchQuery,
        responseLength: responseText.length
      });

      return this.parseClaudeResponse(responseText, searchQuery, searchType);

    } catch (error) {
      logger.error('Claude AI analysis failed', {
        error: error.message,
        statusCode: error.status,
        query: searchQuery,
        type: searchType
      });

      return this.getFallbackAnalysis(searchQuery, searchType);
    }
  }

  createAnalysisPrompt(searchQuery, searchType, userProfile, productData = null) {
    let prompt;

    if (searchType === 'barcode') {
      // Build product data block — use real OFF data if available
      let productBlock;
      if (productData) {
        const n = productData.nutrition;
        productBlock = `REAL PRODUCT DATA (fetched from Open Food Facts):
- Name: ${productData.name}
- Brand: ${productData.brand}
- Category: ${productData.category}
- Quantity / Serving: ${productData.quantity || 'Not specified'}
- Ingredients: ${productData.ingredients || 'Not listed'}
- Nutri-Score: ${productData.nutriscore ? productData.nutriscore.toUpperCase() : 'Not available'}
- NOVA Group: ${productData.novaGroup || 'Not available'}
- Labels: ${productData.labels || 'None'}
- Allergens: ${productData.allergens.length > 0 ? productData.allergens.join(', ') : 'None listed'}
- Nutrition per 100g:
  • Calories: ${n.calories != null ? n.calories + ' kcal' : 'N/A'}
  • Fat: ${n.fat != null ? n.fat + 'g' : 'N/A'}
  • Saturated Fat: ${n.saturatedFat != null ? n.saturatedFat + 'g' : 'N/A'}
  • Carbohydrates: ${n.carbs != null ? n.carbs + 'g' : 'N/A'}
  • Sugar: ${n.sugar != null ? n.sugar + 'g' : 'N/A'}
  • Fiber: ${n.fiber != null ? n.fiber + 'g' : 'N/A'}
  • Protein: ${n.protein != null ? n.protein + 'g' : 'N/A'}
  • Salt: ${n.salt != null ? n.salt + 'g' : 'N/A'}`;
      } else {
        productBlock = `Barcode: ${searchQuery}
No product data found in Open Food Facts. Use your own knowledge to identify and analyze this product as best you can. Set "identified": false if unknown.`;
      }

      prompt = `You are a friendly nutrition expert. A user scanned a barcode and here is the product data:

${productBlock}

Using this data, write a complete, friendly, human-readable nutritional analysis of this product.

CRITICAL: Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks. Start directly with { and end with }.

Required JSON format:
{
  "productInfo": {
    "name": "${productData ? productData.name : 'Unknown Product'}",
    "brand": "${productData ? productData.brand : 'Unknown Brand'}",
    "category": "${productData ? productData.category : 'Unknown Category'}",
    "barcode": "${searchQuery}",
    "servingSize": "${productData ? (productData.quantity || 'See packaging') : 'Not specified'}",
    "nutriscore": "${productData ? (productData.nutriscore || 'N/A') : 'N/A'}",
    "identified": ${productData ? true : false}
  },
  "healthImpact": "positive|negative|neutral|caution",
  "score": 0-100,
  "analysis": "2-3 sentence friendly explanation using the real product data above. Mention the product name and brand. Talk like a friend, not a doctor.",
  "recommendations": ["Specific advice based on the actual nutrition data, e.g. 'This has 12g of sugar per 100g — enjoy it in small portions'"],
  "warnings": ["Real warnings based on the data, e.g. 'High in saturated fat' or 'Contains gluten'"],
  "benefits": ["Genuine benefits from the data, e.g. 'Good source of fiber with 4g per 100g'"],
  "nutritionalFacts": {
    "calories": "e.g. '250 kcal per 100g — about 375 kcal in a typical 150g serving'",
    "macros": "e.g. '30g carbs, 12g fat, 8g protein per 100g'",
    "keyNutrients": ["List standout nutrients, e.g. 'High in Vitamin C', 'Good source of Iron'"]
  },
  "simpleSummary": "One honest plain-English sentence about this specific product"
}

RULES:
- Use the actual product name and brand throughout — never say "this food"
- Base analysis on the real nutrition numbers provided above
- Use simple words: "sugar" not "glucose", "salt" not "sodium", "energy" not "calories" in text
- Be honest — if the numbers show it's unhealthy, say so kindly
- Return ONLY the JSON, no markdown, no extra text
- Start with { and end with }`;
    } else {
      prompt = `You are a friendly nutrition expert. Analyze this food item: "${searchQuery}" (${searchType})

Write your analysis in SIMPLE, EASY-TO-UNDERSTAND language that any normal person can read and understand. Avoid technical jargon and medical terms. Use everyday words.

CRITICAL: Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks, do NOT add any text before or after the JSON. Start your response directly with { and end with }.

Required JSON format:
{
  "healthImpact": "positive|negative|neutral|caution",
  "score": 0-100,
  "analysis": "Write a friendly, conversational explanation (2-3 sentences) about what this food is and how it affects your health. Use everyday language that anyone can understand. Make it sound like you're talking to a friend.",
  "recommendations": ["Simple, practical advice like 'Eat in small portions' or 'Great choice for a healthy snack'"],
  "warnings": ["Simple warnings like 'High in sugar' or 'Contains allergens'"],
  "benefits": ["Simple benefits like 'Good for your heart' or 'Helps with energy'"],
  "nutritionalFacts": {
    "calories": "Simple explanation like 'About 100 calories per serving'",
    "macros": "Simple breakdown like 'Mostly carbs with some protein'",
    "keyNutrients": ["Simple nutrients like 'Vitamin C', 'Fiber', 'Iron'"]
  },
  "simpleSummary": "One sentence summary that anyone can understand"
}

IMPORTANT:
- Use simple words like "good for you" instead of "beneficial"
- Use "bad for you" instead of "detrimental"
- Use "energy" instead of "calories" when talking to users
- Use "sugar" instead of "glucose"
- Use "salt" instead of "sodium"
- Make it sound like you're talking to a friend, not a doctor
- The "analysis" field should be a clean, readable paragraph (2-3 sentences)
- Return ONLY the JSON object, no markdown formatting, no code blocks, no extra text
- The JSON must be valid and parseable
- Start response with { and end with }`;
    }

    if (userProfile) {
      prompt += `\n\nPERSONALIZED HEALTH CONTEXT:

IMPORTANT: Consider this user's specific health situation when analyzing the food. Make your recommendations personal and relevant to their health needs.

HEALTH CONDITIONS:`;

      if (userProfile.healthConditions) {
        if (userProfile.healthConditions.diabetes?.type) {
          prompt += `\n- Diabetes (${userProfile.healthConditions.diabetes.type}): ${userProfile.healthConditions.diabetes.severity} severity`;
        }
        if (userProfile.healthConditions.hypertension?.severity) {
          prompt += `\n- High Blood Pressure: ${userProfile.healthConditions.hypertension.severity} severity`;
        }
        if (userProfile.healthConditions.heartDisease?.type) {
          prompt += `\n- Heart Disease: ${userProfile.healthConditions.heartDisease.type} (${userProfile.healthConditions.heartDisease.severity} severity)`;
        }
        if (userProfile.healthConditions.kidneyDisease?.stage) {
          prompt += `\n- Kidney Disease: Stage ${userProfile.healthConditions.kidneyDisease.stage}`;
        }
        if (userProfile.healthConditions.digestiveIssues) {
          const digestiveIssues = [];
          if (userProfile.healthConditions.digestiveIssues.ibs) digestiveIssues.push('IBS');
          if (userProfile.healthConditions.digestiveIssues.celiac) digestiveIssues.push('Celiac Disease');
          if (userProfile.healthConditions.digestiveIssues.lactoseIntolerant) digestiveIssues.push('Lactose Intolerant');
          if (digestiveIssues.length > 0) {
            prompt += `\n- Digestive Issues: ${digestiveIssues.join(', ')}`;
          }
        }
      }

      if (userProfile.allergies?.food?.length > 0) {
        prompt += `\n\nFOOD ALLERGIES:`;
        userProfile.allergies.food.forEach(allergy => {
          prompt += `\n- ${allergy.allergen}: ${allergy.severity} reaction (${allergy.reaction})`;
        });
      }

      if (userProfile.dietaryRestrictions) {
        const restrictions = [];
        if (userProfile.dietaryRestrictions.vegetarian) restrictions.push('Vegetarian');
        if (userProfile.dietaryRestrictions.vegan) restrictions.push('Vegan');
        if (userProfile.dietaryRestrictions.keto) restrictions.push('Keto');
        if (userProfile.dietaryRestrictions.lowCarb) restrictions.push('Low Carb');
        if (userProfile.dietaryRestrictions.lowSodium) restrictions.push('Low Sodium');
        if (userProfile.dietaryRestrictions.lowSugar) restrictions.push('Low Sugar');
        if (userProfile.dietaryRestrictions.glutenFree) restrictions.push('Gluten Free');
        if (userProfile.dietaryRestrictions.dairyFree) restrictions.push('Dairy Free');

        if (restrictions.length > 0) {
          prompt += `\n\nDIETARY RESTRICTIONS: ${restrictions.join(', ')}`;
        }
      }

      if (userProfile.healthGoals) {
        prompt += `\n\nHEALTH GOALS:`;
        if (userProfile.healthGoals.weightManagement?.goal) {
          prompt += `\n- Weight Goal: ${userProfile.healthGoals.weightManagement.goal} weight (Current: ${userProfile.healthGoals.weightManagement.currentWeight}lbs, Target: ${userProfile.healthGoals.weightManagement.targetWeight}lbs)`;
        }
        if (userProfile.healthGoals.bloodSugar?.goal) {
          prompt += `\n- Blood Sugar: ${userProfile.healthGoals.bloodSugar.goal} (Current A1C: ${userProfile.healthGoals.bloodSugar.currentHbA1c}%, Target: ${userProfile.healthGoals.bloodSugar.targetHbA1c}%)`;
        }
        if (userProfile.healthGoals.bloodPressure?.goal) {
          prompt += `\n- Blood Pressure: ${userProfile.healthGoals.bloodPressure.goal} (Target: ${userProfile.healthGoals.bloodPressure.targetSystolic}/${userProfile.healthGoals.bloodPressure.targetDiastolic})`;
        }
      }

      if (userProfile.medications?.length > 0) {
        prompt += `\n\nCURRENT MEDICATIONS:`;
        userProfile.medications.forEach(med => {
          prompt += `\n- ${med.name} (${med.dosage}): For ${med.purpose}`;
        });
      }

      prompt += `\n\nPERSONALIZATION INSTRUCTIONS:
- Consider their specific health conditions when giving advice
- Mention any relevant warnings based on their conditions
- Adjust recommendations based on their dietary restrictions
- Consider their health goals when scoring the food
- Be extra careful with allergen warnings if they have food allergies
- Give specific advice for their diabetes/blood pressure/heart health if applicable
- Make the analysis feel personal and relevant to their situation`;
    }

    return prompt;
  }

  parseClaudeResponse(responseText, searchQuery, searchType) {
    try {
      let cleanText = responseText.trim();

      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json') || cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      try {
        const parsed = JSON.parse(cleanText);
        return this.normalizeAnalysisResponse({
          productInfo: parsed.productInfo || null,
          healthImpact: parsed.healthImpact || 'neutral',
          score: parsed.score || 50,
          analysis: parsed.analysis || 'Analysis not available',
          recommendations: parsed.recommendations || [],
          warnings: parsed.warnings || [],
          benefits: parsed.benefits || [],
          nutritionalFacts: parsed.nutritionalFacts || {},
          simpleSummary: parsed.simpleSummary || 'Basic analysis available',
          rawResponse: responseText
        });
      } catch (parseError) {
        const jsonMatch = cleanText.match(/\{[\s\S]*/);
        if (jsonMatch) {
          let jsonText = jsonMatch[0];

          if (!jsonText.endsWith('}')) {
            const openBraces = (jsonText.match(/\{/g) || []).length;
            const closeBraces = (jsonText.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            for (let i = 0; i < missingBraces; i++) {
              jsonText += '}';
            }
          }

          try {
            const parsed = JSON.parse(jsonText);
            return this.normalizeAnalysisResponse({
              productInfo: parsed.productInfo || null,
              healthImpact: parsed.healthImpact || 'neutral',
              score: parsed.score || 50,
              analysis: parsed.analysis || 'Analysis not available',
              recommendations: parsed.recommendations || [],
              warnings: parsed.warnings || [],
              benefits: parsed.benefits || [],
              nutritionalFacts: parsed.nutritionalFacts || {},
              simpleSummary: parsed.simpleSummary || 'Basic analysis available',
              rawResponse: responseText
            });
          } catch (completionError) {
            return this.parseTextResponse(responseText, searchQuery, searchType);
          }
        } else {
          return this.parseTextResponse(responseText, searchQuery, searchType);
        }
      }
    } catch (error) {
      logger.error('Failed to parse Claude AI response', {
        error: error.message,
        responseText: responseText.substring(0, 200)
      });
      return this.parseTextResponse(responseText, searchQuery, searchType);
    }
  }

  normalizeAnalysisResponse(analysis) {
    const result = {
      healthImpact: this.normalizeHealthImpact(analysis.healthImpact),
      score: this.normalizeScore(analysis.score),
      analysis: this.normalizeText(analysis.analysis),
      recommendations: this.normalizeArray(analysis.recommendations),
      warnings: this.normalizeArray(analysis.warnings),
      benefits: this.normalizeArray(analysis.benefits),
      nutritionalFacts: this.normalizeNutritionalFacts(analysis.nutritionalFacts),
      simpleSummary: this.normalizeText(analysis.simpleSummary),
      isFallback: analysis.isFallback || false,
      fallbackReason: analysis.fallbackReason || null,
      rawResponse: analysis.rawResponse || null
    };

    if (analysis.productInfo) {
      result.productInfo = {
        name: analysis.productInfo.name || 'Unknown Product',
        brand: analysis.productInfo.brand || 'Unknown Brand',
        category: analysis.productInfo.category || 'Unknown Category',
        barcode: analysis.productInfo.barcode || null,
        servingSize: analysis.productInfo.servingSize || 'Not specified',
        identified: analysis.productInfo.identified === true
      };
    }

    return result;
  }

  normalizeHealthImpact(healthImpact) {
    const validImpacts = ['positive', 'negative', 'neutral', 'caution'];
    return validImpacts.includes(healthImpact) ? healthImpact : 'neutral';
  }

  normalizeScore(score) {
    const numScore = parseInt(score) || 50;
    return Math.max(0, Math.min(100, numScore));
  }

  normalizeText(text) {
    return typeof text === 'string' ? text.trim() : 'Analysis not available';
  }

  normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
  }

  normalizeNutritionalFacts(facts) {
    if (!facts || typeof facts !== 'object') {
      return {
        calories: 'Information not available',
        macros: 'Information not available',
        keyNutrients: []
      };
    }

    return {
      calories: this.normalizeText(facts.calories) || 'Information not available',
      macros: this.normalizeText(facts.macros) || 'Information not available',
      keyNutrients: this.normalizeArray(facts.keyNutrients || [])
    };
  }

  parseTextResponse(responseText, searchQuery, searchType) {
    const warnings = [];
    const benefits = [];

    if (responseText.toLowerCase().includes('good for you') || responseText.toLowerCase().includes('healthy')) {
      benefits.push('Good for your health');
    }
    if (responseText.toLowerCase().includes('sugar') || responseText.toLowerCase().includes('sweet')) {
      warnings.push('High in sugar');
    }
    if (responseText.toLowerCase().includes('salt') || responseText.toLowerCase().includes('sodium')) {
      warnings.push('High in salt');
    }
    if (responseText.toLowerCase().includes('energy')) {
      benefits.push('Gives you energy');
    }
    if (responseText.toLowerCase().includes('vitamins') || responseText.toLowerCase().includes('nutrients')) {
      benefits.push('Contains vitamins your body needs');
    }

    return this.normalizeAnalysisResponse({
      healthImpact: 'neutral',
      score: 60,
      analysis: responseText,
      recommendations: ['Eat in normal portions', 'Balance with other healthy foods'],
      warnings,
      benefits: benefits.length > 0 ? benefits : ['Contains nutrients your body needs'],
      simpleSummary: `Basic info about ${searchQuery} - check the full analysis for details.`,
      rawResponse: responseText,
      isFallback: true,
      fallbackReason: 'Text parsing fallback used'
    });
  }

  getFallbackAnalysis(searchQuery, searchType) {
    logger.warn('Using fallback analysis', { query: searchQuery, type: searchType });

    return this.normalizeAnalysisResponse({
      healthImpact: 'neutral',
      score: 50,
      analysis: `We're having trouble getting detailed info about "${searchQuery}" right now. This is a basic analysis - for the best advice, try again in a moment.`,
      recommendations: [
        'Eat in normal portions',
        'Check if you have any allergies',
        'Balance with other healthy foods'
      ],
      warnings: [],
      benefits: [
        'Gives your body energy',
        'Contains vitamins your body needs'
      ],
      nutritionalFacts: {
        calories: 'Depends on how much you eat',
        macros: 'Check the food label for details',
        keyNutrients: ['Vitamins and minerals your body needs']
      },
      simpleSummary: 'This food gives you energy and nutrients, but we need more info for better advice.',
      isFallback: true,
      fallbackReason: 'Claude AI service unavailable'
    });
  }
}

module.exports = new ClaudeAIService();
