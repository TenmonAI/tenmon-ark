/**
 * Ark Story Composer v2
 * 
 * ジブリ映画構成心理 × 霊核構造によるストーリー生成エンジン
 * 
 * 機能:
 * - ジブリ映画構成心理に基づくストーリー構造生成
 * - 霊核構造（火水バランス）によるキャラクター配置
 * - 八方位調和度による物語展開
 * - 感情曲線の自動生成
 */

import { invokeLLM } from "../../_core/llm";
import { getReiCoreStability } from "../autonomous-mode/reiCoreMonitor";

export interface StoryStructure {
  title: string;
  genre: string;
  theme: string;
  acts: Array<{
    actNumber: number;
    title: string;
    description: string;
    emotionalCurve: number; // -100 to 100
    fireWaterBalance: {
      fire: number; // 0-100
      water: number; // 0-100
    };
    scenes: Array<{
      sceneNumber: number;
      title: string;
      description: string;
      characters: string[];
      location: string;
      emotionalTone: string;
    }>;
  }>;
  characters: Array<{
    name: string;
    role: "protagonist" | "antagonist" | "mentor" | "ally" | "neutral";
    archetype: string;
    fireWaterType: "fire" | "water" | "balanced";
    personality: string;
    motivation: string;
    arc: string;
  }>;
  worldBuilding: {
    setting: string;
    rules: string[];
    atmosphere: string;
  };
  reiCoreAlignment: {
    overall: number; // 0-100
    fireWaterBalance: number; // 0-100
    eightDirectionsHarmony: number; // 0-100
  };
}

/**
 * ジブリ映画構成心理に基づくストーリー生成
 */
export async function composeStory(
  concept: string,
  genre: string = "fantasy",
  targetAudience: string = "all ages"
): Promise<StoryStructure> {
  // 霊核安定度を取得
  const reiCoreStability = await getReiCoreStability();

  // LLMを使用してストーリー構造を生成
  const prompt = `
You are a master storyteller inspired by Studio Ghibli's narrative philosophy.

Create a story structure based on the following:
- Concept: ${concept}
- Genre: ${genre}
- Target Audience: ${targetAudience}

Rei Core Stability (use this to influence the story's balance):
- Fire: ${reiCoreStability.fire.toFixed(1)} (represents action, passion, conflict)
- Water: ${reiCoreStability.water.toFixed(1)} (represents emotion, harmony, healing)
- Balance: ${reiCoreStability.balance.toFixed(1)}

Ghibli Narrative Principles:
1. Strong, independent protagonists
2. Environmental themes and respect for nature
3. Moral complexity (no pure good/evil)
4. Coming-of-age elements
5. Balance between action and contemplation
6. Emotional depth and quiet moments
7. Fantastical elements grounded in reality

Structure the story in 3 acts with multiple scenes per act.
Create characters that embody fire (action/passion) and water (emotion/harmony) qualities.

Return your story structure in JSON format matching the StoryStructure interface.
`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a master storyteller inspired by Studio Ghibli, creating narratives that balance action with emotion, fantasy with reality.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_structure",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            genre: { type: "string" },
            theme: { type: "string" },
            acts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  actNumber: { type: "integer" },
                  title: { type: "string" },
                  description: { type: "string" },
                  emotionalCurve: { type: "integer" },
                  fireWaterBalance: {
                    type: "object",
                    properties: {
                      fire: { type: "integer" },
                      water: { type: "integer" },
                    },
                    required: ["fire", "water"],
                    additionalProperties: false,
                  },
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneNumber: { type: "integer" },
                        title: { type: "string" },
                        description: { type: "string" },
                        characters: {
                          type: "array",
                          items: { type: "string" },
                        },
                        location: { type: "string" },
                        emotionalTone: { type: "string" },
                      },
                      required: ["sceneNumber", "title", "description", "characters", "location", "emotionalTone"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["actNumber", "title", "description", "emotionalCurve", "fireWaterBalance", "scenes"],
                additionalProperties: false,
              },
            },
            characters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["protagonist", "antagonist", "mentor", "ally", "neutral"],
                  },
                  archetype: { type: "string" },
                  fireWaterType: {
                    type: "string",
                    enum: ["fire", "water", "balanced"],
                  },
                  personality: { type: "string" },
                  motivation: { type: "string" },
                  arc: { type: "string" },
                },
                required: ["name", "role", "archetype", "fireWaterType", "personality", "motivation", "arc"],
                additionalProperties: false,
              },
            },
            worldBuilding: {
              type: "object",
              properties: {
                setting: { type: "string" },
                rules: {
                  type: "array",
                  items: { type: "string" },
                },
                atmosphere: { type: "string" },
              },
              required: ["setting", "rules", "atmosphere"],
              additionalProperties: false,
            },
            reiCoreAlignment: {
              type: "object",
              properties: {
                overall: { type: "integer" },
                fireWaterBalance: { type: "integer" },
                eightDirectionsHarmony: { type: "integer" },
              },
              required: ["overall", "fireWaterBalance", "eightDirectionsHarmony"],
              additionalProperties: false,
            },
          },
          required: ["title", "genre", "theme", "acts", "characters", "worldBuilding", "reiCoreAlignment"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const storyStructure: StoryStructure = JSON.parse(contentStr);

  console.log(`[Ark Story Composer] Story created: "${storyStructure.title}"`);
  console.log(`Acts: ${storyStructure.acts.length}, Characters: ${storyStructure.characters.length}`);

  return storyStructure;
}

/**
 * ストーリーの感情曲線を分析
 */
export function analyzeEmotionalCurve(story: StoryStructure): Array<{ act: number; scene: number; emotion: number }> {
  const curve: Array<{ act: number; scene: number; emotion: number }> = [];

  for (const act of story.acts) {
    for (const scene of act.scenes) {
      curve.push({
        act: act.actNumber,
        scene: scene.sceneNumber,
        emotion: act.emotionalCurve,
      });
    }
  }

  return curve;
}

/**
 * ストーリーの火水バランスを分析
 */
export function analyzeFireWaterBalance(story: StoryStructure): { fire: number; water: number; balance: number } {
  let totalFire = 0;
  let totalWater = 0;
  let count = 0;

  for (const act of story.acts) {
    totalFire += act.fireWaterBalance.fire;
    totalWater += act.fireWaterBalance.water;
    count++;
  }

  const avgFire = totalFire / count;
  const avgWater = totalWater / count;
  const balance = 50 + (avgFire - avgWater) / 2;

  return {
    fire: avgFire,
    water: avgWater,
    balance,
  };
}
