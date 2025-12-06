/**
 * Rendering API Integrations
 * Blender/Unity APIを使用したレンダリング連携
 */

export interface BlenderConfig {
  apiUrl: string;
  apiKey: string;
}

export interface UnityConfig {
  apiUrl: string;
  apiKey: string;
}

export interface RenderingJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  progress?: number;
}

export interface Scene {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  characters: string[];
  dialogue: string;
  action: string;
  cameraAngle: string;
  mood: string;
}

export interface StoryboardShot {
  shotNumber: number;
  description: string;
  cameraAngle: string;
  composition: string;
  visualNotes: string;
}

/**
 * Blenderでレンダリング
 */
export async function renderWithBlender(
  scenes: Scene[],
  config: BlenderConfig
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/render`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenes,
        format: 'mp4',
        resolution: '1920x1080',
        fps: 30,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start Blender rendering');
    }

    const data: RenderingJob = await response.json();

    return {
      success: true,
      jobId: data.id,
    };
  } catch (error) {
    console.error('Failed to render with Blender:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unityでレンダリング
 */
export async function renderWithUnity(
  storyboard: StoryboardShot[],
  config: UnityConfig
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/render`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyboard,
        format: 'mp4',
        resolution: '1920x1080',
        fps: 60,
        quality: 'high',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start Unity rendering');
    }

    const data: RenderingJob = await response.json();

    return {
      success: true,
      jobId: data.id,
    };
  } catch (error) {
    console.error('Failed to render with Unity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * レンダリングジョブのステータスを取得
 */
export async function getRenderingStatus(
  jobId: string,
  config: BlenderConfig | UnityConfig
): Promise<{ success: boolean; job?: RenderingJob; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/render/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get rendering status');
    }

    const data: RenderingJob = await response.json();

    return {
      success: true,
      job: data,
    };
  } catch (error) {
    console.error('Failed to get rendering status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
