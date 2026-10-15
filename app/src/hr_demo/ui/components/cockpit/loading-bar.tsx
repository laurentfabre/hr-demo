export function LoadingBar({ active, label }: { active: boolean; label: string }) {
  return active ? <div className="loading-progress-bar" role="progressbar" aria-label={label} data-test-id="loading-progress"><span/></div> : null;
}
