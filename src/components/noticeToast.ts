/** Fixed text shared by every jace-s client when the API cannot be reached and no notice is published. */
export const OUTAGE_MESSAGE = "Unable to connect to the server.";
/** Notice toasts close by themselves after this delay while the API is reachable (a convention, not a measured value). */
export const NOTICE_AUTO_DISMISS_MS = 8000;

export interface Notice {
  id: string;
  title: string;
}

export interface NoticeToast {
  /** Changes when the notice list changes, so a dismissed toast reappears only for new content. */
  key: string;
  lines: string[];
  kind: "notice" | "outage";
  /** null keeps the toast until the user closes it. */
  autoDismissMs: number | null;
}

/**
 * At most one toast: several notices become one bulleted line each; without notices an unreachable API shows the
 * fixed outage text. Example: reachable with notices A and B gives one toast ["A", "B"] that closes after 8 seconds.
 */
export function resolveNoticeToast(up: boolean, notices: Notice[]): NoticeToast | null {
  if (notices.length) {
    return { key: `notice:${notices.map((notice) => notice.id).join(",")}`, lines: notices.map((notice) => notice.title), kind: "notice", autoDismissMs: up ? NOTICE_AUTO_DISMISS_MS : null };
  }
  return up ? null : { key: "outage", lines: [OUTAGE_MESSAGE], kind: "outage", autoDismissMs: null };
}
