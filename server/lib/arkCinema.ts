/**
 * Ark Cinema Engine
 * アニメ映画OS × script生成 × storyboard × scene構築 × レンダリング連携
 */

import { invokeLLM } from "../_core/llm";

export interface Script {
  title: string;
  synopsis: string;
  scenes: Scene[];
  characters: Character[];
  duration: number; // 秒
}

export interface Scene {
  sceneNumber: number;
  location: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  characters: string[];
  dialogue: Dialogue[];
  action: string;
  duration: number; // 秒
  storyboard?: Storyboard;
}

export interface Character {
  name: string;
  description: string;
  personality: string;
  appearance: string;
}

export interface Dialogue {
  character: string;
  text: string;
  emotion: string;
}

export interface Storyboard {
  sceneNumber: number;
  shots: Shot[];
}

export interface Shot {
  shotNumber: number;
  cameraAngle: "wide" | "medium" | "close-up" | "extreme-close-up";
  cameraMovement: "static" | "pan" | "tilt" | "zoom" | "dolly";
  composition: string;
  visualDescription: string;
  duration: number; // 秒
}

export interface ArkCinemaOptions {
  topic: string;
  genre?: "action" | "comedy" | "drama" | "fantasy" | "sci-fi";
  duration?: number; // 秒
  targetLanguage?: string;
}

/**
 * スクリプト生成
 */
async function generateScript(
  topic: string,
  genre: string = "fantasy",
  duration: number = 300,
  targetLanguage: string = "ja"
): Promise<Script> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはアニメ映画のスクリプトライターです。
ジャンル: ${genre}
時間: ${duration}秒
言語: ${targetLanguage}

魅力的なストーリー、キャラクター、シーンを作成してください。`,
        },
        {
          role: "user",
          content: `トピック: ${topic}

以下の形式でJSON形式で回答してください：
{
  "title": "映画のタイトル",
  "synopsis": "あらすじ",
  "characters": [
    {
      "name": "キャラクター名",
      "description": "説明",
      "personality": "性格",
      "appearance": "外見"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "場所",
      "timeOfDay": "morning",
      "characters": ["キャラクター名"],
      "dialogue": [
        {
          "character": "キャラクター名",
          "text": "セリフ",
          "emotion": "感情"
        }
      ],
      "action": "アクション",
      "duration": 30
    }
  ]
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "映画のタイトル",
              },
              synopsis: {
                type: "string",
                description: "あらすじ",
              },
              characters: {
                type: "array",
                description: "キャラクターのリスト",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "キャラクター名",
                    },
                    description: {
                      type: "string",
                      description: "説明",
                    },
                    personality: {
                      type: "string",
                      description: "性格",
                    },
                    appearance: {
                      type: "string",
                      description: "外見",
                    },
                  },
                  required: ["name", "description", "personality", "appearance"],
                  additionalProperties: false,
                },
              },
              scenes: {
                type: "array",
                description: "シーンのリスト",
                items: {
                  type: "object",
                  properties: {
                    sceneNumber: {
                      type: "integer",
                      description: "シーン番号",
                    },
                    location: {
                      type: "string",
                      description: "場所",
                    },
                    timeOfDay: {
                      type: "string",
                      description: "時間帯",
                      enum: ["morning", "afternoon", "evening", "night"],
                    },
                    characters: {
                      type: "array",
                      description: "登場キャラクター",
                      items: {
                        type: "string",
                      },
                    },
                    dialogue: {
                      type: "array",
                      description: "セリフ",
                      items: {
                        type: "object",
                        properties: {
                          character: {
                            type: "string",
                            description: "キャラクター名",
                          },
                          text: {
                            type: "string",
                            description: "セリフ",
                          },
                          emotion: {
                            type: "string",
                            description: "感情",
                          },
                        },
                        required: ["character", "text", "emotion"],
                        additionalProperties: false,
                      },
                    },
                    action: {
                      type: "string",
                      description: "アクション",
                    },
                    duration: {
                      type: "integer",
                      description: "シーンの長さ（秒）",
                    },
                  },
                  required: ["sceneNumber", "location", "timeOfDay", "characters", "dialogue", "action", "duration"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "synopsis", "characters", "scenes"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      title: result.title || topic,
      synopsis: result.synopsis || "",
      scenes: result.scenes || [],
      characters: result.characters || [],
      duration,
    };
  } catch (error) {
    console.error("Failed to generate script:", error);
    return {
      title: topic,
      synopsis: "",
      scenes: [],
      characters: [],
      duration,
    };
  }
}

