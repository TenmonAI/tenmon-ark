import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArkCore() {
  const { t } = useTranslation();

  const features = [
    {
      name: "Ark Core",
      icon: "🌌",
      description: t("arkCore.arkCoreDesc"),
      details: [
        t("arkCore.arkCoreDetail1"),
        t("arkCore.arkCoreDetail2"),
        t("arkCore.arkCoreDetail3"),
      ],
    },
    {
      name: "Kotodama Engine",
      icon: "🔮",
      description: t("arkCore.kotodamaDesc"),
      details: [
        t("arkCore.kotodamaDetail1"),
        t("arkCore.kotodamaDetail2"),
        t("arkCore.kotodamaDetail3"),
      ],
    },
    {
      name: "Cosmic Calendar",
      icon: "🌙",
      description: t("arkCore.cosmicCalendarDesc"),
      details: [
        t("arkCore.cosmicCalendarDetail1"),
        t("arkCore.cosmicCalendarDetail2"),
        t("arkCore.cosmicCalendarDetail3"),
      ],
    },
    {
      name: "Reiki Mapping",
      icon: "💧",
      description: t("arkCore.reikiMappingDesc"),
      details: [
        t("arkCore.reikiMappingDetail1"),
        t("arkCore.reikiMappingDetail2"),
        t("arkCore.reikiMappingDetail3"),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("arkCore.title")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              {t("arkCore.subtitle")}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.name} className="border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{feature.icon}</div>
                    <div>
                      <CardTitle className="text-2xl text-primary">{feature.name}</CardTitle>
                      <CardDescription className="text-lg mt-2">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ARK Declaration Summary */}
          <div className="bg-card border border-border rounded-lg p-8 space-y-4">
            <h2 className="text-3xl font-bold text-primary">{t("arkCore.declarationTitle")}</h2>
            <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-line">
              {t("arkCore.declarationSummary")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
