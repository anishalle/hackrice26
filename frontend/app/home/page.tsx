"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { APPWRITE_PROJECT_NAME } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { AccessibilityConsole } from "@/components/accessibility-console";
import { HermesAgent } from "@/components/hermes-agent";
import { VoicePreservation } from "@/components/voice-preservation";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  isAccessibilityPreferences,
} from "@/lib/accessibility";
import { AudioLines, Bot, LogOut, Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

function HomeContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "voice">("agent");
  const accessibilityPreferences = isAccessibilityPreferences(user?.prefs?.accessibility)
    ? user.prefs.accessibility
    : DEFAULT_ACCESSIBILITY_PREFERENCES;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main Header */}
      <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight">{APPWRITE_PROJECT_NAME}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                {user.name ? `${user.name} (${user.email})` : user.email}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-1.5"
            >
              {loggingOut ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5" />
              )}
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10">
        <div
          className="mb-8 inline-flex rounded-xl border bg-card p-1 shadow-sm"
          role="tablist"
          aria-label="Workspace"
        >
          <button
            id="agent-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "agent"}
            aria-controls="agent-panel"
            onClick={() => setActiveTab("agent")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "agent"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Bot className="size-4" />
            Agent
          </button>
          <button
            id="voice-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "voice"}
            aria-controls="voice-panel"
            onClick={() => setActiveTab("voice")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "voice"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <AudioLines className="size-4" />
            Voice preservation
          </button>
        </div>

        {activeTab === "agent" ? (
          <section id="agent-panel" role="tabpanel" aria-labelledby="agent-tab">
            <AccessibilityConsole
              key={user?.$id ?? "guest"}
              initialPreferences={accessibilityPreferences}
            />
            <HermesAgent />
          </section>
        ) : (
          <section id="voice-panel" role="tabpanel" aria-labelledby="voice-tab">
            {user && (
              <VoicePreservation
                ownerSubject={user.$id}
                displayName={user.name || "My preserved voice"}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
