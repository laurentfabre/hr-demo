import { createFileRoute } from "@tanstack/react-router";
import { AgentWorkspacePage } from "@/components/cockpit/agent-workspace";
export const Route = createFileRoute("/agent-workspace")({ component: AgentWorkspacePage });
