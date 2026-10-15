import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/cockpit/studio";
export const Route = createFileRoute("/studio")({ component: StudioPage });
