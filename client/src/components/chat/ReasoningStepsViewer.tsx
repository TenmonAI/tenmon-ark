/**
 * Reasoning Steps Viewer Component
 * Atlas Chatの推論ステップを折り畳み表示
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Brain, Sparkles, Folder, FolderOpen } from 'lucide-react';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

interface ReasoningStep {
  type: string;
  content: string;
  timestamp: string;
}

interface SeedRef {
  id: string;
  name?: string;
  type?: string;
  projectId?: number | null; // プロジェクトID（メタデータ）
}

interface FileRef {
  id: number;
  fileName: string;
  fileType?: string;
  projectId?: number | null; // プロジェクトID（メタデータ）
}

interface ReasoningStepsViewerProps {
  steps?: ReasoningStep[];
  finalThought?: string;
  usedSeeds?: SeedRef[];
  usedFiles?: FileRef[];
  currentProjectId?: number | null; // 現在のプロジェクトID（同プロジェクト判定用）
  className?: string;
}

export function ReasoningStepsViewer({
  steps = [],
  finalThought,
  usedSeeds = [],
  usedFiles = [],
  currentProjectId = null,
  className,
}: ReasoningStepsViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 表示するデータがない場合は非表示
  if ((!steps || steps.length === 0) && (!usedSeeds || usedSeeds.length === 0) && (!usedFiles || usedFiles.length === 0)) {
    return null;
  }

  return (
    <div className={`mt-2 ${className || ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <Brain className="w-3 h-3 mr-1" />
        使われた記憶を見る
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </Button>

      {isExpanded && (
        <Card
          className="mt-2 border-primary/20"
          style={{
            animation: `fadeIn ${ALPHA_TRANSITION_DURATION}ms ease-in-out`,
          }}
        >
          <CardContent className="p-3 space-y-2">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-2 rounded-md bg-muted/50 border border-border"
                style={{
                  animation: `slideIn ${ALPHA_TRANSITION_DURATION}ms ease-out ${idx * 50}ms both`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {step.type}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap">
                  {step.content}
                </p>
              </div>
            ))}

            {/* Used Seeds */}
            {usedSeeds && usedSeeds.length > 0 && (
              <div
                className="p-2 rounded-md bg-primary/10 border border-primary/30 mt-2"
                style={{
                  animation: `fadeIn ${ALPHA_TRANSITION_DURATION}ms ease-in-out ${steps.length * 50}ms both`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    使用された記憶 ({usedSeeds.length})
                  </span>
                </div>
                {/* 同プロジェクト/他プロジェクトを区別表示 */}
                {(() => {
                  const sameProjectSeeds = usedSeeds.filter(s => s.projectId !== null && s.projectId === currentProjectId);
                  const otherProjectSeeds = usedSeeds.filter(s => s.projectId !== null && s.projectId !== currentProjectId);
                  const noProjectSeeds = usedSeeds.filter(s => s.projectId === null);
                  
                  return (
                    <div className="space-y-2">
                      {sameProjectSeeds.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            • このプロジェクトの記憶 {sameProjectSeeds.length}件
                          </div>
                          <div className="space-y-1 ml-2">
                            {sameProjectSeeds.map((seed, idx) => (
                              <div key={idx} className="text-xs text-foreground flex items-center gap-1">
                                <FolderOpen className="w-3 h-3 text-primary" />
                                <span>{seed.name || seed.id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {otherProjectSeeds.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            • 他プロジェクトの知見 {otherProjectSeeds.length}件
                          </div>
                          <div className="space-y-1 ml-2">
                            {otherProjectSeeds.map((seed, idx) => (
                              <div key={idx} className="text-xs text-foreground flex items-center gap-1">
                                <Folder className="w-3 h-3 text-muted-foreground opacity-50" />
                                <span>{seed.name || seed.id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {noProjectSeeds.length > 0 && (
                        <div className="space-y-1">
                          {noProjectSeeds.map((seed, idx) => (
                            <div key={idx} className="text-xs text-foreground">
                              • {seed.name || seed.id}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Used Files */}
            {usedFiles && usedFiles.length > 0 && (
              <div
                className="p-2 rounded-md bg-primary/10 border border-primary/30 mt-2"
                style={{
                  animation: `fadeIn ${ALPHA_TRANSITION_DURATION}ms ease-in-out ${(steps.length + (usedSeeds?.length || 0)) * 50}ms both`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    使用されたファイル ({usedFiles.length})
                  </span>
                </div>
                {/* 同プロジェクト/他プロジェクトを区別表示 */}
                {(() => {
                  const sameProjectFiles = usedFiles.filter(f => f.projectId !== null && f.projectId === currentProjectId);
                  const otherProjectFiles = usedFiles.filter(f => f.projectId !== null && f.projectId !== currentProjectId);
                  const noProjectFiles = usedFiles.filter(f => f.projectId === null);
                  
                  return (
                    <div className="space-y-2">
                      {sameProjectFiles.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            • このプロジェクトの記憶 {sameProjectFiles.length}件
                          </div>
                          <div className="space-y-1 ml-2">
                            {sameProjectFiles.map((file, idx) => (
                              <div key={idx} className="text-xs text-foreground flex items-center gap-1">
                                <FolderOpen className="w-3 h-3 text-primary" />
                                <span>{file.fileName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {otherProjectFiles.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            • 他プロジェクトの知見 {otherProjectFiles.length}件
                          </div>
                          <div className="space-y-1 ml-2">
                            {otherProjectFiles.map((file, idx) => (
                              <div key={idx} className="text-xs text-foreground flex items-center gap-1">
                                <Folder className="w-3 h-3 text-muted-foreground opacity-50" />
                                <span>{file.fileName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {noProjectFiles.length > 0 && (
                        <div className="space-y-1">
                          {noProjectFiles.map((file, idx) => (
                            <div key={idx} className="text-xs text-foreground">
                              • {file.fileName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {finalThought && (
              <div
                className="p-2 rounded-md bg-primary/10 border border-primary/30 mt-2"
                style={{
                  animation: `fadeIn ${ALPHA_TRANSITION_DURATION}ms ease-in-out ${(steps.length + (usedSeeds?.length || 0) + (usedFiles?.length || 0)) * 50}ms both`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    Final Thought
                  </span>
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap">
                  {finalThought}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

