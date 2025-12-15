/**
 * ============================================================
 *  PRO GUIDE — Pro プランガイド
 * ============================================================
 * 
 * Pro プラン向けのガイドページ
 * ============================================================
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export function ProGuide() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Pro プランガイド</CardTitle>
          <CardDescription>
            Pro プランの機能と使い方
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-4">Concierge Persona</h3>
              <p className="text-muted-foreground mb-4">
                Concierge Persona を使用すると、サイト固有の知識のみを使用して回答します。
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>外部知識を一切参照しません</li>
                <li>サイト内のコンテンツのみを使用します</li>
                <li>自動的にサイトを学習します</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-4">Widget 埋め込み</h3>
              <p className="text-muted-foreground mb-4">
                1行のコードで Widget を埋め込みできます。
              </p>
              <pre className="bg-muted p-4 rounded-lg">
                {`<script src="https://cdn.tenmon-ark.com/widget/embed.js" data-site-id="your-site-id"></script>`}
              </pre>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-4">AutoSite Learner</h3>
              <p className="text-muted-foreground mb-4">
                URL を指定するだけで、自動的にサイトを学習します。
              </p>
              <Button asChild>
                <Link to="/concierge">Concierge を開始</Link>
              </Button>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

