import React from "react";
import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { LoginPage } from "./pages/LoginPage";
import { SuccessPage } from "./pages/SuccessPage";
import { AppGate } from "./pages/AppGate";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/app" element={<AppGate />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}
