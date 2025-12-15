/**
 * Persona State Hook
 * Personaの現在状態と履歴を管理
 */

import { useState, useCallback, useEffect } from 'react';
import { PersonaType, detectPersona, getPersonaConfig, type PersonaConfig } from '@/lib/atlas/personaDetector';

export interface PersonaState {
  current: PersonaType;
  prev: PersonaType | null;
  config: PersonaConfig;
}

/**
 * Persona State Hook
 * 
 * @param initialPersona - 初期Persona（オプション）
 * @returns Persona状態と操作関数
 */
export function usePersonaState(initialPersona: PersonaType = 'companion') {
  const [state, setState] = useState<PersonaState>(() => {
    const config = getPersonaConfig(initialPersona);
    return {
      current: initialPersona,
      prev: null,
      config,
    };
  });

  /**
   * Personaを更新
   * 
   * @param persona - 新しいPersona
   */
  const setPersona = useCallback((persona: PersonaType) => {
    setState((prev) => {
      const config = getPersonaConfig(persona);
      return {
        current: persona,
        prev: prev.current,
        config,
      };
    });
  }, []);

  /**
   * メッセージからPersonaを自動判定して更新
   * 
   * @param message - 入力メッセージ
   * @param isMobile - モバイル環境かどうか
   * @param fireWaterBalance - 火水バランス（オプション、Reishō統合用）
   * @param kanagiPhase - 天津金木フェーズ（オプション、Reishō統合用）
   */
  const detectAndSetPersona = useCallback((
    message: string,
    isMobile: boolean = false,
    fireWaterBalance?: number,
    kanagiPhase?: "L-IN" | "L-OUT" | "R-IN" | "R-OUT"
  ) => {
    const detectedPersona = detectPersona(message, isMobile, fireWaterBalance, kanagiPhase);
    setPersona(detectedPersona);
  }, [setPersona]);

  /**
   * 前のPersonaに戻す
   */
  const revertToPrev = useCallback(() => {
    setState((prev) => {
      if (prev.prev === null) {
        return prev;
      }
      const config = getPersonaConfig(prev.prev);
      return {
        current: prev.prev,
        prev: prev.current,
        config,
      };
    });
  }, []);

  return {
    persona: state,
    setPersona,
    detectAndSetPersona,
    revertToPrev,
  };
}

