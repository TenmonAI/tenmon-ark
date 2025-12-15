/**
 * Persona Styles Helper
 * Personaに応じたスタイルを取得するヘルパー関数
 */

import { getPersonaConfig, type PersonaType } from './personaDetector';

/**
 * Personaに応じたボタンのhover色を取得
 * 
 * @param persona - Personaタイプ
 * @returns hover時の背景色
 */
export function getPersonaHoverColor(persona: PersonaType): string {
  const config = getPersonaConfig(persona);
  
  const hoverColors: Record<PersonaType, string> = {
    architect: '#bfdbfe', // blue-200
    guardian: '#fecaca', // red-200
    companion: '#fbcfe8', // pink-200
    silent: '#e5e7eb', // gray-200
  };
  
  return hoverColors[persona];
}

/**
 * Personaに応じたボタンの縁色を取得
 * 
 * @param persona - Personaタイプ
 * @returns 縁色
 */
export function getPersonaBorderColor(persona: PersonaType): string {
  const config = getPersonaConfig(persona);
  return config.borderColor;
}

