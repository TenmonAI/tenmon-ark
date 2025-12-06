/**
 * Header Navigation Slot
 * Chat-First Navigation v1.0
 * 
 * ROOT-FIX v1: App.tsxから分離
 * HeaderNavigationを独立管理
 * 
 * IFRAME-FIX: /embed/* ルートでは非表示
 */

import HeaderNavigation from "@/components/mobile/HeaderNavigation";
import { useLocation } from "wouter";

export function HeaderNavigationSlot() {
  const [location] = useLocation();
  
  // Hide header on iframe embed pages
  if (location.startsWith("/embed/")) {
    return null;
  }
  
  return <HeaderNavigation />;
}
