/**
 * Persona Badge Component
 * Personaに応じた色・アニメーションを表示
 */

import { Badge } from '@/components/ui/badge';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';
import { getPersonaConfig, type PersonaType } from '@/lib/atlas/personaDetector';

interface PersonaBadgeProps {
  persona: PersonaType;
  className?: string;
}

export function PersonaBadge({ persona, className }: PersonaBadgeProps) {
  const config = getPersonaConfig(persona);

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Badge
      variant="secondary"
      className={`text-xs ${colorClasses[config.color]} ${className || ''}`}
      style={{
        animation: `personaFadeIn ${ALPHA_TRANSITION_DURATION}ms ease-out both`,
      }}
    >
      {config.name}
    </Badge>
  );
}

