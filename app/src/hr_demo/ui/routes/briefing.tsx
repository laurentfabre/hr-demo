import { createFileRoute } from "@tanstack/react-router";
import { BriefingPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/briefing")({ component: BriefingPage });
