"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
  Play,
  Pause,
  ArrowRight,
  Zap,
  Scale,
  Clock,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XP_THRESHOLDS, TIER_COLORS } from "@/lib/constants";

/* ── Types ── */

interface StageConfig {
  id: number;
  title: string;
  subtitle: string;
  color: string;
}

const STAGE_META: StageConfig[] = [
  { id: 1, title: "Quick Start", subtitle: "Connect \u2192 Mint \u2192 Register \u2192 Vote \u2192 Earn XP", color: "#2dd4bf" },
  { id: 2, title: "Governance", subtitle: "Off-chain (Telegram) vs On-chain (CV2)", color: "#4ea8de" },
  { id: 3, title: "Bounty Pipeline", subtitle: "Create \u2192 Claim \u2192 Submit \u2192 Verify \u2192 Pay", color: "#a78bfa" },
  { id: 4, title: "Badge & XP", subtitle: "5 tiers \u00b7 XP thresholds \u00b7 game progression", color: "#f59e0b" },
  { id: 5, title: "Charter Map", subtitle: "3 phases with dependency unlocking", color: "#f472b6" },
  { id: 6, title: "Architecture", subtitle: "TG Bot \u2194 Dashboard \u2194 Scrypto \u2194 CV2", color: "#00e49f" },
];

/* ── Stage 1: Quick Start Flow ── */

const QUICK_STEPS = [
  { icon: Wallet, label: "Connect Wallet", detail: "Link your Radix Wallet \u2014 no XRD required. Click the connect button above." },
  { icon: Shield, label: "Mint Badge", detail: "Free on-chain NFT badge \u2014 your identity, vote, and XP tracker." },
  { icon: MessageSquare, label: "Register on TG", detail: "Use /register in @rad_gov to link your badge to the governance bot." },
  { icon: Vote, label: "Cast First Vote", detail: "Vote on active proposals \u2014 each vote earns +10 XP and a dice roll." },
  { icon: Star, label: "Earn XP & Level Up", detail: "XP accrues from votes, bounties, proposals, and daily engagement." },
];

