import { PaperCompanion } from "./upload-page";

export function StudyAvatar({ small = false, reference = false }: { small?: boolean; reference?: boolean }) {
  if (reference) return <span className={`reference-avatar ${small ? "reference-avatar-small" : ""}`} aria-hidden="true"><img src="/art/hoopoe-guide-v10.png" alt="" width={96} height={96}/></span>;
  return <span className={`study-avatar ${small ? "study-avatar-small" : ""}`} aria-hidden="true">{small ? "d." : <PaperCompanion/>}</span>;
}
