/**
 * ============================================================
 *  SEED TREE VIEWER — Seed Tree ビューアー
 * ============================================================
 * 
 * Seed の階層構造を可視化
 * ============================================================
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";

export function SeedTreeViewer() {
  const [seeds, setSeeds] = useState([
    { id: "seed-1", name: "Seed 1", children: ["seed-2", "seed-3"] },
    { id: "seed-2", name: "Seed 2", children: [] },
    { id: "seed-3", name: "Seed 3", children: [] },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Seed Tree Viewer
        </CardTitle>
        <CardDescription>Seed の階層構造を可視化</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {seeds.map((seed) => (
            <div key={seed.id} className="p-2 border rounded">
              <p className="font-medium">{seed.name}</p>
              {seed.children.length > 0 && (
                <div className="ml-4 mt-2 space-y-1">
                  {seed.children.map((childId) => (
                    <div key={childId} className="text-sm text-muted-foreground">
                      └ {childId}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

