"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, FileText, GraduationCap, HardDrive, ShieldAlert, Truck } from "lucide-react";
import { ReactNode } from "react";

import { ActionChip } from "@/components/ui/ActionChip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { uiTokens } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { AgentId } from "@/types/chat";

interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  agentId?: AgentId;
  icon: ReactNode;
}

interface WorkflowPanelProps {
  selectedAgentId: AgentId;
  onUseTemplate: (prompt: string, suggestedAgentId?: AgentId) => void;
}

const PINNED_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: "ticket",
    title: "Create Service Request",
    description: "Generate a structured service request with urgency, owner, and approvals.",
    prompt: "Create a service request with required fields, priority, owner, and SLA.",
    agentId: "ops",
    icon: <ClipboardCheck size={16} />,
  },
  {
    id: "policy-brief",
    title: "Policy Impact Brief",
    description: "Summarize business impact, compliance implications, and communication steps.",
    prompt: "Summarize policy impact, risks, and communication actions for leadership.",
    agentId: "hr",
    icon: <ShieldAlert size={16} />,
  },
  {
    id: "inventory-risk",
    title: "Inventory Risk Check",
    description: "Analyze stock risk, lead-time exposure, and mitigation options.",
    prompt: "Analyze current inventory risk and provide mitigation options by priority.",
    agentId: "supply",
    icon: <Truck size={16} />,
  },
];

const QUICK_CHIPS: Array<{ label: string; prompt: string; agentId?: AgentId }> = [
  { label: "Draft", prompt: "Draft an executive-ready response for this request." },
  { label: "Summarize", prompt: "Summarize this context into key decisions and next actions." },
  { label: "Analyze", prompt: "Analyze root cause, impact, and priority actions." },
  { label: "Create Request", prompt: "Create a formal request ticket with scope, owner, and SLA.", agentId: "ops" },
  { label: "Check Inventory", prompt: "Check inventory risk, supplier impact, and replenishment actions.", agentId: "supply" },
  { label: "Training Plan", prompt: "Build a role-based training plan with milestones and outcomes.", agentId: "academy" },
];

export function WorkflowPanel({ selectedAgentId, onUseTemplate }: WorkflowPanelProps) {
  return (
    <section
      className={cn(
        "mb-5 border border-slate-300/80 bg-white/75 p-3 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70",
        uiTokens.radius.panel,
        uiTokens.shadow.subtle
      )}
      aria-label="Workflow quick-start panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Operational Workflow Hub</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">Pinned actions and templates to accelerate enterprise execution</p>
        </div>
        <StatusBadge label={`Active: ${selectedAgentId}`} tone="info" className="uppercase" />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {PINNED_WORKFLOWS.map((workflow, index) => (
          <motion.button
            key={workflow.id}
            type="button"
            onClick={() => onUseTemplate(workflow.prompt, workflow.agentId)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: uiTokens.motion.duration.base,
              ease: uiTokens.motion.ease.easeOut,
              delay: index * 0.03,
            }}
            className="rounded-[14px] border border-slate-300 bg-white/80 p-3 text-left transition-colors hover:border-sky-500/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950/70 dark:hover:bg-slate-900"
          >
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {workflow.icon}
              {workflow.title}
            </p>
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">{workflow.description}</p>
          </motion.button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <ActionChip
            key={chip.label}
            label={chip.label}
            onClick={() => onUseTemplate(chip.prompt, chip.agentId)}
            icon={
              chip.label === "Draft" ? (
                <FileText size={13} />
              ) : chip.label === "Training Plan" ? (
                <GraduationCap size={13} />
              ) : (
                <HardDrive size={13} />
              )
            }
          />
        ))}
      </div>
    </section>
  );
}


