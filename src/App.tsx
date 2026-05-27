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
  Wallet,
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
  title: "Starting with a new therapist",
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

function HomePage() {
  return (
    <main className="care-home">
      <header className="care-bar">
        <a className="care-brand" href="/">
          <span className="care-brand-mark">CP</span>
          <span>Care Passport</span>
        </a>
        <nav className="care-nav" aria-label="Product navigation">
          <a href="/">Home</a>
          <a href={viewHref("write", false)}>Create reflection</a>
          <a href={viewHref("grant", false)}>Share access</a>
          <a href={viewHref("workbench", false)}>Dashboard</a>
        </nav>
      </header>

      <section className="care-hero">
        <div className="care-hero-copy">
          <p className="care-label">Private memory for care continuity</p>
          <h1>A diary you own. A share list you control.</h1>
          <p className="care-lead">
            Keep encrypted care notes in one place. See who has access, choose what to share, and revoke it when you
            need to.
          </p>
          <p className="care-lead">
            Care Passport is a private, wallet-owned care system. It is not a chatbot and not a medical record
            system.
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
            <span className="label">Local key active</span>
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
                <p>Give one therapist time-bound access. It ends automatically unless you renew it.</p>
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
            <p className="care-label">Core flow</p>
            <h2>Connect. Create. Review. Share. Revoke.</h2>
          </div>
          <p>
            The user owns the diary entries, encrypts them locally, and controls who can see them, for how long, and
            for what purpose.
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
            <span>Share</span>
            <h3>Time-bound access</h3>
            <p>Choose the therapist wallet, the notes, and the duration before creating access.</p>
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
  const [activeVaultKey, setActiveVaultKey] = useState("");
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [grants, setGrants] = useState<AccessGrantRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftNote>(initialDraft);
  const [grantWallet, setGrantWallet] = useState(DEFAULT_THERAPIST_WALLET);
  const [grantPurpose, setGrantPurpose] = useState(
    "Continuity for intake sessions after changing therapists. Use only for understanding history, current goals, and support preferences.",
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
  const [spaceFeedback, setSpaceFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [entryFeedback, setEntryFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [grantFeedback, setGrantFeedback] = useState<Feedback>(EMPTY_FEEDBACK);

  const walletOwner = normalizeAddress(wallet);
  const walletVaults = walletOwner ? vaults.filter((vault) => normalizeAddress(vault.owner) === walletOwner) : [];
  const activeVault = walletVaults.find((vault) => vault.entityKey === activeVaultKey) ?? walletVaults[0];
  const activeVaultNotes = notes.filter((note) => note.vaultKey === activeVault?.entityKey && note.status === "active");
  const activeGrant = grants.find((grant) => grantStatus(grant) === "active");
  const readableNotes = activeVaultNotes.filter((note) => note.decrypted);
  const eligibleNotes = readableNotes.filter((note) => !note.decrypted?.privateLocked);
  const selectedNotes = eligibleNotes.filter((note) => selectedKeys.has(note.entityKey));
  const privateLockedCount = readableNotes.filter((note) => note.decrypted?.privateLocked).length;
  const selectedGrantKeys = selectedNotes.map((note) => note.entityKey);

  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return activeVaultNotes.filter((note) => {
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
  }, [activeVaultNotes, filter, query]);

  const packet = useMemo(() => buildContinuityPacket(selectedNotes, activeGrant, rehearsal), [selectedNotes, activeGrant, rehearsal]);
  const proofReceipt = useMemo(
    () => buildProofReceipt({
      activeGrant,
      activeVault,
      grants,
      notes: selectedNotes,
      rehearsal,
      wallet,
    }),
    [activeGrant, activeVault, grants, rehearsal, selectedNotes, wallet],
  );

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
      setNotice(`Loaded ${decryptedLoadedNotes.length} reflection entries and ${decryptedLoadedGrants.length} access grants.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Arkiv records.");
    } finally {
      setBusy("");
    }
  }

  async function ensureActiveDiarySpace(): Promise<VaultRecord> {
    if (activeVault && normalizeAddress(activeVault.owner) === walletOwner) return activeVault;
    if (!wallet) throw new Error("Connect a wallet before saving a reflection.");
    if (!passphrase.trim() || !confirmedKey) throw new Error("Save or confirm the local key before writing.");

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
      if (!passphrase.trim() || !confirmedKey) throw new Error("Save or confirm the local key before saving.");
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
        setEntryFeedback({
          entityKey: note.entityKey,
          message: "Reflection saved in local rehearsal. No Arkiv transaction was sent.",
          phase: "complete",
          txHash: rehearsalTxHash(now),
        });
        setNotice("Encrypted reflection is ready for consent review.");
        showToast("Reflection saved. Private content stayed encrypted locally.");
        navigate("workbench");
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
      setEntryFeedback({
        entityKey: result.entityKey,
        message: "Reflection confirmed on Braga and decrypted in this browser.",
        phase: "complete",
        txHash: result.txHash,
      });
      setNotice("Encrypted reflection is ready for consent review.");
      showToast("Reflection saved. Private content stayed encrypted locally.");
      navigate("workbench");
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
      if (!passphrase.trim()) throw new Error("Enter the local key before preparing an access grant.");
      const included = grantScope === "temporary_full_view" ? eligibleNotes.map((note) => note.entityKey) : selectedGrantKeys;
      if (!included.length) throw new Error("Select at least one readable, non-private-locked reflection before granting access.");
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

  function selectVisible() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      filteredNotes.forEach((note) => {
        if (note.decrypted && !note.decrypted.privateLocked) next.add(note.entityKey);
      });
      return next;
    });
  }

  async function revokeGrant(grantKey: string) {
    setError("");
    setBusy("revoke");

    try {
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
      showToast("Local key copied.");
    } catch {
      showToast("Could not copy local key. Try again.", "error");
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
        <nav className="care-nav" aria-label="App navigation">
          <button className={view === "write" ? "active" : ""} onClick={() => navigate("write")} type="button">
            Create reflection
          </button>
          <button className={view === "grant" ? "active" : ""} onClick={() => navigate("grant")} type="button">
            Share access
          </button>
          <button className={view === "workbench" ? "active" : ""} onClick={() => navigate("workbench")} type="button">
            Dashboard
          </button>
        </nav>
        <div className="care-wallet-actions">
          {wallet ? <span className="care-wallet">{rehearsal ? "Local wallet" : shortAddress(wallet)}</span> : null}
          <ActionButton icon={<Wallet size={15} />} onClick={handleConnect}>
            {wallet ? "Wallet active" : rehearsal ? "Use local wallet" : "Connect wallet"}
          </ActionButton>
        </div>
      </header>

      {rehearsal && (
        <div className="care-rehearsal-banner" role="status">
          <strong>Local rehearsal</strong>
          <span>This run uses seeded local proof data only. It does not write to Braga.</span>
        </div>
      )}

      <section className="care-status-line">
        <span>
          <strong>Care Passport.</strong> Encrypted reflections, wallet-owned Arkiv records, and time-bound therapist
          access.
        </span>
        <div className="care-status-actions">
          <StatusDot tone={wallet ? "success" : "warn"}>{wallet ? "Wallet ready" : "Wallet needed"}</StatusDot>
          {!wallet && (
            <ActionButton className="primary" icon={<Wallet size={14} />} onClick={handleConnect}>
              Connect wallet
            </ActionButton>
          )}
        </div>
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
          setConfirmedKey,
          setDraft,
          setPassphrase,
          wallet,
        })}

      {view === "grant" &&
        renderGrantView({
          activeVault,
          busy,
          eligibleNotes,
          grantDays,
          grantFeedback,
          grantPurpose,
          grantScope,
          grantWallet,
          handleCreateGrant,
          navigate,
          renderFeedback,
          selectedGrantKeys,
          selectedNotes,
          setGrantDays,
          setGrantPurpose,
          setGrantScope,
          setGrantWallet,
          setSelectedKeys,
          toggleSelected,
          wallet,
        })}

      {view === "workbench" &&
        renderWorkbenchView({
          activeGrant,
          activeVault,
          busy,
          eligibleNotes,
          filter,
          filteredNotes,
          grants,
          handleCopyPacket,
          handleCopyProof,
          loadWalletData,
          packet,
          privateLockedCount,
          query,
          readableNotes,
          rehearsal,
          renderFeedback,
          revokeGrant,
          selectVisible,
          selectedKeys,
          selectedNotes,
          setFilter,
          setQuery,
          setSelectedKeys,
          setShowProof,
          showProof,
          spaceFeedback,
          entryFeedback,
          grantFeedback,
          proofReceipt,
          toggleSelected,
          wallet,
        })}

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
  passphrase: string;
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
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
    passphrase,
    renderFeedback,
    setConfirmedKey,
    setDraft,
    setPassphrase,
    wallet,
  } = props;
  const keyReady = Boolean(passphrase.trim() && confirmedKey);

  return (
    <section className="care-wrap">
      <div className="care-intro">
        <div>
          <p className="care-label">Create reflection</p>
          <h1>Create a private reflection.</h1>
          <p className="care-lead">
            Structured entries help future care without forcing the user to retell everything. Content is encrypted
            locally before it becomes a wallet-owned Arkiv record.
          </p>
        </div>
        <div className="care-panel key-panel">
          <StatusDot tone={keyReady ? "success" : "warn"}>{keyReady ? "Local key active" : "Local key needed"}</StatusDot>
          <p>This key is not a wallet password. It encrypts new diary content and decrypts it in this browser session.</p>
          <div className="care-actions">
            <ActionButton
              className="primary"
              icon={<KeyRound size={16} />}
              onClick={() => {
                setPassphrase(REHEARSAL_KEY);
                setConfirmedKey(true);
              }}
            >
              Generate key
            </ActionButton>
            <ActionButton disabled={!passphrase} icon={<Copy size={16} />} onClick={handleCopyKey}>
              Copy key
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="care-two-column">
        <form className="care-panel care-stack" onSubmit={handleSaveReflection}>
          <div className="care-panel-head">
            <h2>Reflection entry</h2>
            <span>Encrypted diary</span>
          </div>

          <TextField label="Local encryption key">
            <input
              autoComplete="off"
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Generate or enter a key before saving"
              value={passphrase}
            />
          </TextField>

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
          <label className="care-check">
            <input checked={confirmedKey} onChange={(event) => setConfirmedKey(event.target.checked)} type="checkbox" />
            <span>I saved this key or already know it.</span>
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
        </form>

        <aside className="care-panel">
          <div className="care-panel-head">
            <h2>Reflection preview</h2>
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
                <h3>Readable after local key</h3>
                <p>
                  Private diary content is hidden until the local key is active. Public metadata stays coarse so records
                  can be found without exposing the reflection.
                </p>
              </article>
            )}
            <div className="care-receipt-mini">
              <span>Record model</span>
              <p>Diary Space record: 90-day expiry on Braga.</p>
              <p>Reflection Entry record: 30-day expiry on Braga.</p>
              <p>Encrypted with AES-GCM and PBKDF2-SHA256.</p>
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
  eligibleNotes: NoteRecord[];
  grantDays: string;
  grantFeedback: Feedback;
  grantPurpose: string;
  grantScope: GrantScope;
  grantWallet: string;
  handleCreateGrant: (event: FormEvent<HTMLFormElement>) => void;
  navigate: (view: View) => void;
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
  selectedGrantKeys: string[];
  selectedNotes: NoteRecord[];
  setGrantDays: (value: string) => void;
  setGrantPurpose: (value: string) => void;
  setGrantScope: (value: GrantScope) => void;
  setGrantWallet: (value: string) => void;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
  toggleSelected: (note: NoteRecord) => void;
  wallet: string;
}) {
  const {
    activeVault,
    busy,
    eligibleNotes,
    grantDays,
    grantFeedback,
    grantPurpose,
    grantScope,
    grantWallet,
    handleCreateGrant,
    navigate,
    renderFeedback,
    selectedGrantKeys,
    selectedNotes,
    setGrantDays,
    setGrantPurpose,
    setGrantScope,
    setGrantWallet,
    setSelectedKeys,
    toggleSelected,
    wallet,
  } = props;
  const grantIncluded = grantScope === "temporary_full_view" ? eligibleNotes : selectedNotes;

  return (
    <section className="care-wrap">
      <div className="care-intro">
        <div>
          <p className="care-label">Share access</p>
          <h1>Choose who can see this.</h1>
          <p className="care-lead">
            Choose the therapist wallet, the notes, and the time window before any access is created.
          </p>
        </div>
        <div className="care-panel">
          <StatusDot tone="warn">Consent required</StatusDot>
          <p>Full-view access and selected packets both expire. Revoke remains available after access is active.</p>
        </div>
      </div>

      <div className="care-two-column">
        <form className="care-panel care-stack" onSubmit={handleCreateGrant}>
          <div className="care-panel-head">
            <h2>Share details</h2>
            <span>Time-bound</span>
          </div>

          <TextField label="Therapist wallet">
            <input onChange={(event) => setGrantWallet(event.target.value)} value={grantWallet} />
          </TextField>

          <TextField label="Why share this?">
            <textarea onChange={(event) => setGrantPurpose(event.target.value)} value={grantPurpose} />
          </TextField>

          <div className="care-field">
            <span>What can they see?</span>
            <div className="care-choice-grid">
              <label className="care-choice">
                <input
                  checked={grantScope === "selected_packet"}
                  name="scope"
                  onChange={() => setGrantScope("selected_packet")}
                  type="radio"
                />
                <span>Selected notes</span>
                <small>Only chosen reflections enter the care packet.</small>
              </label>
              <label className="care-choice">
                <input
                  checked={grantScope === "temporary_full_view"}
                  name="scope"
                  onChange={() => setGrantScope("temporary_full_view")}
                  type="radio"
                />
                <span>Full view</span>
                <small>All readable, non-private-locked notes for the grant window.</small>
              </label>
            </div>
          </div>

          <TextField label="Expires after">
            <select onChange={(event) => setGrantDays(event.target.value)} value={grantDays}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </TextField>

          <div className="care-field">
            <span>Selected notes</span>
            <div className="care-memory-list flat">
              {eligibleNotes.length ? (
                eligibleNotes.map((note) => (
                  <label className="care-memory-row compact" key={note.entityKey}>
                    <input
                      checked={selectedGrantKeys.includes(note.entityKey)}
                      disabled={grantScope === "temporary_full_view"}
                      onChange={() => toggleSelected(note)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{safeText(note.decrypted?.title)}</strong>
                      <small>{reflectionLabel(note)} / encrypted / updated {formatDate(note.updatedAt)}</small>
                    </span>
                    <em>{grantScope === "temporary_full_view" ? "included" : "select"}</em>
                  </label>
                ))
              ) : (
                <div className="care-empty">
                  <strong>No readable reflections yet</strong>
                  <p>Write or load encrypted reflections before preparing a Care Passport grant.</p>
                </div>
              )}
            </div>
          </div>

          <div className="care-actions">
            <button className="care-btn primary" disabled={busy === "grant" || !wallet || !activeVault} type="submit">
              <ShieldCheck size={16} />
              <span>{busy === "grant" ? "Creating" : "Create access grant"}</span>
            </button>
            <ActionButton icon={<FileText size={16} />} onClick={() => navigate("workbench")}>
              Review dashboard
            </ActionButton>
            <ActionButton icon={<RefreshCw size={16} />} onClick={() => setSelectedKeys(new Set(eligibleNotes.map((note) => note.entityKey)))}>
              Select all readable
            </ActionButton>
          </div>
          {renderFeedback(grantFeedback, "Grant")}
        </form>

        <aside className="care-panel">
          <div className="care-panel-head">
            <h2>Access summary</h2>
            <span>{grantIncluded.length} selected</span>
          </div>
          <div className="care-review">
            <article>
              <span>Therapist wallet</span>
              <h3>{grantWallet || "Wallet required"}</h3>
              <p>{grantPurpose}</p>
            </article>
            <article>
              <span>Scope</span>
              <h3>{grantScope === "temporary_full_view" ? "Temporary full-view access" : "Selected notes only"}</h3>
              <p>Expires after {grantDays} days. Access can be revoked before expiry.</p>
            </article>
            <article>
              <span>Included notes</span>
              <p>
                {grantIncluded.length
                  ? grantIncluded.map((note) => `- ${safeText(note.decrypted?.title)}`).join("\n")
                  : "Select at least one reflection before granting access."}
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
        </aside>
      </div>
    </section>
  );
}

function renderWorkbenchView(props: {
  activeGrant: AccessGrantRecord | undefined;
  activeVault: VaultRecord | undefined;
  busy: string;
  eligibleNotes: NoteRecord[];
  entryFeedback: Feedback;
  filter: "all" | CareReflectionType;
  filteredNotes: NoteRecord[];
  grantFeedback: Feedback;
  grants: AccessGrantRecord[];
  handleCopyPacket: () => void;
  handleCopyProof: () => void;
  loadWalletData: () => void;
  packet: string;
  privateLockedCount: number;
  proofReceipt: string;
  query: string;
  readableNotes: NoteRecord[];
  rehearsal: boolean;
  renderFeedback: (feedback: Feedback, label: string) => ReactNode;
  revokeGrant: (grantKey: string) => Promise<void>;
  selectVisible: () => void;
  selectedKeys: Set<string>;
  selectedNotes: NoteRecord[];
  setFilter: (value: "all" | CareReflectionType) => void;
  setQuery: (value: string) => void;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
  setShowProof: (value: boolean) => void;
  showProof: boolean;
  spaceFeedback: Feedback;
  toggleSelected: (note: NoteRecord) => void;
  wallet: string;
}) {
  const {
    activeGrant,
    activeVault,
    busy,
    eligibleNotes,
    entryFeedback,
    filter,
    filteredNotes,
    grantFeedback,
    grants,
    handleCopyPacket,
    handleCopyProof,
    loadWalletData,
    packet,
    privateLockedCount,
    proofReceipt,
    query,
    readableNotes,
    rehearsal,
    renderFeedback,
    revokeGrant,
    selectVisible,
    selectedKeys,
    selectedNotes,
    setFilter,
    setQuery,
    setSelectedKeys,
    setShowProof,
    showProof,
    spaceFeedback,
    toggleSelected,
    wallet,
  } = props;

  return (
    <section className="care-workspace">
      <aside className="care-panel care-rail" aria-label="Encrypted reflections">
        <div className="care-panel-head">
          <div>
            <h2>Memories</h2>
            <p>Select the notes this session can use.</p>
          </div>
          <span>{selectedNotes.length} selected</span>
        </div>

        <TextField label="Search memories">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or tag" value={query} />
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

        <div className="care-memory-list">
          {filteredNotes.length ? (
            filteredNotes.map((note) => {
              const privateLocked = Boolean(note.decrypted?.privateLocked);
              const readable = Boolean(note.decrypted);
              const selected = selectedKeys.has(note.entityKey);
              return (
                <button
                  aria-pressed={selected}
                  className={classNames("care-memory-button", selected && "selected", privateLocked && "private", !readable && "locked")}
                  disabled={!readable || privateLocked}
                  key={note.entityKey}
                  onClick={() => toggleSelected(note)}
                  type="button"
                >
                  <span>
                    <small>{reflectionLabel(note)}</small>
                    <strong>{safeText(note.decrypted?.title)}</strong>
                    <em>{safeText(note.decrypted?.body, "Use the original local key to read this reflection.")}</em>
                  </span>
                  <code>{note.entityKey.slice(0, 18)}...</code>
                  <StatusDot tone={privateLocked ? "danger" : readable ? "success" : "warn"}>
                    {privateLocked ? "Private lock" : readable ? "Readable" : "Key needed"}
                  </StatusDot>
                </button>
              );
            })
          ) : (
            <div className="care-empty">
              <strong>No reflections match</strong>
              <p>Adjust search or write a new encrypted reflection.</p>
            </div>
          )}
        </div>

        <div className="care-rail-foot">
          <ActionButton icon={<RefreshCw size={16} />} onClick={loadWalletData}>
            {busy === "load" ? "Loading" : rehearsal ? "Reload rehearsal" : "Load from Arkiv"}
          </ActionButton>
          <ActionButton icon={<CheckCircle2 size={16} />} onClick={selectVisible}>
            Select visible
          </ActionButton>
        </div>
      </aside>

      <section className="care-workbench">
        <div className="care-panel">
          <div className="care-panel-head">
            <div>
              <h1>Access dashboard</h1>
              <p>See what is selected, who can access it, and what gets copied before you share anything.</p>
            </div>
            <span>{selectedNotes.length} memories</span>
          </div>
          <div className="care-trust-grid" aria-label="Trust summary">
            <div>
              <StatusDot tone={activeVault ? "success" : "warn"}>{activeVault ? "Connected" : "Waiting"}</StatusDot>
              <p>{wallet ? shortAddress(wallet) : "Connect a wallet"}</p>
            </div>
            <div>
              <StatusDot tone={readableNotes.length ? "success" : "warn"}>{readableNotes.length ? "Protected" : "Locked"}</StatusDot>
              <p>Encrypted locally</p>
            </div>
            <div>
              <StatusDot tone={activeGrant ? "warn" : "muted"}>{activeGrant ? "Sharing" : "No access"}</StatusDot>
              <p>{activeGrant ? `Access ends ${formatDate(activeGrant.expiresAt)}` : "No one has access yet"}</p>
            </div>
            <div>
              <StatusDot tone={selectedNotes.length ? "success" : "warn"}>{selectedNotes.length ? "Ready" : "Review"}</StatusDot>
              <p>{privateLockedCount ? `${privateLockedCount} private locked` : "Review selected notes"}</p>
            </div>
          </div>
        </div>

        <div className="care-panel">
          <div className="care-selected-strip">
            <div>
              <span>What gets shared</span>
              <p>A readable care packet, not raw network records. Private-locked and unselected entries stay out.</p>
            </div>
            <div className="care-actions">
              <ActionButton className="primary" disabled={!selectedNotes.length} icon={<Clipboard size={16} />} onClick={handleCopyPacket}>
                Copy care packet
              </ActionButton>
              <ActionButton disabled={!selectedNotes.length} icon={<Copy size={16} />} onClick={handleCopyProof}>
                Copy receipt
              </ActionButton>
              <ActionButton icon={<XCircle size={16} />} onClick={() => setSelectedKeys(new Set())}>
                Clear
              </ActionButton>
            </div>
          </div>
          <pre className="care-packet">{packet}</pre>
        </div>

        <div className="care-panel">
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
                      <h3>{grant.scope === "temporary_full_view" ? "Full view" : "Selected notes only"}</h3>
                      <p>
                        Therapist wallet {shortAddress(grant.therapistWallet)} can use the approved context until{" "}
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
        </div>

        <details className="care-proof" open={showProof} onToggle={(event) => setShowProof(event.currentTarget.open)}>
          <summary>Proof details</summary>
          <div className="care-proof-grid">
            <span>Mode</span>
            <span>{rehearsal ? "Local rehearsal - no Braga write" : "Braga Testnet"}</span>
            <span>Wallet</span>
            <code>{wallet || "Not connected"}</code>
            <span>Project scope</span>
            <code>{PROJECT_ATTRIBUTE.value}</code>
            <span>Diary space</span>
            <code>{activeVault?.entityKey ?? "No diary space yet"}</code>
            <span>Selected records</span>
            <code>{selectedNotes.map((note) => note.entityKey).join(", ") || "None selected"}</code>
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
      </section>
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
    return "Select at least one readable, non-private-locked reflection to prepare a Care Passport care packet.";
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
    "Only selected Reflection Entries are included. Private-locked entries and unselected entries are not part of this packet.",
    "",
    "Grant terms:",
    `- ${grant ? `Therapist wallet ${shortAddress(grant.therapistWallet)} only` : "No therapist grant is active yet"}`,
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
  wallet: string;
}): string {
  const { activeGrant, activeVault, grants, notes, rehearsal, wallet } = params;
  return [
    "Care Passport verified receipt",
    `Mode: ${rehearsal ? "local rehearsal - no Braga write" : "Braga Testnet"}`,
    `Project: ${PROJECT_ATTRIBUTE.value}`,
    `Wallet: ${wallet || "not connected"}`,
    `Diary space: ${activeVault?.entityKey ?? "none"}`,
    `Selected reflection records: ${notes.map((note) => note.entityKey).join(", ") || "none"}`,
    `Access grant: ${activeGrant ? `${activeGrant.entityKey} (${grantStatus(activeGrant)})` : "none"}`,
    `Grant count: ${grants.length}`,
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

  const secrets: NoteSecret[] = [
    {
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
    {
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
    {
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
    {
      body: "The user prefers therapists to ask before reframing family history or summarizing motives.",
      feeling: "More trusting when interpretations are checked first.",
      memoryType: "personal_preference",
      privateLocked: false,
      rememberNextSession: "Ask before reframing family history.",
      tags: ["preference", "family"],
      title: "Ask before family reframing",
    },
    {
      body: "This entry is intentionally private-locked to show that not every diary item enters a therapist handoff.",
      eventContext: "Sensitive third-party detail.",
      feeling: "Not ready to share this in intake.",
      memoryType: "relationship_context",
      privateLocked: true,
      rememberNextSession: "Only share if explicitly unlocked later.",
      tags: ["private", "boundary"],
      title: "Private family detail",
    },
  ];

  const notes = await Promise.all(
    secrets.map(async (secret, index) => {
      const createdAt = now - (index + 1) * 24 * 60 * 60 * 1000;
      const envelope = await encryptJson(secret, REHEARSAL_KEY);
      return {
        contentClass: secret.memoryType,
        createdAt,
        decrypted: secret,
        entityKey: rehearsalEntityKey("memory", index + 101),
        envelope,
        owner: REHEARSAL_WALLET.toLowerCase(),
        status: "active" as const,
        updatedAt: createdAt,
        vaultKey: vault.entityKey,
      };
    }),
  );

  const includedNoteKeys = notes.filter((note) => !note.decrypted?.privateLocked).slice(0, 3).map((note) => note.entityKey);
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