/**
 * ストーリーボード生成
 */
async function generateStoryboard(
  scene: Scene
): Promise<Storyboard> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはアニメ映画のストーリーボードアーティストです。
シーンを視覚的なショットに分解してください。`,
        },
        {
          role: "user",
          content: `シーン ${scene.sceneNumber}:
場所: ${scene.location}
時間帯: ${scene.timeOfDay}
アクション: ${scene.action}

以下の形式でJSON形式で回答してください：
{
  "shots": [
    {
      "shotNumber": 1,
      "cameraAngle": "wide",
      "cameraMovement": "static",
      "composition": "構図の説明",
      "visualDescription": "視覚的な説明",
      "duration": 5
    }
  ]
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "storyboard",
          strict: true,
          schema: {
            type: "object",
            properties: {
              shots: {
                type: "array",
                description: "ショットのリスト",
                items: {
                  type: "object",
                  properties: {
                    shotNumber: {
                      type: "integer",
                      description: "ショット番号",
                    },
                    cameraAngle: {
                      type: "string",
                      description: "カメラアングル",
                      enum: ["wide", "medium", "close-up", "extreme-close-up"],
                    },
                    cameraMovement: {
                      type: "string",
                      description: "カメラの動き",
                      enum: ["static", "pan", "tilt", "zoom", "dolly"],
                    },
                    composition: {
                      type: "string",
                      description: "構図の説明",
                    },
                    visualDescription: {
                      type: "string",
                      description: "視覚的な説明",
                    },
                    duration: {
                      type: "integer",
                      description: "ショットの長さ（秒）",
                    },
                  },
                  required: ["shotNumber", "cameraAngle", "cameraMovement", "composition", "visualDescription", "duration"],
                  additionalProperties: false,
                },
              },
            },
            required: ["shots"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      sceneNumber: scene.sceneNumber,
      shots: result.shots || [],
    };
  } catch (error) {
    console.error("Failed to generate storyboard:", error);
    return {
      sceneNumber: scene.sceneNumber,
      shots: [],
    };
  }
}

/**
 * レンダリング連携（外部API呼び出し）
 */
async function renderScene(
  scene: Scene,
  storyboard: Storyboard
): Promise<string | null> {
  try {
    // TODO: 外部レンダリングAPI（例：Blender API, Unity Render Streaming）を呼び出す
    console.log(`Rendering scene ${scene.sceneNumber}:`, scene.location);
    console.log("Storyboard shots:", storyboard.shots.length);

    // モック実装
    return `https://example.com/renders/scene-${scene.sceneNumber}.mp4`;
  } catch (error) {
    console.error("Failed to render scene:", error);
    return null;
  }
}

/**
 * アニメ映画を生成
 */
export async function generateAnimeMovie(
  options: ArkCinemaOptions
): Promise<{
  script: Script;
  storyboards: Storyboard[];
  renderUrls: string[];
}> {
  try {
    const {
      topic,
      genre = "fantasy",
      duration = 300,
      targetLanguage = "ja",
    } = options;

    // スクリプト生成
    const script = await generateScript(topic, genre, duration, targetLanguage);

    // ストーリーボード生成
    const storyboards: Storyboard[] = [];
    for (const scene of script.scenes) {
      const storyboard = await generateStoryboard(scene);
      storyboards.push(storyboard);
      scene.storyboard = storyboard;
    }

    // レンダリング（モック実装）
    const renderUrls: string[] = [];
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const storyboard = storyboards[i];
      if (scene && storyboard) {
        const renderUrl = await renderScene(scene, storyboard);
        if (renderUrl) {
          renderUrls.push(renderUrl);
        }
      }
    }

    return {
      script,
      storyboards,
      renderUrls,
    };
  } catch (error) {
    console.error("Failed to generate anime movie:", error);
    return {
      script: {
        title: options.topic,
        synopsis: "",
        scenes: [],
        characters: [],
        duration: options.duration || 300,
      },
      storyboards: [],
      renderUrls: [],
    };
  }
}
