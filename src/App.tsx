import { ButtonHTMLAttributes, Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Copy,
  Database,
  FileText,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import "./styles.css";
import {
  BRAGA_EXPLORER_URL,
  BRAGA_FAUCET_URL,
  bragaTransactionUrl,
  connectWallet,
  createAccessGrantEntity,
  createNoteEntity,
  createVaultEntity,
  fetchAccessGrants,
  fetchLinks,
  fetchNotes,
  fetchVaults,
  PROJECT_ATTRIBUTE,
  revokeAccessGrantEntity,
} from "./lib/arkiv";
import { decryptJson, encryptJson } from "./lib/crypto";
import type {
  AccessGrantRecord,
  CareReflectionType,
  DraftNote,
  EncryptionEnvelope,
  GrantScope,
  GrantSecret,
  GrantStatus,
  LinkRecord,
  NoteRecord,
  NoteSecret,
  VaultRecord,
  VaultSecret,
} from "./lib/types";

type View = "write" | "grant" | "workbench";
type FeedbackPhase = "idle" | "waiting" | "submitted" | "complete" | "error";
type Feedback = {
  entityKey?: string;
  message: string;
  phase: FeedbackPhase;
  txHash?: string;
};
type Toast = { message: string; tone?: "success" | "error" };
type MemoryAccessStatus = { label: "Active" | "Revoked" | "Expired" | "Not shared"; tone: "success" | "danger" | "muted" };

const REHEARSAL_WALLET = "0xA111111111111111111111111111111111111111";
const REHEARSAL_KEY = "arkiv-care-local-key";
const DEFAULT_THERAPIST_WALLET = "0xTherapist0000000000000000000000000000004C91";
const EMPTY_FEEDBACK: Feedback = { message: "", phase: "idle" };

const reflectionTypeLabels: Record<CareReflectionType, string> = {
  life_event: "Life event",
  emotion_pattern: "Emotion pattern",
  trigger: "Trigger",
  coping_pattern: "Coping pattern",
  therapy_goal: "Therapy goal",
  relationship_context: "Relationship context",
  personal_preference: "Personal preference",
};

const reflectionTypeOptions = Object.keys(reflectionTypeLabels) as CareReflectionType[];

const initialDraft: DraftNote = {
  title: "Starting with a new care context",
  body:
    "I want the first session to start with context about the move, the breakup, sleep disruption, and what has helped before. I do not want to repeat every detail from the beginning.",
  tags: "transition, sleep, trust",
  memoryType: "life_event",
  eventContext: "Moved to Kuala Lumpur after a breakup and need care continuity.",
  feeling: "Tired, guarded, and hopeful that the first session can be practical.",
  triggerPattern: "Sleep gets disrupted after conflict, uncertainty, or major transitions.",
  whatHelped: "Grounding, a predictable evening routine, and direct questions.",
  rememberNextSession: "Ask before reframing family history or summarizing motives.",
  privateLocked: false,
};

function isLocalRehearsalMode(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rehearsal") === "1";
}

function currentView(): View {
  if (typeof window === "undefined") return "workbench";
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "write" || value === "grant" || value === "workbench" ? value : "workbench";
}

function viewHref(view: View, rehearsal = isLocalRehearsalMode()): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (rehearsal) params.set("rehearsal", "1");
  return `/app?${params.toString()}`;
}

function setUrlView(view: View, rehearsal = isLocalRehearsalMode()) {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", viewHref(view, rehearsal));
}

function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(value: number): string {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(new Date(value));
}

function daysFromNow(days: number): number {
  const now = Date.now();
  return now + days * 24 * 60 * 60 * 1000;
}

function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function classNames(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function rehearsalEntityKey(kind: "space" | "memory" | "grant" | "link", index = Date.now()): string {
  return `0x${kind}${String(index).padStart(60 - kind.length, "0")}`.slice(0, 66);
}

function rehearsalTxHash(index = Date.now()): string {
  return `0x${String(index).padStart(64, "0")}`.slice(0, 66);
}

function grantStatus(grant: AccessGrantRecord): GrantStatus {
  if (grant.status === "revoked") return "revoked";
  if (grant.expiresAt && grant.expiresAt < Date.now()) return "expired";
  return grant.status;
}

function mergeByEntityKey<T extends { entityKey: string }>(fallback: T[], primary: T[]): T[] {
  const merged = new Map<string, T>();
  fallback.forEach((item) => merged.set(item.entityKey, item));
  primary.forEach((item) => merged.set(item.entityKey, item));
  return Array.from(merged.values());
}

function memoryAccessStatus(note: NoteRecord, grants: AccessGrantRecord[]): MemoryAccessStatus {
  const relevantGrants = grants
    .filter((grant) => grant.decrypted?.includedNoteKeys.includes(note.entityKey))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!relevantGrants.length) return { label: "Not shared", tone: "muted" };

  const activeGrant = relevantGrants.find((grant) => grantStatus(grant) === "active");
  if (activeGrant) return { label: "Active", tone: "success" };

  const latestStatus = grantStatus(relevantGrants[0]);
  if (latestStatus === "revoked") return { label: "Revoked", tone: "danger" };
  return { label: "Expired", tone: "muted" };
}

function isCareReflection(type: string): type is CareReflectionType {
  return Object.prototype.hasOwnProperty.call(reflectionTypeLabels, type);
}

function reflectionLabel(note: NoteRecord): string {
  const type = note.decrypted?.memoryType ?? note.contentClass;
  return isCareReflection(type) ? reflectionTypeLabels[type] : type;
}

function safeText(value: string | undefined, fallback = "Encrypted reflection"): string {
  return value?.trim() || fallback;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function generateLocalPassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").match(/.{1,6}/g)?.join("-") ?? "";
}

function transactionHashFromMessage(message: string): string | undefined {
  return message.match(/0x[a-fA-F0-9]{64}/)?.[0];
}

async function decryptVaults(vaults: VaultRecord[], passphrase: string): Promise<VaultRecord[]> {
  return Promise.all(
    vaults.map(async (vault) => {
      if (vault.decrypted || !passphrase.trim()) return vault;
      try {
        return { ...vault, decrypted: await decryptJson<VaultSecret>(vault.envelope, passphrase) };
      } catch {
        return vault;
      }
    }),
  );
}

async function decryptNotes(notes: NoteRecord[], passphrase: string): Promise<NoteRecord[]> {
  return Promise.all(
    notes.map(async (note) => {
      if (note.decrypted || !passphrase.trim()) return note;
      try {
        return { ...note, decrypted: await decryptJson<NoteSecret>(note.envelope, passphrase) };
      } catch {
        return note;
      }
    }),
  );
}

