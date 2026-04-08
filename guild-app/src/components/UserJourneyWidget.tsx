"use client";
import { useState } from "react";
import {
  Wallet,
  Shield,
  Vote,
  Star,
  FileText,
  Coins,
  ClipboardCheck,
  CheckCircle,
  Award,
  Layers,
  Lock,
  Unlock,
  Server,
  MessageSquare,
  LayoutDashboard,
  Box,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── Stage data ── */

interface Step {
  icon: React.ReactNode;
  label: string;
  detail: string;
}

interface Stage {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  steps: Step[];
}

const STAGES: Stage[] = [
  {
    id: 1,
    title: "Quick Start",
    subtitle: "Connect → Mint → Register → Vote → Earn XP",
    color: "#2dd4bf",
    steps: [
      { icon: <Wallet className="h-5 w-5" />, label: "Connect Wallet", detail: "Link your Radix Wallet via the Connect button — no XRD required." },
      { icon: <Shield className="h-5 w-5" />, label: "Mint Badge", detail: "Free on-chain NFT badge — your identity, vote, and XP tracker." },
      { icon: <FileText className="h-5 w-5" />, label: "Register on Telegram", detail: "Use /register in @rad_gov to link your badge to the governance bot." },
      { icon: <Vote className="h-5 w-5" />, label: "Cast Your First Vote", detail: "Vote on active proposals — each vote earns XP and a dice roll." },
      { icon: <Star className="h-5 w-5" />, label: "Earn XP", detail: "XP accrues from votes, bounties, and daily engagement." },
    ],
  },
  {
    id: 2,
    title: "Governance",
    subtitle: "Off-chain (Telegram) vs On-chain (CV2)",
    color: "#4ea8de",
    steps: [
      { icon: <MessageSquare className="h-5 w-5" />, label: "Off-chain Voting", detail: "Telegram bot: quick polls, charter parameters, low-friction governance." },
      { icon: <Layers className="h-5 w-5" />, label: "On-chain Voting (CV2)", detail: "Consultation v2: binding on-chain proposals with token-weighted votes." },
      { icon: <Shield className="h-5 w-5" />, label: "Badge-Weighted", detail: "Higher-tier badges carry more voting weight — merit, not money." },
      { icon: <FileText className="h-5 w-5" />, label: "Proposal Lifecycle", detail: "Draft → Active → Ended → Outcome recorded on-chain." },
    ],
  },
  {
    id: 3,
    title: "Bounty Pipeline",
    subtitle: "Create → Claim → Submit → Verify → Pay",
    color: "#a78bfa",
    steps: [
      { icon: <Coins className="h-5 w-5" />, label: "Create & Fund", detail: "Admin posts a bounty with XRD escrowed in a Scrypto smart contract." },
      { icon: <ClipboardCheck className="h-5 w-5" />, label: "Claim Task", detail: "Members browse open tasks and claim work via the bot or dashboard." },
      { icon: <FileText className="h-5 w-5" />, label: "Submit Work", detail: "Upload deliverables — enters a 72-hour dispute window." },
      { icon: <CheckCircle className="h-5 w-5" />, label: "Verify & Release", detail: "Admin verifies quality, escrow releases XRD to the worker." },
    ],
  },
  {
    id: 4,
    title: "Badge & XP System",
    subtitle: "5 tiers with XP thresholds and voting weights",
    color: "#f59e0b",
    steps: [
      { icon: <Award className="h-5 w-5" />, label: "Member (0 XP)", detail: "Starting tier — free badge, 1× voting weight." },
      { icon: <Award className="h-5 w-5" />, label: "Contributor (100 XP)", detail: "Active participant — 2× voting weight." },
      { icon: <Award className="h-5 w-5" />, label: "Builder (500 XP)", detail: "Regular contributor — 3× voting weight, bounty eligibility." },
      { icon: <Award className="h-5 w-5" />, label: "Steward (2,000 XP)", detail: "Trusted leader — 5× voting weight, admin nominations." },
      { icon: <Award className="h-5 w-5" />, label: "Elder (10,000 XP)", detail: "Top tier — 8× voting weight, full governance authority." },
    ],
  },
  {
    id: 5,
    title: "Charter Decision Map",
    subtitle: "3 phases with dependency unlocking",
    color: "#f472b6",
    steps: [
      { icon: <Unlock className="h-5 w-5" />, label: "Phase 1 — Foundations", detail: "Core parameters: name, treasury split, quorum, voting period." },
      { icon: <Lock className="h-5 w-5" />, label: "Phase 2 — Operations", detail: "Unlocked after Phase 1 — bounty rules, dispute resolution, roles." },
      { icon: <Lock className="h-5 w-5" />, label: "Phase 3 — Expansion", detail: "Unlocked after Phase 2 — federation, sub-DAOs, tokenomics." },
    ],
  },
  {
    id: 6,
    title: "Architecture",
    subtitle: "TG Bot ↔ Dashboard ↔ Scrypto ↔ CV2",
    color: "#00e49f",
    steps: [
      { icon: <MessageSquare className="h-5 w-5" />, label: "Telegram Bot", detail: "Grammy-powered bot — governance commands, badge registration, dice game." },
      { icon: <LayoutDashboard className="h-5 w-5" />, label: "Next.js Dashboard", detail: "Web app — proposals, bounties, profile, leaderboard, admin panel." },
      { icon: <Box className="h-5 w-5" />, label: "Scrypto Contracts", detail: "On-chain badge manager + bounty escrow on Radix mainnet." },
      { icon: <Server className="h-5 w-5" />, label: "CV2 Integration", detail: "Consultation v2 for binding on-chain governance votes." },
    ],
  },
];

/* ── Component ── */

export function UserJourneyWidget() {
  const [activeStage, setActiveStage] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const stage = STAGES[activeStage];

  const goTo = (idx: number) => {
    setActiveStage(idx);
    setActiveStep(0);
  };

  const prev = () => goTo(Math.max(0, activeStage - 1));
  const next = () => goTo(Math.min(STAGES.length - 1, activeStage + 1));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Stage selector tabs */}
        <div className="flex border-b overflow-x-auto">
          {STAGES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`flex-1 min-w-0 px-2 py-2.5 text-center text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                i === activeStage
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
          ))}
        </div>

        {/* Stage header */}
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] font-mono"
                style={{ borderLeft: `3px solid ${stage.color}` }}
              >
                {activeStage + 1}/{STAGES.length}
              </Badge>
              <span className="font-semibold text-sm">{stage.title}</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={prev}
                disabled={activeStage === 0}
                aria-label="Previous stage"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={next}
                disabled={activeStage === STAGES.length - 1}
                aria-label="Next stage"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="px-4 pb-4 sm:px-5 space-y-1.5">
          {stage.steps.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-muted hover:bg-accent/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 shrink-0 transition-transform"
                    style={{ color: isActive ? stage.color : undefined }}
                  >
                    {step.icon}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-[13px] font-medium leading-tight ${
                        isActive ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 transition-all overflow-hidden ${
                        isActive
                          ? "text-muted-foreground max-h-20 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {step.detail}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {STAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeStage ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Go to stage ${i + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
