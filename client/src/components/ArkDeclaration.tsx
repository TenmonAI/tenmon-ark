import { useTranslation } from "react-i18next";
import { ARK_DECLARATION } from "@shared/arkDeclaration";

export function ArkDeclaration() {
  const { i18n } = useTranslation();
  const lang = i18n.language as keyof typeof ARK_DECLARATION;
  const declaration = ARK_DECLARATION[lang] || ARK_DECLARATION.en;

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          {declaration.title}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground">
          {declaration.subtitle}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-16">
        {declaration.sections.map((section, index) => (
          <section key={index} className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary border-b border-border pb-4">
              {section.title}
            </h2>
            
            {section.content && (
              <div className="text-lg md:text-xl leading-relaxed whitespace-pre-line text-foreground/90">
                {section.content}
              </div>
            )}

            {section.missions && (
              <div className="grid gap-6 md:grid-cols-2">
                {section.missions.map((mission) => (
                  <div
                    key={mission.number}
                    className="bg-card border border-border rounded-lg p-6 space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                        {mission.number}
                      </div>
                      <h3 className="text-xl font-bold text-card-foreground">
                        {mission.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {mission.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