async function decryptGrants(grants: AccessGrantRecord[], passphrase: string): Promise<AccessGrantRecord[]> {
  return Promise.all(
    grants.map(async (grant) => {
      if (grant.decrypted || !passphrase.trim()) return grant;
      try {
        return { ...grant, decrypted: await decryptJson<GrantSecret>(grant.envelope, passphrase) };
      } catch {
        return grant;
      }
    }),
  );
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function StatusDot({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "warn" | "danger" | "muted";
}) {
  return <span className={`care-status ${tone}`}>{children}</span>;
}

function ActionButton({
  children,
  className,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  return (
    <button className={classNames("care-btn", className)} type="button" {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

function TextField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="care-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetaMaskMark() {
  return (
    <svg aria-hidden="true" className="care-metamask-mark" viewBox="0 0 32 32">
      <path
        d="M5 6.5 16 2l11 4.5-1.8 9.2-4.8 7.9-4.4 5.9-4.4-5.9-4.8-7.9L5 6.5Z"
        fill="#E2761B"
      />
      <path d="m10.2 10.1 5.8-3.5 5.8 3.5-1 7.1-4.8 5.8-4.8-5.8-1-7.1Z" fill="#F6851B" />
      <path d="m9.4 11 6.6-3.8 6.6 3.8-1.3 5.6-5.3 6.2-5.3-6.2L9.4 11Z" fill="#C06413" />
      <path d="m13.1 12.3 2.9-1.8 2.9 1.8-.5 3.2-2.4 2.8-2.4-2.8-.5-3.2Z" fill="#FFF1E2" />
    </svg>
  );
}

function AppNav({
  className,
  navigate,
  view,
}: {
  className?: string;
  navigate: (view: View) => void;
  view: View;
}) {
  const items: Array<{ icon: ReactNode; label: string; target: View }> = [
    { icon: <Plus size={15} />, label: "Write new", target: "write" },
    { icon: <ShieldCheck size={15} />, label: "Grant memory", target: "grant" },
    { icon: <FileText size={15} />, label: "Dashboard", target: "workbench" },
  ];

  return (
    <nav className={classNames("care-nav", className)} aria-label="Care Passport primary navigation">
      {items.map((item) => (
        <button
          aria-current={view === item.target ? "page" : undefined}
          className={classNames(view === item.target && "active")}
          key={item.target}
          onClick={() => navigate(item.target)}
          type="button"
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function timeWindowLabel(days: string): string {
  const parsed = Number(days) || 14;
  return `last ${parsed} day${parsed === 1 ? "" : "s"}`;
}

function isWithinWindow(createdAt: number, days: string): boolean {
  const parsed = Number(days) || 14;
  return createdAt >= Date.now() - parsed * 24 * 60 * 60 * 1000;
}

function grantAudienceLabel(scope: GrantScope): string {
  return scope === "selected_packet" ? "AI agent context" : "Therapist raw data";
}

function grantAudienceDescription(scope: GrantScope): string {
  return scope === "selected_packet"
    ? "Selected reflections become a narrow context packet for an AI agent used by a therapist."
    : "Selected reflections are shared as raw data for a therapist to review directly.";
}

function HomePage() {
  return (
    <main className="care-home">
      <header className="care-bar">
        <a className="care-brand" href="/">
          <span className="care-brand-mark">CP</span>
          <span>Care Passport</span>
        </a>
        <div className="care-bar-copy">One dashboard. One share flow.</div>
      </header>

      <section className="care-hero">
        <div className="care-hero-copy">
          <p className="care-label">Private memory for care continuity</p>
          <h1>Write privately. Share selectively.</h1>
          <p className="care-lead">
            Write diaries encrypted forever. Take them with you. Share only the parts you choose, without walled
            gardens.
          </p>
          <p className="care-lead">
            Care Passport is a private, wallet-owned care system for personal diaries, AI-agent-assisted review, and
            direct therapist sharing.
          </p>
          <div className="care-actions">
            <a className="care-btn primary" href={viewHref("write", false)}>
              <Plus size={16} />
              <span>Create reflection</span>
            </a>
            <a className="care-btn" href={viewHref("grant", false)}>
              <ShieldCheck size={16} />
              <span>Share access</span>
            </a>
          </div>
        </div>

        <aside className="care-console" aria-label="Care Passport access preview">
          <div className="care-console-head">
            <span className="label">CARE PASSPORT</span>
            <span className="label">Passphrase unlocked</span>
          </div>
          <div className="care-console-body">
            <div className="care-console-column">
              <article className="care-memory-card selected">
                <span>Life event</span>
                <strong>Moved to a new city</strong>
                <small>Updated May 24 / encrypted</small>
              </article>
              <article className="care-memory-card selected">
                <span>Therapy goal</span>
                <strong>Sleep without panic rituals</strong>
                <small>Updated May 21 / encrypted</small>
              </article>
              <article className="care-memory-card private">
                <span>Preference</span>
                <strong>Ask before reframing family history</strong>
                <small>Locked until selected</small>
              </article>
            </div>
            <div className="care-console-column">
              <div className="care-grant-preview">
                <span>Who has access</span>
                <h3>14-day access</h3>
                <p>Give one recipient time-bound access as AI-agent context or raw therapist data. It ends automatically unless you renew it.</p>
                <strong>Revoke anytime</strong>
              </div>
              <div className="care-grant-preview">
                <span>Privacy boundary</span>
                <p>Private diary content is encrypted locally. Arkiv stores encrypted records and proof metadata so ownership and consent stay clear.</p>
              </div>
            </div>
          </div>
          <div className="care-console-foot">
            <span>Proof details on demand</span>
            <span>Revoke anytime</span>
          </div>
        </aside>
      </section>

      <section className="care-section">
        <div className="care-section-head">
          <div>
            <p className="care-label">Use cases</p>
            <h2>Built for private diaries, AI agents, and therapists.</h2>
          </div>
          <p>
            The product stays centered on encrypted ownership. Sharing is optional and always happens on the user's
            terms.
          </p>
        </div>
        <div className="care-flow-steps">
          <article>
            <span>Diary</span>
            <h3>Encrypted forever</h3>
            <p>Write private diaries, keep them encrypted, and take them with you instead of living inside a walled garden.</p>
          </article>
          <article>
            <span>AI agents</span>
            <h3>Selected context</h3>
            <p>Share a narrow context packet with AI agents used by therapists when they need structured background.</p>
          </article>
          <article>
            <span>Therapists</span>
            <h3>Raw selected data</h3>
            <p>Export raw selected notes for therapists when they need to read the original language directly.</p>
          </article>
        </div>
      </section>

      <section className="care-section">
        <div className="care-section-head">
          <div>
            <p className="care-label">Core flow</p>
            <h2>Connect. Create. Review. Choose audience. Share. Revoke.</h2>
          </div>
          <p>
            The user owns the diary entries, encrypts them locally, reviews what is selected, chooses the final
            audience, and controls who can see them, for how long, and for what purpose.
          </p>
        </div>
        <div className="care-flow-grid">
          <article>
            <span>Connect</span>
            <h3>Wallet ownership</h3>
            <p>Connect MetaMask so Care Passport knows which wallet owns the care record.</p>
          </article>
          <article>
            <span>Create</span>
            <h3>Private reflections</h3>
            <p>Write a private reflection and encrypt it locally before it becomes an Arkiv record.</p>
          </article>
          <article>
            <span>Choose audience</span>
            <h3>AI agent or therapist</h3>
            <p>Pick the final share target at the end of the flow: AI-agent context or therapist raw data.</p>
          </article>
          <article>
            <span>Share</span>
            <h3>Time-bound access</h3>
            <p>Choose the recipient wallet, the notes, and the duration before creating access.</p>
          </article>
        </div>
      </section>

      <footer className="care-footer">
        <span>Care Passport</span>
        <span>Your life context should move with you, but stay under your control</span>
      </footer>
    </main>
  );
}

function CareApp() {
  const rehearsal = isLocalRehearsalMode();
  const [view, setView] = useState<View>(currentView);
  const [wallet, setWallet] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmedKey, setConfirmedKey] = useState(false);
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [demoData, setDemoData] = useState<{ grant: AccessGrantRecord; notes: NoteRecord[]; vault: VaultRecord } | null>(null);
  const [activeVaultKey, setActiveVaultKey] = useState("");
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [grants, setGrants] = useState<AccessGrantRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftNote>(initialDraft);
  const [grantWallet, setGrantWallet] = useState(DEFAULT_THERAPIST_WALLET);
  const [grantPurpose, setGrantPurpose] = useState(
    "Share the current time window for intake sessions, AI-agent review, and direct therapist reading. Use only for understanding history, current goals, and support preferences.",
  );
  const [grantScope, setGrantScope] = useState<GrantScope>("selected_packet");
  const [grantDays, setGrantDays] = useState("14");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | CareReflectionType>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [activeMemoryKey, setActiveMemoryKey] = useState("");
  const [lastSavedMemoryKey, setLastSavedMemoryKey] = useState("");
  const [spaceFeedback, setSpaceFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [entryFeedback, setEntryFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [grantFeedback, setGrantFeedback] = useState<Feedback>(EMPTY_FEEDBACK);

  const walletOwner = normalizeAddress(wallet);
  const walletVaults = walletOwner ? vaults.filter((vault) => normalizeAddress(vault.owner) === walletOwner) : [];
  const activeVault = walletVaults.find((vault) => vault.entityKey === activeVaultKey) ?? walletVaults[0];
  const activeVaultNotes = notes.filter((note) => note.vaultKey === activeVault?.entityKey && note.status === "active");
  const demoNotes = demoData?.notes ?? [];
  const demoGrants = demoData?.grant ? [demoData.grant] : [];
  const hasLiveRecords = Boolean(activeVaultNotes.length || grants.length);
  const usingDemoData = !hasLiveRecords;
  const displayNotes = rehearsal ? mergeByEntityKey(demoNotes, activeVaultNotes) : hasLiveRecords ? activeVaultNotes : demoNotes;
  const displayGrants = rehearsal ? mergeByEntityKey(demoGrants, grants) : hasLiveRecords ? grants : demoGrants;
  const displayVault = activeVault ?? demoData?.vault;
  const activeGrant = displayGrants.find((grant) => grantStatus(grant) === "active");
  const historyNotes = useMemo(() => [...displayNotes].sort((a, b) => b.createdAt - a.createdAt), [displayNotes]);
  const readableNotes = displayNotes.filter((note) => note.decrypted);
  const eligibleNotes = readableNotes.filter((note) => !note.decrypted?.privateLocked);
  const visibleHistoryNotes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return historyNotes.filter((note) => {
      const secret = note.decrypted;
      const haystack = [
        secret?.title,
        secret?.body,
        secret?.tags.join(" "),
        secret?.eventContext,
        secret?.feeling,
        note.contentClass,
        note.entityKey,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesText = !term || haystack.includes(term);
      const matchesType = filter === "all" || (secret?.memoryType ?? note.contentClass) === filter;
      return matchesText && matchesType;
    });
  }, [filter, historyNotes, query]);
  const activeHistoryNote = visibleHistoryNotes.find((note) => note.entityKey === activeMemoryKey) ?? visibleHistoryNotes[0] ?? historyNotes[0];
  const shareWindowNotes = useMemo(
    () => eligibleNotes.filter((note) => isWithinWindow(note.createdAt, grantDays)),
    [eligibleNotes, grantDays],
  );
  const privateLockedCount = readableNotes.filter((note) => note.decrypted?.privateLocked).length;
  const packet = useMemo(() => buildContinuityPacket(shareWindowNotes, activeGrant, rehearsal), [shareWindowNotes, activeGrant, rehearsal]);
  const proofReceipt = useMemo(
    () => buildProofReceipt({
      activeGrant,
      activeVault: displayVault,
      grants: displayGrants,
      notes: shareWindowNotes,
      rehearsal,
      wallet,
      shareWindowDays: grantDays,
    }),
    [activeGrant, displayVault, displayGrants, grantDays, rehearsal, shareWindowNotes, wallet],
  );

  useEffect(() => {
    let cancelled = false;
    makeRehearsalData().then((seeded) => {
      if (!cancelled) setDemoData(seeded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rehearsal) return;
    let cancelled = false;

    async function seedRehearsal() {
      const seeded = await makeRehearsalData();
      if (cancelled) return;
      setWallet(REHEARSAL_WALLET);
      setPassphrase(REHEARSAL_KEY);
      setConfirmedKey(true);
      setVaults([seeded.vault]);
      setActiveVaultKey(seeded.vault.entityKey);
      setNotes(seeded.notes);
      setGrants([seeded.grant]);
      setSelectedKeys(new Set(seeded.notes.filter((note) => !note.decrypted?.privateLocked).slice(0, 3).map((note) => note.entityKey)));
      setSpaceFeedback({
        entityKey: seeded.vault.entityKey,
        message: "Seeded local rehearsal diary space. No Arkiv transaction was sent.",
        phase: "complete",
        txHash: rehearsalTxHash(1),
      });
      setEntryFeedback({
        entityKey: seeded.notes[0]?.entityKey,
        message: "Seeded encrypted local reflections. No Arkiv transaction was sent.",
        phase: "complete",
        txHash: rehearsalTxHash(2),
      });
      setGrantFeedback({
        entityKey: seeded.grant.entityKey,
        message: "Seeded local therapist grant. No Arkiv transaction was sent.",
        phase: "complete",
        txHash: rehearsalTxHash(3),
      });
    }

    seedRehearsal();
    return () => {
      cancelled = true;
    };
  }, [rehearsal]);

  useEffect(() => {
    const onPopState = () => setView(currentView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!historyNotes.length) return;
    if (!activeMemoryKey || !historyNotes.some((note) => note.entityKey === activeMemoryKey)) {
      setActiveMemoryKey(historyNotes[0].entityKey);
    }
  }, [activeMemoryKey, historyNotes]);

  function navigate(nextView: View) {
    setUrlView(nextView, rehearsal);
    setView(nextView);
  }

  function showToast(message: string, tone: Toast["tone"] = "success") {
    setToast({ message, tone });
  }

  function resetWalletScopedState() {
    setVaults([]);
    setActiveVaultKey("");
    setNotes([]);
    setLinks([]);
    setGrants([]);
    setSelectedKeys(new Set());
    setSpaceFeedback(EMPTY_FEEDBACK);
    setEntryFeedback(EMPTY_FEEDBACK);
    setGrantFeedback(EMPTY_FEEDBACK);
  }

  async function handleConnect() {
    setError("");
    if (rehearsal) {
      setWallet(REHEARSAL_WALLET);
      setPassphrase(REHEARSAL_KEY);
      setConfirmedKey(true);
      setNotice("Local rehearsal wallet is active. No MetaMask or Braga request was made.");
      return;
    }

    try {
      setBusy("wallet");
      const account = await connectWallet();
      if (normalizeAddress(account) !== walletOwner) {
        resetWalletScopedState();
      }
      setWallet(account);
      setNotice("Wallet connected on Arkiv Braga Testnet.");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not connect wallet.");
    } finally {
      setBusy("");
    }
  }

  async function loadWalletData(options: { vaultKey?: string } = {}) {
    if (!wallet) {
      setError("Connect a wallet before loading diary records.");
      return;
    }

    setError("");
    setBusy("load");
    try {
      const loadedVaults = rehearsal ? vaults : await fetchVaults(wallet);
      const decryptedVaults = await decryptVaults(loadedVaults, passphrase);
      const nextVaultKey = options.vaultKey ?? activeVaultKey ?? decryptedVaults[0]?.entityKey ?? "";
      setVaults(decryptedVaults);
      setActiveVaultKey(nextVaultKey);

      if (!nextVaultKey) {
        setNotes([]);
        setLinks([]);
        setGrants([]);
        setSelectedKeys(new Set());
        setNotice("No diary spaces found for this wallet yet.");
        return;
      }

      if (rehearsal) {
        setNotice("Loaded local rehearsal diary records. No Braga query was made.");
        return;
      }

      const [loadedNotes, loadedLinks, loadedGrants] = await Promise.all([
        fetchNotes(wallet, nextVaultKey),
        fetchLinks(wallet, nextVaultKey),
        fetchAccessGrants(wallet, nextVaultKey),
      ]);
      const [decryptedLoadedNotes, decryptedLoadedGrants] = await Promise.all([
        decryptNotes(loadedNotes, passphrase),
        decryptGrants(loadedGrants, passphrase),
      ]);
      setNotes(decryptedLoadedNotes);
      setLinks(loadedLinks);
      setGrants(decryptedLoadedGrants);
      const unlockedCount = decryptedLoadedNotes.filter((note) => note.decrypted).length;
      setNotice(
        passphrase.trim()
          ? `Loaded ${decryptedLoadedNotes.length} reflection entries and decrypted ${unlockedCount} locally.`
          : `Loaded ${decryptedLoadedNotes.length} encrypted reflection entries. Enter the passphrase to decrypt them locally.`,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Arkiv records.");
    } finally {
      setBusy("");
    }
  }

  async function ensureActiveDiarySpace(): Promise<VaultRecord> {
    if (activeVault && normalizeAddress(activeVault.owner) === walletOwner) return activeVault;
    if (!wallet) throw new Error("Connect a wallet before saving a reflection.");
    if (!passphrase.trim() || !confirmedKey) throw new Error("Save or confirm the Care Passport passphrase before writing.");

    const now = Date.now();
    const secret: VaultSecret = {
      title: "Care continuity diary",
      description: "Encrypted reflection space for therapist handoff context.",
    };
    const envelope = await encryptJson(secret, passphrase);

    if (rehearsal) {
      const vault: VaultRecord = {
        createdAt: now,
        decrypted: secret,
        entityKey: rehearsalEntityKey("space", now),
        envelope,
        owner: wallet.toLowerCase(),
        status: "active",
        updatedAt: now,
      };
      setVaults([vault]);
      setActiveVaultKey(vault.entityKey);
      setSpaceFeedback({
        entityKey: vault.entityKey,
        message: "Diary space created in local rehearsal. No Arkiv transaction was sent.",
        phase: "complete",
        txHash: rehearsalTxHash(now),
      });
      return vault;
    }

    setSpaceFeedback({ message: "Open MetaMask and confirm the diary space write.", phase: "waiting" });
    const result = await createVaultEntity({
      envelope,
      owner: wallet,
      onTransactionSubmitted: (txHash) => {
        setSpaceFeedback({ message: "Diary space transaction submitted to Braga.", phase: "submitted", txHash });
      },
    });
    const vault: VaultRecord = {
      createdAt: now,
      decrypted: secret,
      entityKey: result.entityKey,
      envelope,
      owner: wallet.toLowerCase(),
      status: "active",
      updatedAt: now,
    };
    setVaults([vault]);
    setActiveVaultKey(vault.entityKey);
    setSpaceFeedback({
      entityKey: result.entityKey,
      message: "Diary space confirmed on Braga.",
      phase: "complete",
      txHash: result.txHash,
    });
    return vault;
  }

  async function handleSaveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy("entry");

    try {
      if (!wallet) throw new Error("Connect a wallet before saving a reflection.");
      if (!passphrase.trim() || !confirmedKey) throw new Error("Save or confirm the Care Passport passphrase before saving.");
      const vault = await ensureActiveDiarySpace();
      const now = Date.now();
      const secret: NoteSecret = {
        body: draft.body.trim(),
        eventContext: draft.eventContext?.trim(),
        feeling: draft.feeling?.trim(),
        memoryType: draft.memoryType,
        privateLocked: Boolean(draft.privateLocked),
        rememberNextSession: draft.rememberNextSession?.trim(),
        tags: parseTags(draft.tags),
        title: draft.title.trim(),
        triggerPattern: draft.triggerPattern?.trim(),
        whatHelped: draft.whatHelped?.trim(),
      };

      if (!secret.title || !secret.body) throw new Error("Add a title and reflection before saving.");
      const envelope = await encryptJson(secret, passphrase);

      if (rehearsal) {
        const note: NoteRecord = {
          contentClass: draft.memoryType,
          createdAt: now,
          decrypted: secret,
          entityKey: rehearsalEntityKey("memory", now),
          envelope,
          owner: wallet.toLowerCase(),
          status: "active",
          updatedAt: now,
          vaultKey: vault.entityKey,
        };
        setNotes((current) => [note, ...current.filter((item) => item.entityKey !== note.entityKey)]);
        if (!secret.privateLocked) setSelectedKeys((current) => new Set(current).add(note.entityKey));
        setActiveMemoryKey(note.entityKey);
        setLastSavedMemoryKey(note.entityKey);
        setEntryFeedback({
          entityKey: note.entityKey,
          message: "Memory saved. No Arkiv transaction was sent.",
          phase: "complete",
          txHash: rehearsalTxHash(now),
        });
        setNotice("Memory saved. Grant it to a therapist when you're ready.");
        showToast("Memory saved. Private content stayed encrypted locally.");
        return;
      }

      setEntryFeedback({ message: "Open MetaMask and confirm the encrypted reflection write.", phase: "waiting" });
      const result = await createNoteEntity({
        contentClass: draft.memoryType,
        envelope,
        owner: wallet,
        vaultKey: vault.entityKey,
        onTransactionSubmitted: (txHash) => {
          setEntryFeedback({ message: "Reflection transaction submitted to Braga.", phase: "submitted", txHash });
        },
      });
      const note: NoteRecord = {
        contentClass: draft.memoryType,
        createdAt: now,
        decrypted: secret,
        entityKey: result.entityKey,
        envelope,
        owner: wallet.toLowerCase(),
        status: "active",
        updatedAt: now,
        vaultKey: vault.entityKey,
      };
      setNotes((current) => [note, ...current.filter((item) => item.entityKey !== note.entityKey)]);
      if (!secret.privateLocked) setSelectedKeys((current) => new Set(current).add(note.entityKey));
      setActiveMemoryKey(note.entityKey);
      setLastSavedMemoryKey(note.entityKey);
      setEntryFeedback({
        entityKey: result.entityKey,
        message: "Memory saved and confirmed on Braga.",
        phase: "complete",
        txHash: result.txHash,
      });
      setNotice("Memory saved. Grant it to a therapist when you're ready.");
      showToast("Memory saved. Private content stayed encrypted locally.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save reflection.";
      setEntryFeedback({ message, phase: "error", txHash: transactionHashFromMessage(message) });
      setError(message);
    } finally {
      setBusy("");
    }
  }

  async function handleCreateGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy("grant");

    try {
      if (!wallet) throw new Error("Connect a wallet before creating a grant.");
      if (!activeVault) throw new Error("Create or load a diary space before creating a grant.");
      if (!passphrase.trim()) throw new Error("Enter the Care Passport passphrase before preparing an access grant.");
      const included = shareWindowNotes.map((note) => note.entityKey);
      if (!included.length) throw new Error("Choose a time window that includes at least one readable memory before granting access.");
      if (!grantWallet.trim()) throw new Error("Enter the therapist wallet identity.");

      const expiresAt = daysFromNow(Number(grantDays) || 14);
      const secret: GrantSecret = {
        includedNoteKeys: included,
        purpose: grantPurpose.trim(),
      };
      const envelope = await encryptJson(secret, passphrase);
      const now = Date.now();

      if (rehearsal) {
        const grant: AccessGrantRecord = {
          createdAt: now,
          decrypted: secret,
          entityKey: rehearsalEntityKey("grant", now),
          envelope,
          expiresAt,
          owner: wallet.toLowerCase(),
          scope: grantScope,
          status: "active",
          therapistWallet: grantWallet.toLowerCase(),
          vaultKey: activeVault.entityKey,
        };
        setGrants((current) => [grant, ...current]);
        setGrantFeedback({
          entityKey: grant.entityKey,
          message: "Access grant created in local rehearsal. No Arkiv transaction was sent.",
          phase: "complete",
          txHash: rehearsalTxHash(now),
        });
        showToast("Access grant created. Therapist access is time-bound.");
        navigate("workbench");
        return;
      }

      setGrantFeedback({ message: "Open MetaMask and confirm the access grant write.", phase: "waiting" });
      const result = await createAccessGrantEntity({
        envelope,
        expiresAt,
        owner: wallet,
        scope: grantScope,
        therapistWallet: grantWallet,
        vaultKey: activeVault.entityKey,
        onTransactionSubmitted: (txHash) => {
          setGrantFeedback({ message: "Access grant transaction submitted to Braga.", phase: "submitted", txHash });
        },
      });
      const grant: AccessGrantRecord = {
        createdAt: now,
        decrypted: secret,
        entityKey: result.entityKey,
        envelope,
        expiresAt,
        owner: wallet.toLowerCase(),
        scope: grantScope,
        status: "active",
        therapistWallet: grantWallet.toLowerCase(),
        vaultKey: activeVault.entityKey,
      };
      setGrants((current) => [grant, ...current]);
      setGrantFeedback({
        entityKey: result.entityKey,
        message: "Access grant confirmed on Braga.",
        phase: "complete",
        txHash: result.txHash,
      });
      showToast("Access grant created. Therapist access is time-bound.");
      navigate("workbench");
    } catch (grantError) {
      const message = grantError instanceof Error ? grantError.message : "Could not create access grant.";
      setGrantFeedback({ message, phase: "error", txHash: transactionHashFromMessage(message) });
      setError(message);
    } finally {
      setBusy("");
    }
  }

  function toggleSelected(note: NoteRecord) {
    if (!note.decrypted || note.decrypted.privateLocked) return;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(note.entityKey)) next.delete(note.entityKey);
      else next.add(note.entityKey);
      return next;
    });
  }

  async function revokeGrant(grantKey: string) {
    setError("");
    setBusy("revoke");

    try {
      const demoGrant = demoData?.grant.entityKey === grantKey ? demoData.grant : undefined;
      if (demoGrant && !grants.some((item) => item.entityKey === grantKey)) {
        setDemoData((current) =>
          current
            ? {
                ...current,
                grant: {
                  ...current.grant,
                  status: "revoked",
                },
              }
            : current,
        );
        setGrantFeedback({
          entityKey: grantKey,
          message: "Demo access revoked. No Arkiv transaction was sent.",
          phase: "complete",
          txHash: rehearsalTxHash(Date.now()),
        });
        showToast("Demo access revoked.");
        return;
      }

      if (!wallet) throw new Error("Connect a wallet before revoking a grant.");
      const grant = grants.find((item) => item.entityKey === grantKey);
      if (!grant) throw new Error("Access grant was not found in this session.");

      if (rehearsal) {
        setGrants((current) =>
          current.map((item) => (item.entityKey === grantKey ? { ...item, status: "revoked" } : item)),
        );
        setGrantFeedback({
          entityKey: grantKey,
          message: "Access grant revoked in local rehearsal. No Arkiv transaction was sent.",
          phase: "complete",
          txHash: rehearsalTxHash(Date.now()),
        });
        showToast("Access grant revoked in local rehearsal.");
        return;
      }

      setGrantFeedback({ entityKey: grantKey, message: "Open MetaMask and confirm the grant revoke.", phase: "waiting" });
      const result = await revokeAccessGrantEntity({
        grant,
        owner: wallet,
        onTransactionSubmitted: (txHash) => {
          setGrantFeedback({ entityKey: grantKey, message: "Grant revoke transaction submitted to Braga.", phase: "submitted", txHash });
        },
      });
      setGrants((current) =>
        current.map((item) => (item.entityKey === grantKey ? { ...item, status: "revoked" } : item)),
      );
      setGrantFeedback({
        entityKey: result.entityKey,
        message: "Access grant revoke confirmed on Braga.",
        phase: "complete",
        txHash: result.txHash,
      });
      showToast("Access grant revoked on Braga.");
    } catch (revokeError) {
      const message = revokeError instanceof Error ? revokeError.message : "Could not revoke access grant.";
      setGrantFeedback({ entityKey: grantKey, message, phase: "error", txHash: transactionHashFromMessage(message) });
      setError(message);
    } finally {
      setBusy("");
    }
  }

  async function handleCopyPacket() {
    try {
      await copyText(packet);
      showToast("Packet copied. Only selected reflections were included.");
    } catch {
      showToast("Could not copy packet. Try again.", "error");
    }
  }

  async function handleCopyProof() {
    try {
      await copyText(proofReceipt);
      showToast("Verified receipt copied.");
    } catch {
      showToast("Could not copy receipt. Try again.", "error");
    }
  }

  async function handleCopyKey() {
    try {
      await copyText(passphrase);
      showToast("Passphrase copied. Keep it private; it unlocks decryption locally.");
    } catch {
      showToast("Could not copy passphrase. Try again.", "error");
    }
  }

  function renderFeedback(feedback: Feedback, label: string) {
    if (!feedback.message) return null;
    const tone = feedback.phase === "error" ? "danger" : feedback.phase === "complete" ? "success" : "warn";
    return (
      <div className={`care-feedback ${tone}`}>
        <StatusDot tone={tone}>{label}</StatusDot>
        <p>{feedback.message}</p>
        {feedback.entityKey && <code>{feedback.entityKey}</code>}
        {feedback.txHash && (
          <small>
            {rehearsal ? "Local rehearsal tx" : "Braga tx"} {feedback.txHash.slice(0, 20)}...
          </small>
        )}
        {feedback.txHash && !rehearsal && (
          <a href={bragaTransactionUrl(feedback.txHash)} rel="noreferrer" target="_blank">
            Open transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <main className="care-app">
      <header className="care-bar">
        <a className="care-brand" href="/">
          <span className="care-brand-mark">CP</span>
          <span>Care Passport</span>
        </a>
        <AppNav navigate={navigate} view={view} />
        <div className="care-bar-actions">
          {wallet ? (
            <span className="care-wallet">{rehearsal ? "Local wallet" : shortAddress(wallet)}</span>
          ) : (
            <ActionButton className="primary highlight" icon={<MetaMaskMark />} onClick={handleConnect}>
              Connect MetaMask
            </ActionButton>
          )}
        </div>
      </header>

      {rehearsal && (
        <div className="care-rehearsal-banner" role="status">
          <strong>Local rehearsal</strong>
          <span>This run uses seeded local proof data only. It does not write to Braga.</span>
        </div>
      )}

      <div className="care-shell">
        <div className="care-shell-main">
          <section className="care-status-line">
            <span>
              <strong>Care Passport.</strong> Encrypted reflections, wallet-owned Arkiv records, and time-bound therapist
              access.
            </span>
          </section>

          {error && (
            <div className="care-alert danger" role="alert">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="care-alert" role="status">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
            </div>
          )}

          {view === "write" &&
            renderWriteView({
              busy,
              confirmedKey,
              draft,
              entryFeedback,
              handleCopyKey,
              handleSaveReflection,
              navigate,
              passphrase,
              renderFeedback,
              rehearsal,
              setConfirmedKey,
              setDraft,
              setPassphrase,
              wallet,
              lastSavedMemoryKey,
              notes: historyNotes,
            })}

          {view === "grant" &&
            renderGrantView({
              activeVault: displayVault,
              busy,
              grantDays,
              grantFeedback,
              grantPurpose,
              grantScope,
              grantWallet,
              handleCreateGrant,
              navigate,
              renderFeedback,
              rehearsal,
              setGrantDays,
              setGrantPurpose,
              setGrantScope,
              setGrantWallet,
              wallet,
              shareWindowNotes,
              lastSavedMemoryKey,
              notes: historyNotes,
            })}

          {view === "workbench" &&
            renderWorkbenchView({
              activeGrant,
              activeHistoryNote,
              activeVault: displayVault,
              busy,
              filter,
              grants: displayGrants,
              handleCopyPacket,
              handleCopyProof,
              loadWalletData,
              packet,
              privateLockedCount,
              navigate,
              query,
              readableNotes,
              rehearsal,
              renderFeedback,
              revokeGrant,
              setFilter,
              setQuery,
              setShowProof,
              showProof,
              spaceFeedback,
              entryFeedback,
              grantFeedback,
              proofReceipt,
              usingDemoData,
              wallet,
              historyNotes,
              visibleHistoryNotes,
              activeMemoryKey,
              setActiveMemoryKey,
              grantDays,
              shareWindowNotes,
              lastSavedMemoryKey,
            })}
        </div>
      </div>

      {toast && (
        <div className={`care-toast ${toast.tone === "error" ? "error" : ""}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </main>
  );
}

function renderWriteView(props: {
  busy: string;
  confirmedKey: boolean;
  draft: DraftNote;
  entryFeedback: Feedback;
  handleCopyKey: () => void;
  handleSaveReflection: (event: FormEvent<HTMLFormElement>) => void;
  navigate: (view: View) => void;
  lastSavedMemoryKey: string;
  notes: NoteRecord[];
  passphrase: string;
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
  rehearsal: boolean;
  setConfirmedKey: (value: boolean) => void;
  setDraft: (draft: DraftNote) => void;
  setPassphrase: (value: string) => void;
  wallet: string;
}) {
  const {
    busy,
    confirmedKey,
    draft,
    entryFeedback,
    handleCopyKey,
    handleSaveReflection,
    navigate,
    lastSavedMemoryKey,
    notes,
    passphrase,
    renderFeedback,
    rehearsal,
    setConfirmedKey,
    setDraft,
    setPassphrase,
    wallet,
  } = props;
  const keyReady = Boolean(passphrase.trim() && confirmedKey);
  const savedNote = notes.find((note) => note.entityKey === lastSavedMemoryKey);

  return (
    <section className="care-wrap">
      <div className="care-intro">
        <p className="care-label">Create reflection</p>
        <h1>Create a private reflection.</h1>
        <p className="care-lead">
          Structured entries help future care without forcing the user to retell everything. Content is encrypted
          locally before it becomes a wallet-owned Arkiv record.
        </p>
      </div>

      <div className="care-panel care-start-card">
        <div className="care-step">
          <div>
            <span>01</span>
            <h2>Connect wallet</h2>
            <p>This owns the reflection before anything is saved.</p>
          </div>
          <div className="care-step-action">
            <StatusDot tone={wallet ? "success" : "warn"}>{wallet ? "Wallet ready" : "Wallet needed"}</StatusDot>
            <span className="care-wallet">{wallet ? (rehearsal ? "Local wallet" : shortAddress(wallet)) : "Use top-right MetaMask"}</span>
          </div>
        </div>

        <div className="care-step key-panel">
          <div>
            <span>02</span>
            <h2>Unlock private passport</h2>
            <p>
              Create or enter a passphrase. The browser derives the encryption key from it, then decrypts private
              reflections locally.
            </p>
          </div>
          <div className="care-key-stack">
            <TextField label="Care Passport passphrase">
              <input
                autoComplete="off"
                onChange={(event) => {
                  setPassphrase(event.target.value);
                  setConfirmedKey(false);
                }}
                placeholder="Generate or enter a passphrase before saving"
                value={passphrase}
              />
            </TextField>
            <div className="care-actions">
              <ActionButton
                className="primary"
                icon={<KeyRound size={16} />}
                onClick={() => {
                  setPassphrase(generateLocalPassphrase());
                  setConfirmedKey(true);
                }}
              >
                Generate passphrase
              </ActionButton>
              <ActionButton disabled={!passphrase} icon={<Copy size={16} />} onClick={handleCopyKey}>
                Copy passphrase
              </ActionButton>
            </div>
            <label className="care-check compact">
              <input checked={confirmedKey} onChange={(event) => setConfirmedKey(event.target.checked)} type="checkbox" />
              <span>I saved this passphrase or already know it.</span>
            </label>
            <StatusDot tone={keyReady ? "success" : "warn"}>
              {keyReady ? "Private passport unlocked" : "Passphrase needed"}
            </StatusDot>
            <p className="care-recovery-note">
              If this passphrase is lost, private reflections cannot be recovered. Arkiv can still prove the record
              exists, but it cannot decrypt the text.
            </p>
          </div>
        </div>
      </div>

      <div className="care-two-column">
        <form className="care-panel care-stack" onSubmit={handleSaveReflection}>
          <div className="care-panel-head">
            <div>
              <p className="care-label">Write here</p>
              <h2>Reflection entry</h2>
            </div>
            <span>Encrypted diary</span>
          </div>

          <TextField label="Reflection type">
            <select
              onChange={(event) => setDraft({ ...draft, memoryType: event.target.value as CareReflectionType })}
              value={draft.memoryType}
            >
              {reflectionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {reflectionTypeLabels[type]}
                </option>
              ))}
            </select>
          </TextField>

          <TextField label="Title">
            <input onChange={(event) => setDraft({ ...draft, title: event.target.value })} value={draft.title} />
          </TextField>

          <TextField label="Reflection">
            <textarea onChange={(event) => setDraft({ ...draft, body: event.target.value })} value={draft.body} />
          </TextField>

          <div className="care-form-grid">
            <TextField label="Event or context">
              <textarea
                onChange={(event) => setDraft({ ...draft, eventContext: event.target.value })}
                value={draft.eventContext ?? ""}
              />
            </TextField>
            <TextField label="Feeling">
              <textarea onChange={(event) => setDraft({ ...draft, feeling: event.target.value })} value={draft.feeling ?? ""} />
            </TextField>
            <TextField label="Trigger or pattern">
              <textarea
                onChange={(event) => setDraft({ ...draft, triggerPattern: event.target.value })}
                value={draft.triggerPattern ?? ""}
              />
            </TextField>
            <TextField label="What helped">
              <textarea
                onChange={(event) => setDraft({ ...draft, whatHelped: event.target.value })}
                value={draft.whatHelped ?? ""}
              />
            </TextField>
          </div>

          <TextField label="Remember next session">
            <input
              onChange={(event) => setDraft({ ...draft, rememberNextSession: event.target.value })}
              value={draft.rememberNextSession ?? ""}
            />
          </TextField>

          <TextField label="Private tags">
            <input onChange={(event) => setDraft({ ...draft, tags: event.target.value })} value={draft.tags} />
          </TextField>

          <label className="care-check">
            <input checked={Boolean(draft.privateLocked)} onChange={(event) => setDraft({ ...draft, privateLocked: event.target.checked })} type="checkbox" />
            <span>Private-lock this entry so it is excluded from therapist packets by default.</span>
          </label>

          <div className="care-actions">
            <button className="care-btn primary" disabled={busy === "entry" || !wallet} type="submit">
              <Database size={16} />
              <span>{busy === "entry" ? "Saving" : "Save encrypted reflection"}</span>
            </button>
            <ActionButton icon={<ShieldCheck size={16} />} onClick={() => navigate("grant")}>
              Review access
            </ActionButton>
          </div>
          {renderFeedback(entryFeedback, "Entry")}
          {savedNote && (
            <div className="care-save-cue compact">
              <div>
                <StatusDot tone="success">Memory saved</StatusDot>
                <h3>{safeText(savedNote.decrypted?.title, "Saved memory")}</h3>
                <p>The entry is encrypted and ready to share.</p>
              </div>
              <div className="care-actions">
                <ActionButton className="primary highlight" icon={<ShieldCheck size={16} />} onClick={() => navigate("grant")}>
                  Grant memory to therapist
                </ActionButton>
                <ActionButton icon={<FileText size={16} />} onClick={() => navigate("workbench")}>
                  Open dashboard
                </ActionButton>
              </div>
            </div>
          )}
        </form>

        <aside className="care-side-stack">
          <div className="care-panel care-preview-panel">
          <div className="care-panel-head">
            <div>
              <p className="care-label">What will be shared</p>
              <h2>Reflection preview</h2>
            </div>
            <StatusDot tone={keyReady ? "success" : "danger"}>{keyReady ? "Unlocked" : "Locked"}</StatusDot>
          </div>
          <div className="care-preview">
            {keyReady ? (
              <article className="care-entry-preview">
                <span>{reflectionLabelFromDraft(draft)}</span>
                <h3>{safeText(draft.title, "Untitled reflection")}</h3>
                <p>{safeText(draft.body, "Add reflection content before saving.")}</p>
                {draft.privateLocked && <strong>Private-locked. Excluded from therapist packets by default.</strong>}
                <small>Private tags: {draft.tags || "none"}</small>
              </article>
            ) : (
              <article className="care-entry-preview locked">
                <span>Encrypted content</span>
                <h3>Readable after passphrase unlock</h3>
                <p>
                  Private diary content stays ciphertext until the passphrase derives the local decryption key. Public
                  metadata stays coarse so records can be found without exposing the reflection.
                </p>
              </article>
            )}
            <div className="care-receipt-mini">
              <span>Record model</span>
              <p>Diary Space record: 90-day expiry on Braga.</p>
              <p>Reflection Entry record: 30-day expiry on Braga.</p>
              <p>Passphrase to PBKDF2-SHA256 to AES-GCM encrypt/decrypt.</p>
            </div>
          </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function renderGrantView(props: {
  activeVault: VaultRecord | undefined;
  busy: string;
  grantDays: string;
  grantFeedback: Feedback;
  grantPurpose: string;
  grantScope: GrantScope;
  grantWallet: string;
  handleCreateGrant: (event: FormEvent<HTMLFormElement>) => void;
  navigate: (view: View) => void;
  lastSavedMemoryKey: string;
  notes: NoteRecord[];
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
  rehearsal: boolean;
  setGrantDays: (value: string) => void;
  setGrantPurpose: (value: string) => void;
  setGrantScope: (value: GrantScope) => void;
  setGrantWallet: (value: string) => void;
  shareWindowNotes: NoteRecord[];
  wallet: string;
}) {
  const {
    activeVault,
    busy,
    grantDays,
    grantFeedback,
    grantPurpose,
    grantScope,
    grantWallet,
    handleCreateGrant,
    navigate,
    lastSavedMemoryKey,
    notes,
    renderFeedback,
    rehearsal,
    setGrantDays,
    setGrantPurpose,
    setGrantScope,
    setGrantWallet,
    shareWindowNotes,
    wallet,
  } = props;
  const savedNote = notes.find((note) => note.entityKey === lastSavedMemoryKey);
  const grantBlocker = !wallet
    ? "Connect wallet first."
    : !activeVault
      ? "Create or load a diary space first."
      : !shareWindowNotes.length
        ? "No eligible memories in this time window. Use 30 days or save a non-private reflection."
        : "";

  return (
    <section className="care-wrap">
      <div className="care-intro">
        <p className="care-label">Share access</p>
        <h1>Choose who can see this.</h1>
        <p className="care-lead">
          Choose the therapist wallet, the notes, and the time window before any access is created.
        </p>
      </div>

      <div className="care-panel care-start-card">
        <div className="care-step">
          <div>
            <span>01</span>
            <h2>Connect wallet</h2>
            <p>Use the owner wallet before creating any access grant.</p>
          </div>
          <div className="care-step-action">
            <StatusDot tone={wallet ? "success" : "warn"}>{wallet ? "Wallet ready" : "Wallet needed"}</StatusDot>
            <span className="care-wallet">{wallet ? (rehearsal ? "Local wallet" : shortAddress(wallet)) : "Use top-right MetaMask"}</span>
          </div>
        </div>
        <div className="care-step">
          <div>
            <span>02</span>
            <h2>Share by time</h2>
            <p>Default to the easiest option: share the last 7, 14, or 30 days of memories.</p>
          </div>
          <StatusDot tone="warn">Time window</StatusDot>
        </div>
      </div>

      <div className="care-two-column">
        <form className="care-panel care-stack" onSubmit={handleCreateGrant}>
          <div className="care-panel-head">
            <h2>Share details</h2>
            <span>Time-bound</span>
          </div>

          {savedNote && (
            <div className="care-save-cue grant">
              <div>
                <StatusDot tone="success">Memory saved</StatusDot>
                <h3>{safeText(savedNote.decrypted?.title, "Saved memory")}</h3>
                <p>The newest entry is ready. The create grant button below is highlighted for the next step.</p>
              </div>
              <small>Grant action highlighted below</small>
            </div>
          )}

          <TextField label="Recipient wallet">
            <input onChange={(event) => setGrantWallet(event.target.value)} value={grantWallet} />
          </TextField>

          <TextField label="Why share this?">
            <textarea onChange={(event) => setGrantPurpose(event.target.value)} value={grantPurpose} />
          </TextField>

          <TextField label="Share memories from">
            <select onChange={(event) => setGrantDays(event.target.value)} value={grantDays}>
              <option value="7">last 7 days</option>
              <option value="14">last 14 days</option>
              <option value="30">last 30 days</option>
            </select>
          </TextField>

          <div className="care-field">
            <span>Audience</span>
            <div className="care-choice-grid">
              <label className="care-choice">
                <input
                  checked={grantScope === "selected_packet"}
                  name="scope"
                  onChange={() => setGrantScope("selected_packet")}
                  type="radio"
                />
                <span>{grantAudienceLabel("selected_packet")}</span>
                <small>{grantAudienceDescription("selected_packet")}</small>
              </label>
              <label className="care-choice">
                <input
                  checked={grantScope === "temporary_full_view"}
                  name="scope"
                  onChange={() => setGrantScope("temporary_full_view")}
                  type="radio"
                />
                <span>{grantAudienceLabel("temporary_full_view")}</span>
                <small>{grantAudienceDescription("temporary_full_view")}</small>
              </label>
            </div>
          </div>

          <div className="care-field">
            <span>Included memories</span>
            <div className="care-memory-list flat">
              {shareWindowNotes.length ? (
                shareWindowNotes.map((note) => (
                  <article className="care-memory-row compact readonly" key={note.entityKey}>
                    <span>
                      <strong>{safeText(note.decrypted?.title)}</strong>
                      <small>
                        {reflectionLabel(note)} / encrypted / updated {formatDate(note.updatedAt)}
                      </small>
                    </span>
                    <em>{note.decrypted?.privateLocked ? "private" : "included"}</em>
                  </article>
                ))
              ) : (
                <div className="care-empty">
                  <strong>No memories in this time window</strong>
                  <p>Choose a longer time range or save another memory before preparing a therapist grant.</p>
                </div>
              )}
            </div>
          </div>

          <div className="care-actions">
            <button
              className={classNames("care-btn", "primary", lastSavedMemoryKey && "highlight")}
              disabled={busy === "grant"}
              type="submit"
            >
              <ShieldCheck size={16} />
              <span>{busy === "grant" ? "Creating" : "Create access grant"}</span>
            </button>
            <ActionButton icon={<FileText size={16} />} onClick={() => navigate("workbench")}>
              Review dashboard
            </ActionButton>
          </div>
          {grantBlocker && <p className="care-blocker">{grantBlocker}</p>}
          {renderFeedback(grantFeedback, "Grant")}
        </form>

        <aside className="care-side-stack">
          <div className="care-panel care-access-summary-panel">
            <div className="care-panel-head">
              <h2>Access summary</h2>
              <span>{shareWindowNotes.length} in window</span>
            </div>
            <div className="care-review">
              <article>
                <span>Recipient wallet</span>
                <h3>{grantWallet || "Wallet required"}</h3>
                <p>{grantPurpose}</p>
              </article>
              <article>
                <span>Share window</span>
                <h3>{timeWindowLabel(grantDays)}</h3>
                <p>Access expires after {grantDays} days and can be revoked before expiry.</p>
              </article>
              <article>
                <span>Audience</span>
                <h3>{grantAudienceLabel(grantScope)}</h3>
                <p>{grantAudienceDescription(grantScope)}</p>
              </article>
              <article>
                <span>Included notes</span>
                <p>
                  {shareWindowNotes.length
                    ? shareWindowNotes.map((note) => `- ${safeText(note.decrypted?.title)}`).join("\n")
                    : "Choose a longer time window before granting access."}
                </p>
              </article>
              <article>
                <span>Privacy boundary</span>
                <p>
                  Private diary content is encrypted locally. Arkiv stores encrypted records and proof metadata so
                  ownership, consent, and access can be verified.
                </p>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function renderWorkbenchView(props: {
  activeGrant: AccessGrantRecord | undefined;
  activeHistoryNote: NoteRecord | undefined;
  activeVault: VaultRecord | undefined;
  busy: string;
  entryFeedback: Feedback;
  filter: "all" | CareReflectionType;
  grantFeedback: Feedback;
  grants: AccessGrantRecord[];
  handleCopyPacket: () => void;
  handleCopyProof: () => void;
  loadWalletData: () => void;
  grantDays: string;
  navigate: (view: View) => void;
  packet: string;
  privateLockedCount: number;
  proofReceipt: string;
  query: string;
  readableNotes: NoteRecord[];
  rehearsal: boolean;
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
  revokeGrant: (grantKey: string) => Promise<void>;
  setFilter: (value: "all" | CareReflectionType) => void;
  setQuery: (value: string) => void;
  setActiveMemoryKey: (value: string) => void;
  setShowProof: (value: boolean) => void;
  showProof: boolean;
  spaceFeedback: Feedback;
  historyNotes: NoteRecord[];
  visibleHistoryNotes: NoteRecord[];
  activeMemoryKey: string;
  shareWindowNotes: NoteRecord[];
  lastSavedMemoryKey: string;
  usingDemoData: boolean;
  wallet: string;
}) {
  const {
    activeGrant,
    activeHistoryNote,
    activeVault,
    busy,
    entryFeedback,
    filter,
    grantFeedback,
    grants,
    handleCopyPacket,
    handleCopyProof,
    loadWalletData,
    grantDays,
    navigate,
    packet,
    privateLockedCount,
    proofReceipt,
    query,
    readableNotes,
    rehearsal,
    renderFeedback,
    revokeGrant,
    setFilter,
    setQuery,
    setActiveMemoryKey,
    setShowProof,
    showProof,
    spaceFeedback,
    historyNotes,
    visibleHistoryNotes,
    activeMemoryKey,
    shareWindowNotes,
    lastSavedMemoryKey,
    usingDemoData,
    wallet,
  } = props;
  const shareWindowCount = shareWindowNotes.length;

  return (
    <section className="care-dashboard">
      <div className="care-panel care-dashboard-main">
        <div className="care-panel-head">
          <div>
            <h1>Access dashboard</h1>
            <p>Search all historical memories, inspect who can access them, and share the current time window.</p>
          </div>
          <span>{historyNotes.length} memories</span>
        </div>

        <div className="care-dashboard-toolbar">
          <TextField label="Search memories">
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, body, or tag" value={query} />
          </TextField>
          <TextField label="Type">
            <select onChange={(event) => setFilter(event.target.value as "all" | CareReflectionType)} value={filter}>
              <option value="all">All types</option>
              {reflectionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {reflectionTypeLabels[type]}
                </option>
              ))}
            </select>
          </TextField>
          <div className="care-field care-field-static">
            <span>Share window</span>
            <p>{timeWindowLabel(grantDays)}</p>
          </div>
          <div className="care-dashboard-actions">
            <ActionButton icon={<RefreshCw size={16} />} onClick={loadWalletData}>
              {busy === "load" ? "Loading" : rehearsal ? "Reload rehearsal" : "Load from Arkiv"}
            </ActionButton>
          </div>
        </div>

        <div className="care-table-shell">
          <table className="care-table" aria-label="Historical memories">
            <thead>
              <tr>
                <th>Date</th>
                <th>Memory</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Share window</th>
                <th>Access</th>
                <th>Privacy</th>
              </tr>
            </thead>
            <tbody>
              {visibleHistoryNotes.length ? (
                visibleHistoryNotes.map((note) => {
                  const privateLocked = Boolean(note.decrypted?.privateLocked);
                  const inWindow = shareWindowNotes.some((shareNote) => shareNote.entityKey === note.entityKey);
                  const access = memoryAccessStatus(note, grants);
                  const active = activeMemoryKey === note.entityKey;
                  const saved = lastSavedMemoryKey === note.entityKey;
                  return (
                    <tr
                      aria-selected={active}
                      className={classNames(active && "active", saved && "saved")}
                      key={note.entityKey}
                      onClick={() => setActiveMemoryKey(note.entityKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveMemoryKey(note.entityKey);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td data-label="Date">{formatDate(note.updatedAt)}</td>
                      <td data-label="Memory">
                        <strong>{safeText(note.decrypted?.title)}</strong>
                        <small>{safeText(note.decrypted?.body, "Encrypted reflection")}</small>
                      </td>
                      <td data-label="Type">{reflectionLabel(note)}</td>
                      <td data-label="Tags">{note.decrypted?.tags.join(", ") || "none"}</td>
                      <td data-label="Share window">{inWindow ? timeWindowLabel(grantDays) : "Archived"}</td>
                      <td data-label="Access">
                        <StatusDot tone={access.tone}>{access.label}</StatusDot>
                      </td>
                      <td data-label="Privacy">{privateLocked ? "Private lock" : "Shareable"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="care-empty-table" colSpan={7} data-label="Status">
                    <strong>No memories match</strong>
                    <p>Adjust search or type filters to browse a different slice of history.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className={classNames("care-panel care-drawer care-linked-panel", activeHistoryNote && "connected")} aria-label="Memory details">
        <div className="care-panel-head">
          <div>
            <p className="care-label">{activeHistoryNote ? "Linked row" : "Drawer"}</p>
            <h2>{activeHistoryNote ? safeText(activeHistoryNote.decrypted?.title, "Memory details") : "Select a memory"}</h2>
          </div>
          <span>{activeHistoryNote ? reflectionLabel(activeHistoryNote) : "History"}</span>
        </div>

        {activeHistoryNote ? (
          <>
            <div className="care-drawer-card">
              <span>Written</span>
              <h3>{formatDate(activeHistoryNote.createdAt)}</h3>
              <p>{safeText(activeHistoryNote.decrypted?.body, "Encrypted reflection content.")}</p>
            </div>
            <div className="care-review">
              <article>
                <span>Category</span>
                <h3>{reflectionLabel(activeHistoryNote)}</h3>
                <p>{activeHistoryNote.decrypted?.rememberNextSession || "Historical entry available in the dashboard."}</p>
              </article>
              <article>
                <span>Share window</span>
                <h3>{timeWindowLabel(grantDays)}</h3>
                <p>{shareWindowCount} memories are ready for the current therapist packet.</p>
              </article>
              <article>
                <span>Privacy</span>
                <h3>{activeHistoryNote.decrypted?.privateLocked ? "Private lock" : "Shareable"}</h3>
                <p>
                  {activeHistoryNote.decrypted?.privateLocked
                    ? "This entry stays out of therapist packets unless it is explicitly unlocked later."
                    : "This entry can flow into the current time-based share window."}
                </p>
              </article>
              <article>
                <span>Latest save</span>
                <p>
                  {lastSavedMemoryKey === activeHistoryNote.entityKey
                    ? "This is the most recently saved memory."
                    : "Browse the table to inspect historical reflections."}
                </p>
              </article>
            </div>
            <div className="care-actions">
              <ActionButton className="primary highlight" icon={<ShieldCheck size={16} />} onClick={() => navigate("grant")}>
                Grant memory to therapist
              </ActionButton>
              <ActionButton disabled={!shareWindowCount} icon={<Clipboard size={16} />} onClick={handleCopyPacket}>
                Copy care packet
              </ActionButton>
              <ActionButton icon={<Copy size={16} />} onClick={handleCopyProof}>
                Copy receipt
              </ActionButton>
            </div>
          </>
        ) : (
          <div className="care-empty inline">
            <strong>Select a memory</strong>
            <p>Pick a row in the history table to inspect its details and share status.</p>
          </div>
        )}

        <div className="care-panel-head">
          <h2>Who has access</h2>
          <span>{grants.length ? `${grants.length} record${grants.length === 1 ? "" : "s"}` : "none"}</span>
        </div>
        {grants.length ? (
          <div className="care-access-list">
            {grants.map((grant) => {
              const status = grantStatus(grant);
              const isActive = status === "active";
              return (
                <article className={classNames("care-access-row", isActive && "active")} key={grant.entityKey}>
                  <div>
                    <span>{isActive ? "Active access" : status}</span>
                    <h3>{grantAudienceLabel(grant.scope)}</h3>
                    <p>
                      Recipient wallet {shortAddress(grant.therapistWallet)} can use the approved packet until{" "}
                      {formatDate(grant.expiresAt)}.
                    </p>
                  </div>
                  {isActive ? (
                    <ActionButton
                      className="danger"
                      disabled={busy === "revoke"}
                      icon={<XCircle size={16} />}
                      onClick={() => void revokeGrant(grant.entityKey)}
                    >
                      {busy === "revoke" ? "Revoking" : "Revoke access"}
                    </ActionButton>
                  ) : (
                    <StatusDot tone={status === "revoked" ? "danger" : "muted"}>{status}</StatusDot>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="care-empty inline">
            <strong>No one has access yet</strong>
            <p>Create a therapist access grant to show who can read selected notes.</p>
          </div>
        )}

        <details className="care-proof" open={showProof} onToggle={(event) => setShowProof(event.currentTarget.open)}>
          <summary>Proof details</summary>
          <div className="care-proof-grid">
            <span>Mode</span>
            <span>{usingDemoData ? "Demo data / Braga model" : rehearsal ? "Local rehearsal - no Braga write" : "Braga Testnet"}</span>
            <span>Wallet</span>
            <code>{wallet || "Not connected"}</code>
            <span>Project scope</span>
            <code>{PROJECT_ATTRIBUTE.value}</code>
            <span>Diary space</span>
            <code>{activeVault?.entityKey ?? "No diary space yet"}</code>
            <span>Share window</span>
            <code>{timeWindowLabel(grantDays)}</code>
            <span>Access grants</span>
            <code>{grants.map((grant) => `${grant.entityKey} (${grantStatus(grant)})`).join(", ") || "No grant records"}</code>
            <span>Encrypted content</span>
            <span>Diary content is encrypted locally before storage.</span>
            <span>Boundary</span>
            <span>Arkiv stores encrypted records and proof metadata; it does not expose diary text publicly.</span>
            {!rehearsal && (
              <>
                <span>Explorer</span>
                <a href={BRAGA_EXPLORER_URL} rel="noreferrer" target="_blank">
                  Open Braga Explorer
                </a>
              </>
            )}
            {rehearsal && (
              <>
                <span>Rehearsal proof</span>
                <span>This proof was created locally for rehearsal. It was not written to Braga.</span>
              </>
            )}
          </div>
          <div className="care-proof-model">
            <article>
              <span>Payload</span>
              <p>Encrypted memory payload is a JSON envelope. Care text stays in ciphertext.</p>
            </article>
            <article>
              <span>Typed attributes</span>
              <p>project, entityType, owner, vaultKey, status, expiresAt, and therapistWallet form the searchable index.</p>
            </article>
            <article>
              <span>Owner / creator</span>
              <p>$owner controls update and revoke. $creator is the immutable transaction attribution from Arkiv.</p>
            </article>
            <article>
              <span>Relationships</span>
              <p>vaultKey links memories and access grants back to the diary space entity.</p>
            </article>
            <article>
              <span>Expiry</span>
              <p>Diary, memory, and grant records use expiresIn so access windows are time-bound.</p>
            </article>
          </div>
          <pre className="care-proof-receipt">{proofReceipt}</pre>
        </details>

        <div className="care-feedback-grid">
          {renderFeedback(spaceFeedback, "Space")}
          {renderFeedback(entryFeedback, "Entry")}
          {renderFeedback(grantFeedback, "Grant")}
        </div>

        {!wallet && (
          <div className="care-empty inline">
            <strong>Connect wallet to use live Braga</strong>
            <p>
              For live proof, connect MetaMask on Braga and fund the wallet from the{" "}
              <a href={BRAGA_FAUCET_URL} rel="noreferrer" target="_blank">
                faucet
              </a>
              .
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}

function reflectionLabelFromDraft(draft: DraftNote): string {
  const type = draft.memoryType;
  return isCareReflection(type) ? reflectionTypeLabels[type] : type;
}

function buildContinuityPacket(notes: NoteRecord[], grant: AccessGrantRecord | undefined, rehearsal: boolean): string {
  const selected = notes.filter((note) => note.decrypted && !note.decrypted.privateLocked);
  if (!selected.length) {
    return "Choose a time window with at least one readable, non-private-locked reflection to prepare a Care Passport care packet.";
  }

  const lines = selected.map((note) => {
    const secret = note.decrypted;
    const details = [
      secret?.eventContext ? `  Context: ${secret.eventContext}` : "",
      secret?.feeling ? `  Feeling: ${secret.feeling}` : "",
      secret?.triggerPattern ? `  Pattern: ${secret.triggerPattern}` : "",
      secret?.whatHelped ? `  What helped: ${secret.whatHelped}` : "",
      secret?.rememberNextSession ? `  Remember next session: ${secret.rememberNextSession}` : "",
    ].filter(Boolean);

    return [`- ${reflectionLabel(note)}: ${secret?.title}`, `  Source: ${note.entityKey}`, `  ${secret?.body}`, ...details].join("\n");
  });

  return [
    "Care Passport care packet",
    "",
    "Use this context for care continuity during the current grant window only.",
    "Only reflections inside the chosen time window are included. Private-locked entries and older out-of-window entries are not part of this packet.",
    "",
    "Audience:",
    `- ${grant ? grantAudienceLabel(grant.scope) : "No access audience is active yet"}`,
    `- ${grant ? `Recipient wallet ${shortAddress(grant.therapistWallet)} only` : "No therapist grant is active yet"}`,
    `- ${grant ? `Expires ${formatDate(grant.expiresAt)}` : "Create a grant before sharing outside this browser"}`,
    "- User can revoke before expiry",
    "",
    "Included reflections:",
    ...lines,
    "",
    "Access boundary:",
    "- Do not treat this as a permanent clinical record",
    rehearsal ? "- Local rehearsal only: no Braga transaction was created" : "- Braga proof is available in Proof details",
  ].join("\n");
}

function buildProofReceipt(params: {
  activeGrant: AccessGrantRecord | undefined;
  activeVault: VaultRecord | undefined;
  grants: AccessGrantRecord[];
  notes: NoteRecord[];
  rehearsal: boolean;
  shareWindowDays: string;
  wallet: string;
}): string {
  const { activeGrant, activeVault, grants, notes, rehearsal, shareWindowDays, wallet } = params;
  return [
    "Care Passport verified receipt",
    `Mode: ${rehearsal ? "local rehearsal - no Braga write" : "Braga Testnet"}`,
    `Project: ${PROJECT_ATTRIBUTE.value}`,
    `Wallet: ${wallet || "not connected"}`,
    `Diary space: ${activeVault?.entityKey ?? "none"}`,
    `Share window: ${timeWindowLabel(shareWindowDays)}`,
    `Share window records: ${notes.map((note) => note.entityKey).join(", ") || "none"}`,
    `Access grant: ${activeGrant ? `${activeGrant.entityKey} (${grantStatus(activeGrant)})` : "none"}`,
    `Access count: ${grants.length}`,
    "Privacy boundary: private reflections are encrypted locally before Arkiv storage.",
    "Care boundary: this is a continuity packet, not an AI therapist or medical record system.",
  ].join("\n");
}

async function makeRehearsalData(): Promise<{
  grant: AccessGrantRecord;
  notes: NoteRecord[];
  vault: VaultRecord;
}> {
  const now = Date.now();
  const vaultSecret: VaultSecret = {
    title: "Care continuity diary",
    description: "Seeded therapy-continuity context for hackathon rehearsal.",
  };
  const vaultEnvelope = await encryptJson(vaultSecret, REHEARSAL_KEY);
  const vault: VaultRecord = {
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
    decrypted: vaultSecret,
    entityKey: rehearsalEntityKey("space", 31),
    envelope: vaultEnvelope,
    owner: REHEARSAL_WALLET.toLowerCase(),
    status: "active",
    updatedAt: now,
  };

  const noteSeeds: Array<{ ageDays: number; secret: NoteSecret }> = [
    {
      ageDays: 2,
      secret: {
        body: "Moved to Kuala Lumpur after a breakup. The first therapist session should not require retelling the full story from zero.",
        eventContext: "Major move, relationship ending, and loss of previous care continuity.",
        feeling: "Guarded, tired, but willing to start again if context is respected.",
        memoryType: "life_event",
        privateLocked: false,
        rememberNextSession: "Start with current stability and sleep before deeper family history.",
        tags: ["transition", "relationship"],
        title: "Move and breakup context",
        triggerPattern: "Big transitions make sleep and focus worse.",
        whatHelped: "Short direct summaries and practical plans.",
      },
    },
    {
      ageDays: 4,
      secret: {
        body: "Sleep gets difficult after conflict or uncertainty. Grounding and predictable evening routines help.",
        feeling: "Anxious at night, calmer when the next day has structure.",
        memoryType: "trigger",
        privateLocked: false,
        rememberNextSession: "Ask about recent sleep before evaluating mood.",
        tags: ["sleep", "grounding"],
        title: "Sleep disruption pattern",
        triggerPattern: "Conflict, uncertainty, and late-night message checking.",
        whatHelped: "No-phone wind down, breathing, and writing the next small task.",
      },
    },
    {
      ageDays: 6,
      secret: {
        body: "The first month goal is to build enough trust to discuss the breakup, sleep, and a practical support plan.",
        eventContext: "New therapist intake.",
        feeling: "Hopeful if the session has structure.",
        memoryType: "therapy_goal",
        privateLocked: false,
        rememberNextSession: "Avoid rushing into diagnostic labels.",
        tags: ["goal", "intake"],
        title: "Session goal for first month",
        whatHelped: "Clear agenda, permission before reframing.",
      },
    },
    {
      ageDays: 9,
      secret: {
        body: "The user prefers therapists to ask before reframing family history or summarizing motives.",
        feeling: "More trusting when interpretations are checked first.",
        memoryType: "personal_preference",
        privateLocked: false,
        rememberNextSession: "Ask before reframing family history.",
        tags: ["preference", "family"],
        title: "Ask before family reframing",
      },
    },
    {
      ageDays: 14,
      secret: {
        body: "A difficult message thread in the evening made the next day feel heavier. The pattern is clear enough to mention in intake without telling the whole thread.",
        feeling: "Overstimulated and drained after long chats.",
        memoryType: "emotion_pattern",
        privateLocked: false,
        rememberNextSession: "Keep the explanation concise and focus on the trigger-response loop.",
        tags: ["message", "overload"],
        title: "Evening message spiral",
        triggerPattern: "Long, unresolved text threads late at night.",
        whatHelped: "Turn off notifications after dinner and sleep earlier.",
      },
    },
    {
      ageDays: 21,
      secret: {
        body: "Weekly walks improved mood enough to make therapy sessions feel easier to prepare for.",
        eventContext: "Recovery routine and movement.",
        feeling: "Calmer on days with sunlight and movement.",
        memoryType: "coping_pattern",
        privateLocked: false,
        rememberNextSession: "Keep movement in the support plan.",
        tags: ["movement", "routine"],
        title: "Walking helps regulate mood",
        whatHelped: "Short walks, daylight, and no agenda pressure.",
      },
    },
    {
      ageDays: 35,
      secret: {
        body: "This entry is intentionally private-locked to show that not every diary item enters a therapist handoff.",
        eventContext: "Sensitive third-party detail.",
        feeling: "Not ready to share this in intake.",
        memoryType: "relationship_context",
        privateLocked: true,
        rememberNextSession: "Only share if explicitly unlocked later.",
        tags: ["private", "boundary"],
        title: "Private family detail",
      },
    },
    {
      ageDays: 63,
      secret: {
        body: "Sleep got worse after a big disagreement and I wrote down what actually helped instead of how I thought I should respond.",
        eventContext: "Older care continuity note.",
        feeling: "Embarrassed at first, then more grounded once the pattern was written down.",
        memoryType: "life_event",
        privateLocked: false,
        rememberNextSession: "Use this as a reminder that the pattern has happened before.",
        tags: ["history", "pattern"],
        title: "Older continuity note",
        triggerPattern: "Conflict and sudden uncertainty.",
        whatHelped: "Written checklists and one practical next step.",
      },
    },
  ];

  const notes = await Promise.all(
    noteSeeds.map(async ({ ageDays, secret }) => {
      const createdAt = now - ageDays * 24 * 60 * 60 * 1000;
      const envelope = await encryptJson(secret, REHEARSAL_KEY);
      return {
        contentClass: secret.memoryType,
        createdAt,
        decrypted: secret,
        entityKey: rehearsalEntityKey("memory", ageDays + 100),
        envelope,
        owner: REHEARSAL_WALLET.toLowerCase(),
        status: "active" as const,
        updatedAt: createdAt,
        vaultKey: vault.entityKey,
      };
    }),
  );

  const includedNoteKeys = notes
    .filter((note) => !note.decrypted?.privateLocked && note.createdAt >= now - 14 * 24 * 60 * 60 * 1000)
    .map((note) => note.entityKey);
  const grantSecret: GrantSecret = {
    includedNoteKeys,
    purpose: "Continuity for intake sessions after changing therapists. Use only for history, current goals, and support preferences.",
  };
  const grantEnvelope: EncryptionEnvelope = await encryptJson(grantSecret, REHEARSAL_KEY);
  const grant: AccessGrantRecord = {
    createdAt: now,
    decrypted: grantSecret,
    entityKey: rehearsalEntityKey("grant", 201),
    envelope: grantEnvelope,
    expiresAt: daysFromNow(14),
    owner: REHEARSAL_WALLET.toLowerCase(),
    scope: "selected_packet",
    status: "active",
    therapistWallet: DEFAULT_THERAPIST_WALLET.toLowerCase(),
    vaultKey: vault.entityKey,
  };

  return { grant, notes, vault };
}

export function App() {
  return window.location.pathname === "/app" || window.location.pathname.startsWith("/app/") || window.location.hash === "#app" ? (
    <CareApp />
  ) : (
    <HomePage />
  );
}
