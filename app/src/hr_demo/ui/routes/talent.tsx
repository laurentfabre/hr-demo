import { createFileRoute } from "@tanstack/react-router";
import { TalentPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/talent")({ component: TalentPage });