function QuickStartStage({ activeStep, onStep }: { activeStep: number; onStep: (i: number) => void }) {
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="flex items-start gap-0 overflow-x-auto pb-2 -mx-1">
        {QUICK_STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          return (
            <div key={i} className="flex items-start shrink-0">
              <button
                onClick={() => onStep(i)}
                className="flex flex-col items-center w-[72px] group"
                aria-label={s.label}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary/20 ring-2 ring-primary scale-110 journey-pulse"
                      : isPast
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : "bg-muted group-hover:bg-accent/20"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-primary" : isPast ? "text-primary/70" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-[10px] mt-1.5 text-center leading-tight font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
              {i < QUICK_STEPS.length - 1 && (
                <div className="flex items-center mt-5 -mx-0.5">
                  <ArrowRight className={`h-3 w-3 shrink-0 ${i < activeStep ? "text-primary/60" : "text-muted-foreground/30"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 bg-muted rounded-lg px-4 py-3 journey-fade-in" key={activeStep}>
        <div className="text-[13px] font-medium mb-0.5">{QUICK_STEPS[activeStep].label}</div>
        <div className="text-[11px] text-muted-foreground">{QUICK_STEPS[activeStep].detail}</div>
      </div>
    </div>
  );
}

/* ── Stage 2: Governance Comparison ── */

function GovernanceStage() {
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-muted rounded-lg p-3 ring-1 ring-transparent hover:ring-[#4ea8de]/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-[#4ea8de]" />
            <span className="text-[13px] font-semibold">Off-Chain (Telegram)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-start gap-1.5"><Zap className="h-3 w-3 text-[#4ea8de] mt-0.5 shrink-0" /><span>Free \u2014 no transaction fees</span></li>
            <li className="flex items-start gap-1.5"><Shield className="h-3 w-3 text-[#4ea8de] mt-0.5 shrink-0" /><span>1 badge = 1 vote</span></li>
            <li className="flex items-start gap-1.5"><Clock className="h-3 w-3 text-[#4ea8de] mt-0.5 shrink-0" /><span>Quick polls, charter params, temp checks</span></li>
            <li className="flex items-start gap-1.5"><Star className="h-3 w-3 text-[#4ea8de] mt-0.5 shrink-0" /><span>+10 XP per vote + dice roll</span></li>
          </ul>
        </div>
        <div className="bg-muted rounded-lg p-3 ring-1 ring-transparent hover:ring-[#a78bfa]/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-[#a78bfa]" />
            <span className="text-[13px] font-semibold">On-Chain (CV2)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-start gap-1.5"><Scale className="h-3 w-3 text-[#a78bfa] mt-0.5 shrink-0" /><span>Binding \u2014 recorded on Radix ledger</span></li>
            <li className="flex items-start gap-1.5"><Coins className="h-3 w-3 text-[#a78bfa] mt-0.5 shrink-0" /><span>XRD-weighted vote power</span></li>
            <li className="flex items-start gap-1.5"><FileText className="h-3 w-3 text-[#a78bfa] mt-0.5 shrink-0" /><span>Treasury decisions, formal governance</span></li>
            <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-[#a78bfa] mt-0.5 shrink-0" /><span>Same system used by Radix Foundation</span></li>
          </ul>
        </div>
      </div>
      <div className="mt-3 bg-primary/5 rounded-lg px-3 py-2 text-[11px] text-muted-foreground text-center">
        <span className="text-primary font-medium">Lifecycle:</span> Draft \u2192 Active \u2192 Ended \u2192 Outcome on-chain
      </div>
    </div>
  );
}

/* ── Stage 3: Bounty Pipeline ── */

const BOUNTY_STEPS = [
  { icon: Coins, label: "Create & Fund", detail: "Task created with XRD locked in a Scrypto smart contract vault.", status: "open" },
  { icon: ClipboardCheck, label: "Claim", detail: "Badge holder claims task via bot or dashboard.", status: "assigned" },
  { icon: FileText, label: "Submit", detail: "Worker submits deliverables for review.", status: "submitted" },
  { icon: CheckCircle, label: "Verify", detail: "Verifier reviews quality and approves.", status: "verified" },
  { icon: Star, label: "Pay", detail: "Smart contract releases XRD to worker + XP awarded.", status: "paid" },
];

function BountyStage({ activeStep, onStep }: { activeStep: number; onStep: (i: number) => void }) {
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="flex items-center gap-1 mb-3 overflow-x-auto">
        {BOUNTY_STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          return (
            <div key={i} className="flex items-center shrink-0">
              <button
                onClick={() => onStep(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-[#a78bfa]/20 text-[#a78bfa] ring-1 ring-[#a78bfa]/40 journey-pulse"
                    : isPast
                      ? "bg-primary/10 text-primary/80"
                      : "bg-muted text-muted-foreground hover:bg-accent/20"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < BOUNTY_STEPS.length - 1 && (
                <ArrowRight className={`h-3 w-3 mx-0.5 shrink-0 ${i < activeStep ? "text-primary/50" : "text-muted-foreground/20"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-muted rounded-lg p-3 journey-fade-in" key={activeStep}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium">{BOUNTY_STEPS[activeStep].label}</span>
          <Badge variant="outline" className="text-[9px] font-mono">{BOUNTY_STEPS[activeStep].status}</Badge>
        </div>
        <div className="text-[11px] text-muted-foreground mb-2">{BOUNTY_STEPS[activeStep].detail}</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-muted-foreground font-mono shrink-0">Escrow</div>
          <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: activeStep >= 4 ? "0%" : "100%",
                background: activeStep >= 3 ? "#a78bfa" : "#2dd4bf",
              }}
            />
          </div>
          <div className="text-[10px] font-mono shrink-0" style={{ color: activeStep >= 4 ? "#00e49f" : "#a78bfa" }}>
            {activeStep >= 4 ? "Released" : activeStep >= 3 ? "Verifying" : "Locked"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stage 4: Badge & XP System ── */

// Voting weights are TBD — decided by charter vote. Tiers are for game progression.
const TIER_LEVEL: Record<string, string> = {
  member: "Lv.1",
  contributor: "Lv.2",
  builder: "Lv.3",
  steward: "Lv.4",
  elder: "Lv.5",
};

const EARN_ACTIONS = [
  { action: "Vote on proposal", xp: "+10" },
  { action: "Create proposal", xp: "+25" },
  { action: "Complete bounty", xp: "Variable" },
  { action: "Dice roll bonus", xp: "+0 to +100" },
];

function BadgeXPStage() {
  const tiers = Object.entries(XP_THRESHOLDS);
  const maxXP = tiers[tiers.length - 1][1];

  return (
    <div className="px-4 pb-4 sm:px-5 space-y-3">
      <div className="space-y-1.5">
        {tiers.map(([tier, xp], i) => {
          const color = TIER_COLORS[tier] || "var(--muted)";
          const level = TIER_LEVEL[tier] || "Lv.1";
          const widthPct = Math.max(8, (xp / maxXP) * 100);
          return (
            <div key={tier} className="flex items-center gap-2 group">
              <Award className="h-3.5 w-3.5 shrink-0" style={{ color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold capitalize" style={{ color }}>{tier}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">{xp.toLocaleString()} XP</span>
                  <Badge variant="secondary" className="text-[8px] font-mono ml-auto">{level}</Badge>
                </div>
                <div className="h-1 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 journey-bar-fill"
                    style={{ width: `${widthPct}%`, background: color, animationDelay: `${i * 120}ms` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-muted rounded-lg px-3 py-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">How to Earn XP</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {EARN_ACTIONS.map(e => (
            <div key={e.action} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{e.action}</span>
              <span className="font-mono text-primary font-medium">{e.xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stage 5: Charter Decision Map ── */

const CHARTER_PHASES = [
  {
    phase: 1, title: "Foundation", status: "active",
    params: ["Badge cost", "Min votes", "Voting period", "Quorum", "Approval threshold", "Badge tiers"],
    desc: "Core parameters that define the DAO's governance rules.",
  },
  {
    phase: 2, title: "Configuration", status: "locked",
    params: ["Treasury limits", "Election rules", "Role permissions", "Fee structure"],
    desc: "Unlocked after Phase 1 \u2014 operational policies and treasury.",
  },
  {
    phase: 3, title: "Operations", status: "locked",
    params: ["RAC election", "First bounty fund", "Working group mandates", "Handover"],
    desc: "Unlocked after Phase 2 \u2014 launch the DAO.",
  },
];

function CharterStage() {
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="space-y-2">
        {CHARTER_PHASES.map((p, i) => {
          const isActive = p.status === "active";
          const isHovered = hoveredPhase === i;
          return (
            <div key={p.phase}>
              <button
                className={`w-full text-left rounded-lg px-3 py-3 transition-all ${
                  isActive ? "bg-[#f472b6]/10 ring-1 ring-[#f472b6]/30" : "bg-muted hover:bg-accent/10"
                }`}
                onMouseEnter={() => setHoveredPhase(i)}
                onMouseLeave={() => setHoveredPhase(null)}
                onFocus={() => setHoveredPhase(i)}
                onBlur={() => setHoveredPhase(null)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isActive ? <Unlock className="h-4 w-4 text-[#f472b6]" /> : <Lock className="h-4 w-4 text-muted-foreground/50" />}
                  <span className={`text-[13px] font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    Phase {p.phase}: {p.title}
                  </span>
                  <Badge variant={isActive ? "default" : "secondary"} className="text-[9px] ml-auto">
                    {isActive ? "Active" : "Locked"}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mb-1.5">{p.desc}</div>
                <div className={`overflow-hidden transition-all duration-300 ${isHovered || isActive ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.params.map(param => (
                      <Badge key={param} variant="outline" className={`text-[9px] font-mono ${isActive ? "" : "opacity-50"}`}>{param}</Badge>
                    ))}
                  </div>
                </div>
              </button>
              {i < CHARTER_PHASES.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <div className={`w-px h-3 ${isActive ? "bg-[#f472b6]/40" : "bg-muted-foreground/15"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Stage 6: Architecture Block Diagram ── */

const ARCH_BLOCKS = [
  { icon: MessageSquare, label: "Telegram Bot", desc: "Grammy \u00b7 36 commands", color: "#4ea8de" },
  { icon: LayoutDashboard, label: "Dashboard", desc: "Next.js 16 \u00b7 14 pages", color: "#2dd4bf" },
  { icon: Server, label: "API / SQLite", desc: "32 endpoints \u00b7 70 tests", color: "#f59e0b" },
  { icon: Box, label: "Scrypto", desc: "Badges \u00b7 Escrow", color: "#a78bfa" },
  { icon: Layers, label: "CV2", desc: "On-chain governance", color: "#f472b6" },
  { icon: Users, label: "Gateway API", desc: "Radix mainnet", color: "#00e49f" },
];

function ArchitectureStage() {
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="grid grid-cols-3 gap-2">
        {ARCH_BLOCKS.map((b, i) => {
          const Icon = b.icon;
          return (
            <div
              key={i}
              className="bg-muted rounded-lg p-2.5 text-center hover:ring-1 transition-all journey-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${b.color}40`; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              <Icon className="h-5 w-5 mx-auto mb-1" style={{ color: b.color }} />
              <div className="text-[11px] font-semibold">{b.label}</div>
              <div className="text-[9px] text-muted-foreground">{b.desc}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[9px] text-muted-foreground">
        <span>Bot \u2194 API \u2194 Dashboard</span>
        <span className="text-muted-foreground/30">|</span>
        <span>API \u2194 Scrypto \u2194 Gateway</span>
        <span className="text-muted-foreground/30">|</span>
        <span>Dashboard \u2194 CV2</span>
      </div>
    </div>
  );
}

/* ── Main Widget ── */

export function UserJourneyWidget() {
  const [activeStage, setActiveStage] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stage = STAGE_META[activeStage];

  const goTo = useCallback((idx: number) => { setActiveStage(idx); setActiveStep(0); }, []);
  const prev = useCallback(() => goTo(Math.max(0, activeStage - 1)), [activeStage, goTo]);
  const next = useCallback(() => goTo(Math.min(STAGE_META.length - 1, activeStage + 1)), [activeStage, goTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [prev, next]);

  useEffect(() => {
    if (!autoPlay) return;
    const maxSteps = activeStage === 0 ? QUICK_STEPS.length : activeStage === 2 ? BOUNTY_STEPS.length : 0;
    const interval = setInterval(() => {
      if (maxSteps > 0 && activeStep < maxSteps - 1) {
        setActiveStep(s => s + 1);
      } else if (activeStage < STAGE_META.length - 1) {
        goTo(activeStage + 1);
      } else {
        goTo(0);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [autoPlay, activeStage, activeStep, goTo]);

  const renderStageBody = () => {
    switch (activeStage) {
      case 0: return <QuickStartStage activeStep={activeStep} onStep={setActiveStep} />;
      case 1: return <GovernanceStage />;
      case 2: return <BountyStage activeStep={activeStep} onStep={setActiveStep} />;
      case 3: return <BadgeXPStage />;
      case 4: return <CharterStage />;
      case 5: return <ArchitectureStage />;
      default: return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div ref={containerRef} tabIndex={0} role="tabpanel" aria-label="User journey walkthrough" className="outline-none">
          <div className="flex border-b overflow-x-auto" role="tablist" aria-label="Journey stages">
            {STAGE_META.map((s, i) => (
              <button
                key={s.id} role="tab" aria-selected={i === activeStage}
                onClick={() => goTo(i)}
                className={`flex-1 min-w-0 px-2 py-2.5 text-center text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                  i === activeStage ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 pb-2 sm:px-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-mono" style={{ borderLeft: `3px solid ${stage.color}` }}>
                  {activeStage + 1}/{STAGE_META.length}
                </Badge>
                <span className="font-semibold text-sm">{stage.title}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => setAutoPlay(a => !a)} aria-label={autoPlay ? "Pause" : "Play"}>
                  {autoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={prev} disabled={activeStage === 0} aria-label="Previous">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={next} disabled={activeStage === STAGE_META.length - 1} aria-label="Next">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
          </div>

          <div className="journey-fade-in" key={activeStage}>{renderStageBody()}</div>

          <div className="flex justify-center gap-1.5 pb-3">
            {STAGE_META.map((_, i) => (
              <button
                key={i} onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === activeStage ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                aria-label={`Stage ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
