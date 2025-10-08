const axios = require('axios');
const { getConfig } = require('../config/environments');
const logger = require('../config/logger');

class GoogleAIService {
  constructor() {
    this.config = getConfig();
    this.apiKey = 'AIzaSyAox6NOny2eTUCfxMBDgSGVlWBmCfE_NpM'; // Google AI API key
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.5-flash';
  }

  async analyzeProduct(searchQuery, searchType, userProfile = null) {
    try {
      logger.info('Starting Google AI analysis', {
        query: searchQuery,
        type: searchType,
        hasUserProfile: !!userProfile,
        apiKeyConfigured: !!this.apiKey,
        baseURL: this.baseURL,
        model: this.model
      });

      // Create personalized prompt based on user profile
      const prompt = this.createAnalysisPrompt(searchQuery, searchType, userProfile);

      const response = await axios.post(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Google AI analysis completed', {
        query: searchQuery,
        responseLength: response.data.candidates[0].content.parts[0].text.length
      });

      // Parse the response and structure it
      return this.parseGoogleResponse(response.data.candidates[0].content.parts[0].text, searchQuery, searchType);

    } catch (error) {
      logger.error('Google AI analysis failed', {
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        query: searchQuery,
        type: searchType
      });

      // Return fallback analysis if Google AI fails
      return this.getFallbackAnalysis(searchQuery, searchType);
    }
  }

  createAnalysisPrompt(searchQuery, searchType, userProfile) {
    let prompt = `You are a friendly nutrition expert. Analyze this food item: "${searchQuery}" (${searchType})

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

    // Add user-specific health context if available
    if (userProfile) {
      prompt += `\n\nPERSONALIZED HEALTH CONTEXT:
      
IMPORTANT: Consider this user's specific health situation when analyzing the food. Make your recommendations personal and relevant to their health needs.

HEALTH CONDITIONS:`;
      
      // Add health conditions
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

      // Add allergies
      if (userProfile.allergies?.food?.length > 0) {
        prompt += `\n\nFOOD ALLERGIES:`;
        userProfile.allergies.food.forEach(allergy => {
          prompt += `\n- ${allergy.allergen}: ${allergy.severity} reaction (${allergy.reaction})`;
        });
      }

      // Add dietary restrictions
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

      // Add health goals
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

      // Add medications
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

  parseGoogleResponse(responseText, searchQuery, searchType) {
    try {
      // Clean the response text first
      let cleanText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json') || cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to parse the entire cleaned text as JSON first
      try {
        const parsed = JSON.parse(cleanText);
        return this.normalizeAnalysisResponse({
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
        // If direct parsing fails, try to extract and complete JSON from the response
        const jsonMatch = cleanText.match(/\{[\s\S]*/);
        if (jsonMatch) {
          let jsonText = jsonMatch[0];
          
          // Try to complete incomplete JSON
          if (!jsonText.endsWith('}')) {
            // Count open braces and close them
            const openBraces = (jsonText.match(/\{/g) || []).length;
            const closeBraces = (jsonText.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            // Add missing closing braces
            for (let i = 0; i < missingBraces; i++) {
              jsonText += '}';
            }
          }
          
          try {
            const parsed = JSON.parse(jsonText);
            return this.normalizeAnalysisResponse({
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
            // If completion fails, fall back to text parsing
            return this.parseTextResponse(responseText, searchQuery, searchType);
          }
        } else {
          // If no JSON found, create structured response from text
          return this.parseTextResponse(responseText, searchQuery, searchType);
        }
      }
    } catch (error) {
      logger.error('Failed to parse Google AI response', {
        error: error.message,
        responseText: responseText.substring(0, 200)
      });
      return this.parseTextResponse(responseText, searchQuery, searchType);
    }
  }

  normalizeAnalysisResponse(analysis) {
    // Ensure all required fields exist with proper types
    return {
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
    // Extract key information from text response
    const analysis = responseText;
    const recommendations = [];
    const warnings = [];
    const benefits = [];

    // Simple keyword-based parsing for user-friendly language
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
      analysis: analysis,
      recommendations: recommendations.length > 0 ? recommendations : ['Eat in normal portions', 'Balance with other healthy foods'],
      warnings: warnings,
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
      fallbackReason: 'Google AI service unavailable'
    });
  }
}

module.exports = new GoogleAIService();
