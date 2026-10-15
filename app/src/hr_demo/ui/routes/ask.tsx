import { createFileRoute } from "@tanstack/react-router";
import { AskPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/ask")({ component: AskPage });
