import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlannerPage } from "./pages/PlannerPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SavedTripsPage } from "./pages/SavedTripsPage";
import { WelcomePage } from "./pages/WelcomePage";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { AuroraBackground } from "./components/ui/AuroraBackground";
import { Navbar } from "./components/ui/Navbar";
import { useAuth } from "./hooks/useAuth";

function App() {
  const [currentView, setCurrentView] = useState("welcome");
  const { isAuthenticated, user, logout, loadUser } = useAuth();

  useEffect(() => {
    loadUser();
  }, []);

  const handleSignOut = () => {
    logout();
    setCurrentView("planner");
  };

  const renderView = () => {
    switch (currentView) {
      case "welcome":
        return (
          <WelcomePage
            onStart={() => setCurrentView(isAuthenticated ? "planner" : "login")}
          />
        );
      case "login":
        return (
          <LoginPage
            onSuccess={() => setCurrentView("planner")}
            onToggleRegister={() => setCurrentView("register")}
          />
        );
      case "register":
        return (
          <RegisterPage
            onSuccess={() => setCurrentView("planner")}
            onToggleLogin={() => setCurrentView("login")}
          />
        );
      case "saved-trips":
        return <SavedTripsPage onBackToPlanner={() => setCurrentView("planner")} />;
      default:
        return <PlannerPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <ErrorBoundary>
      <AuroraBackground />
      <div className="min-h-screen flex flex-col">
        {currentView !== "welcome" && (
          <Navbar
            view={currentView}
            onNavigate={setCurrentView}
            isAuthenticated={isAuthenticated}
            userEmail={user?.email}
            onSignOut={handleSignOut}
          />
        )}
        <AnimatePresence mode="wait">
          <motion.main
            key={currentView}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="flex-1"
          >
            {renderView()}
          </motion.main>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

export default App;
