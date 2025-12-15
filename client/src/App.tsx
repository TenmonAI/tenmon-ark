/**
 * App.tsx - Root Application Component
 * ROOT-FIX v1: 最小構造に再構築
 * 
 * 構造:
 * - EnhancedErrorBoundary (エラー境界)
 * - ThemeProvider (テーマ管理)
 * - TooltipProvider (ツールチップ)
 * - Toaster (通知)
 * - HeaderNavigationSlot (ヘッダーナビゲーション)
 * - Router (ルーティング)
 * - FloatingButtonsSlot (フローティングボタン)
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import { EnhancedErrorBoundary } from "./components/system/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import ChatRoom from "./pages/ChatRoom";
import ChatDivine from "./pages/ChatDivine";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import About from "./pages/About";
import ArkCore from "./pages/ArkCore";
import ArkProjects from "./pages/ArkProjects";
import ArkNewProject from "./pages/ArkNewProject";
import ArkProjectDetail from "./pages/ArkProjectDetail";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "@/pages/ark/Projects";
import CreateProject from "@/pages/ark/CreateProject";
import KotodamaConverter from "@/pages/kotodama/KotodamaConverter";
import GojuonChart from "@/pages/kotodama/GojuonChart";
import UniversalConverter from "@/pages/universal/UniversalConverter";
// Phase 5-9
import ArkBrowser from "@/pages/arkBrowser/ArkBrowser";
import ArkBrowserV2 from "@/pages/arkBrowser/ArkBrowserV2";
import ArkWriter from "@/pages/arkWriter/ArkWriter";
import ArkSNS from "@/pages/arkSNS/ArkSNS";
import ArkCinema from "@/pages/arkCinema/ArkCinema";
import ULCEV3 from "@/pages/ulce/ULCEV3";
import ApiSettings from "@/pages/settings/ApiSettings";
import EmbedManagement from "@/pages/settings/EmbedManagement";
import Settings from "@/pages/Settings";
import LifeGuardian from "@/pages/lifeGuardian/LifeGuardian";
import SoulSync from "@/pages/soulSync/SoulSync";
import APIDocs from "@/pages/docs/APIDocs";
import MobileOS from "@/pages/mobileOS/MobileOS";
import SelfReviewPage from "@/pages/selfReview/SelfReviewPage";
import SelfEvolutionPage from "@/pages/selfEvolution/SelfEvolutionPage";
import AutoFixPage from "@/pages/selfEvolution/AutoFixPage";
import LoopStatusPage from "@/pages/selfEvolution/LoopStatusPage";
import DistributedCloud from "@/pages/cloud/DistributedCloud";
import TestRunnerPage from "@/pages/tests/TestRunnerPage";
import DeviceClusterDashboard from "@/deviceCluster-v3/ui/DeviceClusterDashboard";
import ArkShield from "@/pages/arkShield/ArkShield";
// Phase 5-7: Fractal OS Dashboard, Ethics Dashboard, Soul Sync Settings
import FractalDashboard from "@/pages/FractalDashboard";
import EthicsDashboard from "@/pages/EthicsDashboard";
import SoulSyncSettings from "@/pages/SoulSyncSettings";
import NotificationSettings from "@/pages/NotificationSettings";
import Speak from "@/pages/Speak";
import Talk from "@/pages/Talk";
import SelfHealing from "@/pages/SelfHealing";
import SelfBuild from "@/pages/SelfBuild";
import AutonomousMode from "@/pages/AutonomousMode";
import AutonomousDashboard from "@/pages/AutonomousDashboard";
import UltraIntegrationDashboard from "@/pages/UltraIntegrationDashboard";
// 天津金木・いろは言灵解析システム
import AmatsuKanagiAnalysis from "@/pages/AmatsuKanagiAnalysis";
import IrohaAnalysis from "@/pages/IrohaAnalysis";
import AmatsuKanagiPatterns from "@/pages/AmatsuKanagiPatterns";
import IrohaCharacters from "@/pages/IrohaCharacters";
import KotodamaCore from "@/pages/KotodamaCore";
import ConversationSettings from "@/pages/ConversationSettings";
import ProfileSetup from "@/pages/ProfileSetup";
import ProfileDetail from "@/pages/ProfileDetail";
import OverBeingHome from "@/pages/OverBeingHome";
import TwinCorePersonaDemo from "@/pages/TwinCorePersonaDemo";
import LpChatFrame from "@/pages/embed/LpChatFrame";
import EmbedChatPage from "@/pages/embed/EmbedChatPage";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import CustomArks from "@/pages/CustomArks";
import FounderFeedback from "@/pages/FounderFeedback";
import ConciergeManager from "@/pages/ConciergeManager";
import { WorldLaunchWizard } from "@/onboarding/worldLaunchWizard";
import AdminTradePage from "@/pages/admin/trade/page";
// ROOT-FIX v1: Global Slots (App.tsxから分離)
import { HeaderNavigationSlot } from "@/components/global/slots/HeaderNavigationSlot";
import { FloatingButtonsSlot } from "@/components/global/slots/FloatingButtonsSlot";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={About} />
      <Route path={"/ark-core"} component={ArkCore} />
      <Route path={"/ark"} component={ArkProjects} />
      <Route path={"/ark/new"} component={ArkNewProject} />
      <Route path={"/ark/project/:id"} component={ArkProjectDetail} />
      <Route path={"/ark/projects"} component={Projects} />
      <Route path={"/ark/create"} component={CreateProject} />
      <Route path={"/project/:id"} component={ProjectDetail} />
      <Route path={"/plans"} component={Plans} />
      <Route path={"/chat"} component={ChatDivine} />
      <Route path={"/chat/legacy"} component={ChatRoom} />
      <Route path={"/subscription"} component={Subscription} />
      <Route path={"/subscription/success"} component={SubscriptionSuccess} />
      <Route path={"/developer"} component={DeveloperDashboard} />
      <Route path={"/admin/trade"} component={AdminTradePage} />
      <Route path={"/kotodama/converter"} component={KotodamaConverter} />
      <Route path={"/kotodama/gojuon"} component={GojuonChart} />
      <Route path={"/kotodama/core"} component={KotodamaCore} />
      <Route path={"/universal/converter"} component={UniversalConverter} />
      {/* Phase 5-9: Ark Browser, Guardian, Soul Sync, Cloud, Ark Shield */}
      <Route path={"/ark/browser"} component={ArkBrowserV2} />
      <Route path={"/ark/browser/v1"} component={ArkBrowser} />
      <Route path={"/ark/writer"} component={ArkWriter} />
      <Route path={"/ark/sns"} component={ArkSNS} />
      <Route path={"/ark/cinema"} component={ArkCinema} />
      <Route path={"/ulce"} component={ULCEV3} />
      <Route path={"/settings/api"} component={ApiSettings} />
      <Route path={"/lifeGuardian"} component={LifeGuardian} />
      <Route path={"/soul-sync"} component={SoulSync} />
      <Route path={"/docs"} component={APIDocs} />
      <Route path={"/mobileOS"} component={MobileOS} />
      <Route path={"/self-review"} component={SelfReviewPage} />
      <Route path={"/self-evolution"} component={SelfEvolutionPage} />
      <Route path={"/self-evolution/autofix"} component={AutoFixPage} />
      <Route path={"/self-evolution/loop"} component={LoopStatusPage} />
      <Route path={"/cloud"} component={DistributedCloud} />
      <Route path={"/tests"} component={TestRunnerPage} />
      <Route path={"/ark-shield"} component={ArkShield} />
      <Route path={"/deviceCluster-v3"} component={DeviceClusterDashboard} />
      {/* Phase 5-7: Fractal OS Dashboard, Ethics Dashboard, Soul Sync Settings */}
      <Route path={"/fractal/dashboard"} component={FractalDashboard} />
      <Route path={"/ethics/dashboard"} component={EthicsDashboard} />
      <Route path={"/soul-sync/settings"} component={SoulSyncSettings} />
      <Route path={"/notification/settings"} component={NotificationSettings} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/custom-arks"} component={CustomArks} />
      <Route path={"/founder-feedback"} component={FounderFeedback} />
      <Route path={"/settings/embed"} component={EmbedManagement} />
      <Route path={"/speak"} component={Speak} />
      <Route path={"/talk"} component={Talk} />
      <Route path={"/self-healing"} component={SelfHealing} />
      <Route path={"/self-build"} component={SelfBuild} />
      <Route path={"/autonomous-mode"} component={AutonomousMode} />
      <Route path={"/autonomous-dashboard"} component={AutonomousDashboard} />
      {/* FINAL EVOLUTION PHASE vΦ: Ultra Integration Dashboard */}
      <Route path={"/dashboard/system"} component={UltraIntegrationDashboard} />
      {/* 天津金木・いろは言灵解析システム */}
      <Route path={"/amatsu-kanagi/analysis"} component={AmatsuKanagiAnalysis} />
      <Route path={"/iroha/analysis"} component={IrohaAnalysis} />
      <Route path={"/amatsu-kanagi/patterns"} component={AmatsuKanagiPatterns} />
      <Route path={"/iroha/characters"} component={IrohaCharacters} />
      <Route path={"/conversation/settings"} component={ConversationSettings} />
      <Route path={"/profile/setup"} component={ProfileSetup} />
      <Route path={"/profile/detail"} component={ProfileDetail} />
      <Route path={"/overbeing"} component={OverBeingHome} />
      {/* LP-QA Widget */}
      <Route path={"/embed/qa"} component={LpChatFrame} />
      {/* 旧LPルートを新LPにリダイレクト */}
      <Route path={"/embed/qa-frame"}>
        {() => {
          window.location.replace("/embed/qa");
          return null;
        }}
      </Route>
      {/* Embed OS - Dynamic Embed Chat */}
      <Route path={"/embed/ark-chat-:uniqueId"} component={EmbedChatPage} />
      <Route path={"/twin-core-persona"} component={TwinCorePersonaDemo} />
      <Route path={"/concierge"} component={ConciergeManager} />
      <Route path={"/worldlaunch"} component={WorldLaunchWizard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * App Component - Minimal Structure (ROOT-FIX v1)
 * 
 * 階層:
 * 1. EnhancedErrorBoundary - エラー境界（最外層）
 * 2. ThemeProvider - テーマ管理
 * 3. TooltipProvider - ツールチップ
 * 4. Toaster - 通知
 * 5. HeaderNavigationSlot - ヘッダーナビゲーション（分離）
 * 6. Router - ルーティング
 * 7. FloatingButtonsSlot - フローティングボタン（分離）
 */
function App() {
  return (
    <EnhancedErrorBoundary
      onError={(error, errorInfo) => {
        // React Error #185 detection
        console.error('[App Error Boundary] Error caught:', error.message);
        console.error('[App Error Boundary] Component stack:', errorInfo.componentStack);
      }}
    >
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <HeaderNavigationSlot />
          <Router />
          <FloatingButtonsSlot />
        </TooltipProvider>
      </ThemeProvider>
    </EnhancedErrorBoundary>
  );
}

export default App;
