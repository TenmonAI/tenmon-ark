import { ArkDeclaration } from "@/components/ArkDeclaration";
import { Navbar } from "@/components/Navbar";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-16">
        <ArkDeclaration />
      </main>
    </div>
  );
}
