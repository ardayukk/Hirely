// SellerWorkspace.tsx
// A full-featured Freelancer (Seller) workspace built with MUI.
// Covers: Seller Dashboard, My Services, Create/Edit Service, Orders, Order Detail (workroom),
// Earnings & Wallet, Payouts/Banking (KYC + withdrawals), Seller Profile (private), Portfolio Manager.
//
// Assumptions: React 18+, TypeScript, @mui/material, @mui/icons-material installed.
// Mock "API" included at bottom for easy integration replacement.

import {
    Add as AddIcon,
    AccountBalance as BankIcon,
    Chat as ChatIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    QueryBuilder as DueIcon,
    Edit as EditIcon,
    FilePresent as FileIcon,
    Image as ImageIcon,
    VerifiedUser as KycIcon,
    MonetizationOn as MoneyIcon,
    Pause as PauseIcon,
    PlayArrow as PlayIcon,
    Preview as PreviewIcon,
    RocketLaunch as PublishIcon,
    Refresh as RefreshIcon,
    Storefront as StoreIcon,
    LocalOffer as TagIcon,
    CloudUpload as UploadIcon,
    AccountBalanceWallet as WalletIcon,
    Warning as WarningIcon
} from "@mui/icons-material";
import {
    AppBar,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    IconButton,
    InputAdornment,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Grid as MuiGrid,
    Paper,
    Radio,
    RadioGroup,
    Snackbar,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";

// Workaround: some MUI Grid type definitions here conflict with our TypeScript setup.
// Create a local any-typed alias so JSX usages of <Grid .../> compile cleanly.
const Grid: any = MuiGrid;

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------
type Currency = "USD" | "EUR" | "TRY";

type PackageTier = {
    name: "Basic" | "Standard" | "Premium" | string;
    price: number;
    deliveryDays: number;
    revisions: number;
    features: string[];
};

type Service = {
    id: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    tags: string[];
    status: "active" | "paused" | "draft";
    coverUrl?: string;
    mediaUrls: string[];
    packages: PackageTier[];
    rating?: number;
    totalReviews?: number;
    createdAt: string;
    updatedAt: string;
};

type OrderStatus =
    | "submitted"
    | "in_progress"
    | "delivered"
    | "revision_requested"
    | "completed"
    | "cancelled"
    | "disputed";

type Order = {
    id: string;
    serviceId: string;
    serviceTitle: string;
    buyerName: string;
    submittedAt: string;
    dueAt: string;
    price: number;
    currency: Currency;
    status: OrderStatus;
    requirements: string;
    allowedRevisions: number;
    usedRevisions: number;
    thread: Message[];
    deliveries: Delivery[];
    dispute?: {
        openedAt: string;
        reason: string;
        status: "open" | "resolved_refund" | "resolved_release";
    };
};

type Message = {
    id: string;
    author: "buyer" | "seller" | "system";
    body: string;
    at: string;
};

type Delivery = {
    id: string;
    at: string;
    message?: string;
    files: { name: string; url?: string }[];
};

type Wallet = {
    available: number;
    pending: number;
    currency: Currency;
    transactions: {
        id: string;
        type:
        | "order_income"
        | "revision_bonus"
        | "withdrawal"
        | "fee"
        | "refund"
        | "adjustment";
        amount: number;
        at: string;
        note?: string;
    }[];
    onTimeRate: number; // 0..1
};

type PayoutProfile = {
    kycStatus: "not_started" | "pending" | "verified";
    method?: {
        type: "bank" | "paypal";
        label: string;
        detailsMasked: string;
    };
};

type SellerProfile = {
    displayName: string;
    bio: string;
    languages: { code: string; level: "Basic" | "Fluent" | "Native" }[];
    skills: string[];
    vacationMode: boolean;
    vacationNote?: string;
};

type PortfolioItem = {
    id: string;
    title: string;
    type: "image" | "video";
    url: string;
    thumbnailUrl?: string;
    order: number;
};

// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------
function fmtMoney(amount: number, ccy: Currency) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: ccy
    }).format(amount);
}
function daysLeft(dueAtISO: string) {
    const diffMs = new Date(dueAtISO).getTime() - Date.now();
    return diffMs / (1000 * 60 * 60 * 24);
}
function isDueSoon(dueAtISO: string) {
    return daysLeft(dueAtISO) <= 1 && daysLeft(dueAtISO) > 0;
}
function isOverdue(dueAtISO: string) {
    return new Date(dueAtISO).getTime() < Date.now();
}

const stepsCreateService = ["Basics", "Packages", "Gallery", "Preview"] as const;

// ---------------------------------------------------------
// Root Workspace
// ---------------------------------------------------------
export default function SellerWorkspace() {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
    const [tab, setTab] = useState(0);

    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<Service[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [payout, setPayout] = useState<PayoutProfile | null>(null);
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [snack, setSnack] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            // Load initial data from mock API
            const [svc, ord, wal, pay, pro, port] = await Promise.all([
                api.listServices(),
                api.listOrders(),
                api.getWallet(),
                api.getPayoutProfile(),
                api.getSellerProfile(),
                api.getPortfolio()
            ]);
            setServices(svc);
            setOrders(ord);
            setWallet(wal);
            setPayout(pay);
            setProfile(pro);
            setPortfolio(port);
            setLoading(false);
        })();
    }, []);

    // Derived quick metrics
    const activeOrders = useMemo(
        () => orders.filter((o) => ["submitted", "in_progress", "revision_requested", "delivered", "disputed"].includes(o.status)),
        [orders]
    );
    const dueSoonCount = useMemo(() => activeOrders.filter((o) => isDueSoon(o.dueAt)).length, [activeOrders]);

    return (
        <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
            <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Container maxWidth="lg" sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <StoreIcon />
                            <Typography variant="h6" fontWeight={700}>Seller Workspace</Typography>
                            <Chip
                                color="primary"
                                variant="outlined"
                                size="small"
                                icon={<DueIcon fontSize="small" />}
                                label={`Active Orders: ${activeOrders.length}`}
                            />
                            <Chip
                                color={dueSoonCount > 0 ? "warning" : "default"}
                                size="small"
                                icon={<WarningIcon fontSize="small" />}
                                label={`${dueSoonCount} due soon`}
                            />
                            {wallet && (
                                <Chip
                                    color="success"
                                    size="small"
                                    icon={<WalletIcon fontSize="small" />}
                                    label={`Available: ${fmtMoney(wallet.available, wallet.currency)}`}
                                />
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar alt="You" />
                            <Typography variant="body2" color="text.secondary">{profile?.displayName ?? "Seller"}</Typography>
                        </Stack>
                    </Stack>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant={isMdUp ? "standard" : "scrollable"}
                        scrollButtons={isMdUp ? false : "auto"}
                        sx={{ mt: 1 }}
                    >
                        <Tab label="Dashboard" />
                        <Tab label="My Services" />
                        <Tab label="Create / Edit Service" />
                        <Tab
                            label={
                                <Badge color="warning" badgeContent={dueSoonCount || null}>
                                    <span>Orders</span>
                                </Badge>
                            }
                        />
                        <Tab label="Earnings & Wallet" />
                        <Tab label="Payouts / Banking" />
                        <Tab label="Seller Profile" />
                        <Tab label="Portfolio Manager" />
                    </Tabs>
                </Container>
            </AppBar>

            {loading && (
                <LinearProgress />
            )}

            {!loading && (
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    {tab === 0 && (
                        <SellerDashboard
                            services={services}
                            orders={orders}
                            wallet={wallet!}
                            onRefresh={async () => {
                                setLoading(true);
                                const [ord, wal] = await Promise.all([api.listOrders(), api.getWallet()]);
                                setOrders(ord);
                                setWallet(wal);
                                setLoading(false);
                                setSnack("Dashboard refreshed.");
                            }}
                        />
                    )}

                    {tab === 1 && (
                        <MyServices
                            services={services}
                            onDuplicate={async (id) => {
                                const s = await api.duplicateService(id);
                                setServices((prev) => [s, ...prev]);
                                setSnack("Service duplicated.");
                            }}
                            onToggleStatus={async (id) => {
                                const updated = await api.toggleServiceStatus(id);
                                setServices((prev) => prev.map((x) => (x.id === id ? updated : x)));
                            }}
                            onEdit={(id) => {
                                setTab(2);
                                setSnack("Loaded service into editor.");
                                // Optionally set a draft in editor via localStorage or state; here handled in CreateEdit
                                api.setEditorDraftFromService(id);
                            }}
                            onDelete={async (id) => {
                                await api.deleteService(id);
                                setServices((prev) => prev.filter((s) => s.id !== id));
                                setSnack("Service deleted.");
                            }}
                            onCreateNew={() => {
                                api.resetEditorDraft();
                                setTab(2);
                            }}
                        />
                    )}

                    {tab === 2 && (
                        <CreateEditService
                            onSaved={async (newOrUpdated) => {
                                // upsert into local list
                                setServices((prev) => {
                                    const idx = prev.findIndex((s) => s.id === newOrUpdated.id);
                                    if (idx >= 0) {
                                        const copy = [...prev];
                                        copy[idx] = newOrUpdated;
                                        return copy;
                                    }
                                    return [newOrUpdated, ...prev];
                                });
                                setSnack("Service saved.");
                            }}
                        />
                    )}

                    {tab === 3 && (
                        <SellerOrders
                            orders={orders}
                            onRefresh={async () => {
                                setLoading(true);
                                setOrders(await api.listOrders());
                                setLoading(false);
                            }}
                            onAccept={async (id) => {
                                const updated = await api.acceptOrder(id);
                                setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
                            }}
                            onReject={async (id) => {
                                const updated = await api.rejectOrder(id);
                                setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
                            }}
                            onOrderUpdated={(order) => {
                                setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
                            }}
                        />
                    )}

                    {tab === 4 && wallet && (
                        <EarningsWallet wallet={wallet} />
                    )}

                    {tab === 5 && payout && (
                        <PayoutsBanking
                            payout={payout}
                            onSubmitKYC={async () => {
                                const p = await api.submitKYC();
                                setPayout(p);
                            }}
                            onSetMethod={async (method) => {
                                const p = await api.setPayoutMethod(method);
                                setPayout(p);
                            }}
                            onWithdraw={async (amount) => {
                                const [p, w] = await Promise.all([api.requestWithdrawal(amount), api.getWallet()]);
                                setPayout(p);
                                setWallet(w);
                            }}
                            wallet={wallet!}
                        />
                    )}

                    {tab === 6 && profile && (
                        <SellerProfileView
                            profile={profile}
                            onSave={async (changes) => {
                                const p = await api.updateSellerProfile(changes);
                                setProfile(p);
                            }}
                        />
                    )}

                    {tab === 7 && (
                        <PortfolioManager
                            items={portfolio}
                            onAdd={async (file) => {
                                const item = await api.addPortfolioItem(file);
                                setPortfolio((prev) => [...prev, item].sort((a, b) => a.order - b.order));
                            }}
                            onDelete={async (id) => {
                                await api.deletePortfolioItem(id);
                                setPortfolio((prev) => prev.filter((x) => x.id !== id));
                            }}
                            onReorder={async (orderedIds) => {
                                const updated = await api.reorderPortfolio(orderedIds);
                                setPortfolio(updated);
                            }}
                        />
                    )}
                </Container>
            )}

            <Snackbar
                open={!!snack}
                autoHideDuration={3000}
                onClose={() => setSnack(null)}
                message={snack}
            />
        </Box>
    );
}

// ---------------------------------------------------------
// 1) Seller Dashboard
// ---------------------------------------------------------
function SellerDashboard({
    services,
    orders,
    wallet,
    onRefresh
}: {
    services: Service[];
    orders: Order[];
    wallet: Wallet;
    onRefresh: () => Promise<void>;
}) {
    const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
    const completion = Math.min(
        100,
        Math.round((wallet.onTimeRate || 0) * 100)
    );

    const earnings30 = wallet.transactions
        .filter((t) => (Date.now() - new Date(t.at).getTime()) <= 1000 * 60 * 60 * 24 * 30)
        .reduce((sum, t) => sum + (t.type === "withdrawal" ? 0 : t.amount), 0);

    return (
        <Grid container spacing={3}>
            <Grid component="div" xs={12} md={4}>
                <Card>
                    <CardHeader
                        avatar={<WalletIcon />}
                        title="Earnings Snapshot"
                        subheader="Available vs Pending"
                        action={
                            <Tooltip title="Refresh">
                                <IconButton onClick={onRefresh}><RefreshIcon /></IconButton>
                            </Tooltip>
                        }
                    />
                    <CardContent>
                        <Stack spacing={1.5}>
                            <Typography variant="h4">{fmtMoney(wallet.available, wallet.currency)} <Typography component="span" color="text.secondary" variant="subtitle2">available</Typography></Typography>
                            <Typography variant="h6" color="text.secondary">{fmtMoney(wallet.pending, wallet.currency)} pending</Typography>
                            <Divider />
                            <Typography variant="body2">Last 30 days gross: <b>{fmtMoney(earnings30, wallet.currency)}</b></Typography>
                            <LinearProgress variant="determinate" value={completion} />
                            <Typography variant="caption">On-time delivery rate: {completion}%</Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid component="div" xs={12} md={4}>
                <Card>
                    <CardHeader avatar={<StoreIcon />} title="Active Orders" subheader="With due warnings" />
                    <CardContent>
                        <List dense>
                            {active.slice(0, 5).map((o) => (
                                <ListItem key={o.id} secondaryAction={
                                    isOverdue(o.dueAt) ? (
                                        <Chip color="error" size="small" icon={<WarningIcon />} label="Overdue" />
                                    ) : isDueSoon(o.dueAt) ? (
                                        <Chip color="warning" size="small" icon={<DueIcon />} label="Due soon" />
                                    ) : (
                                        <Chip color="default" size="small" label="On track" />
                                    )
                                }>
                                    <ListItemIcon><DueIcon /></ListItemIcon>
                                    <ListItemText
                                        primary={`${o.serviceTitle} — ${fmtMoney(o.price, o.currency)}`}
                                        secondary={`Buyer: ${o.buyerName} • Due: ${new Date(o.dueAt).toLocaleString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        {active.length === 0 && <Typography color="text.secondary">No active orders.</Typography>}
                    </CardContent>
                </Card>
            </Grid>

            <Grid component="div" xs={12} md={4}>
                <Card>
                    <CardHeader avatar={<StoreIcon />} title="Services" subheader="Your listings" />
                    <CardContent>
                        <Stack spacing={1}>
                            {services.slice(0, 5).map((s) => (
                                <Stack direction="row" key={s.id} alignItems="center" spacing={1}>
                                    <Chip size="small" color={s.status === "active" ? "success" : s.status === "paused" ? "default" : "warning"} label={s.status} />
                                    <Typography variant="body2" flex={1} noWrap title={s.title}>{s.title}</Typography>
                                    <Chip size="small" icon={<TagIcon />} label={s.category} />
                                </Stack>
                            ))}
                            {services.length === 0 && <Typography color="text.secondary">No services yet. Create your first one!</Typography>}
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------
// 2) My Services (list, pause/reactivate, duplicate, edit, delete)
// ---------------------------------------------------------
function MyServices({
    services,
    onDuplicate,
    onToggleStatus,
    onEdit,
    onDelete,
    onCreateNew
}: {
    services: Service[];
    onDuplicate: (id: string) => Promise<void>;
    onToggleStatus: (id: string) => Promise<void>;
    onEdit: (id: string) => void;
    onDelete: (id: string) => Promise<void>;
    onCreateNew: () => void;
}) {
    const [query, setQuery] = useState("");
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return services;
        return services.filter(
            (s) =>
                s.title.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.tags.some((t) => t.toLowerCase().includes(q))
        );
    }, [query, services]);

    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search by title, category, or tag"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                    }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateNew}>New Service</Button>
            </Stack>
            <Grid container spacing={2}>
                {filtered.map((s) => (
                    <Grid component="div" xs={12} md={6} lg={4} key={s.id}>
                        <Card variant="outlined">
                            <CardHeader
                                avatar={<Avatar src={s.coverUrl}>{s.title[0]}</Avatar>}
                                title={s.title}
                                subheader={`${s.category}${s.subcategory ? " • " + s.subcategory : ""}`}
                            />
                            <CardContent>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip size="small" label={s.status} color={s.status === "active" ? "success" : s.status === "paused" ? "default" : "warning"} />
                                    {typeof s.rating === "number" && (
                                        <Chip size="small" label={`★ ${s.rating.toFixed(1)} (${s.totalReviews ?? 0})`} />
                                    )}
                                    <Chip size="small" label={`Packages: ${s.packages.length}`} />
                                </Stack>
                            </CardContent>
                            <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2 }}>
                                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(s.id)}>Edit</Button>
                                <Button size="small" variant="outlined" startIcon={s.status === "active" ? <PauseIcon /> : <PlayIcon />} onClick={() => onToggleStatus(s.id)}>
                                    {s.status === "active" ? "Pause" : "Activate"}
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<CopyIcon />} onClick={() => onDuplicate(s.id)}>Duplicate</Button>
                                <Box flex={1} />
                                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(s.id)}>Delete</Button>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
                {filtered.length === 0 && (
                    <Grid component="div" xs={12}>
                        <Paper sx={{ p: 4, textAlign: "center" }}>
                            <Typography>No services match your search.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Stack>
    );
}

// icon used in MyServices search
function SearchIcon() {
    return <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5m-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" /></svg>;
}

// ---------------------------------------------------------
// 3) Create / Edit Service (stepper form + preview + publish)
// ---------------------------------------------------------
function CreateEditService({
    onSaved
}: {
    onSaved: (service: Service) => Promise<void>;
}) {
    const [activeStep, setActiveStep] = useState(0);
    const [saving, setSaving] = useState(false);

    // Load draft from mock editor store
    const [title, setTitle] = useState(api.editorDraft.title);
    const [description, setDescription] = useState(api.editorDraft.description);
    const [category, setCategory] = useState(api.editorDraft.category);
    const [subcategory, setSubcategory] = useState(api.editorDraft.subcategory || "");
    const [tags, setTags] = useState<string[]>(api.editorDraft.tags);
    const [packages, setPackages] = useState<PackageTier[]>(api.editorDraft.packages);
    const [mediaUrls, setMediaUrls] = useState<string[]>(api.editorDraft.mediaUrls);

    useEffect(() => {
        // Persist to draft store on change
        api.editorDraft = { title, description, category, subcategory, tags, packages, mediaUrls };
    }, [title, description, category, subcategory, tags, packages, mediaUrls]);

    const canNext =
        (activeStep === 0 && title.trim().length >= 8 && category.trim().length > 0 && description.trim().length >= 30) ||
        (activeStep === 1 && packages.length > 0) ||
        (activeStep === 2 && mediaUrls.length > 0) ||
        activeStep === 3;

    const handleSave = async (publish: boolean) => {
        setSaving(true);
        const saved = await api.upsertServiceDraft({ title, description, category, subcategory, tags, packages, mediaUrls }, publish);
        setSaving(false);
        await onSaved(saved);
        if (publish) {
            // reset editor
            api.resetEditorDraft();
            setTitle(""); setDescription(""); setCategory(""); setSubcategory(""); setTags([]); setPackages([]); setMediaUrls([]);
            setActiveStep(0);
        }
    };

    return (
        <Box>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                {stepsCreateService.map((label) => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

            {activeStep === 0 && (
                <Stack spacing={2} component={Paper} sx={{ p: 2 }}>
                    <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} helperText="At least 8 characters, concise & descriptive." />
                    <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} minRows={4} multiline helperText="Describe what you deliver and what you need from the client." />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth />
                        <TextField label="Subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} fullWidth />
                    </Stack>
                    <TextField
                        label="Tags (comma-separated)"
                        value={tags.join(", ")}
                        onChange={(e) => setTags(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                        helperText="Used for search & filtering."
                    />
                </Stack>
            )}

            {activeStep === 1 && (
                <PackageEditor value={packages} onChange={setPackages} />
            )}

            {activeStep === 2 && (
                <GalleryEditor mediaUrls={mediaUrls} onChange={setMediaUrls} />
            )}

            {activeStep === 3 && (
                <ServicePreview
                    data={{ title, description, category, subcategory, tags, packages, mediaUrls }}
                />
            )}

            <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
                <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>Back</Button>
                <Stack direction="row" spacing={1}>
                    {activeStep < stepsCreateService.length - 1 ? (
                        <Button
                            variant="contained"
                            endIcon={<PreviewIcon />}
                            disabled={!canNext}
                            onClick={() => setActiveStep((s) => Math.min(stepsCreateService.length - 1, s + 1))}
                        >
                            Next
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<SaveIcon />}
                                disabled={saving}
                                onClick={() => handleSave(false)}
                            >
                                Save Draft
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<PublishIcon />}
                                disabled={saving}
                                onClick={() => handleSave(true)}
                            >
                                Publish
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}

function SaveIcon() { return <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14l4-4h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" /></svg>; }

function PackageEditor({
    value,
    onChange
}: {
    value: PackageTier[];
    onChange: (v: PackageTier[]) => void;
}) {
    const [local, setLocal] = useState<PackageTier[]>(value.length ? value : [
        { name: "Basic", price: 25, deliveryDays: 3, revisions: 1, features: ["1 page", "Basic design"] },
        { name: "Standard", price: 60, deliveryDays: 5, revisions: 2, features: ["3 pages", "Custom design"] },
        { name: "Premium", price: 120, deliveryDays: 7, revisions: 3, features: ["5 pages", "Premium design"] }
    ]);

    useEffect(() => onChange(local), [local, onChange]);

    const update = (idx: number, patch: Partial<PackageTier>) => {
        setLocal((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    };

    return (
        <Stack spacing={2}>
            {local.map((p, idx) => (
                <Paper key={idx} sx={{ p: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Name" value={p.name} onChange={(e) => update(idx, { name: e.target.value })} />
                        <TextField type="number" label="Price (USD)" value={p.price} onChange={(e) => update(idx, { price: Number(e.target.value) })} />
                        <TextField type="number" label="Delivery Days" value={p.deliveryDays} onChange={(e) => update(idx, { deliveryDays: Number(e.target.value) })} />
                        <TextField type="number" label="Revisions" value={p.revisions} onChange={(e) => update(idx, { revisions: Number(e.target.value) })} />
                    </Stack>
                    <TextField
                        sx={{ mt: 1 }}
                        label="Features (comma-separated)"
                        value={p.features.join(", ")}
                        onChange={(e) => update(idx, { features: e.target.value.split(",").map((f) => f.trim()).filter(Boolean) })}
                        fullWidth
                    />
                </Paper>
            ))}
            <Button variant="outlined" onClick={() => setLocal((prev) => [...prev, { name: `Custom ${prev.length + 1}`, price: 50, deliveryDays: 3, revisions: 1, features: [] }])}>
                Add Package
            </Button>
        </Stack>
    );
}

function GalleryEditor({
    mediaUrls,
    onChange
}: {
    mediaUrls: string[];
    onChange: (urls: string[]) => void;
}) {
    const [url, setUrl] = useState("");
    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
                <TextField fullWidth label="Add image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => { if (url.trim()) { onChange([...mediaUrls, url.trim()]); setUrl(""); } }}>
                    Add
                </Button>
            </Stack>
            <Grid container spacing={2}>
                {mediaUrls.map((u, i) => (
                    <Grid component="div" xs={6} md={3} key={i}>
                        <Card>
                            <CardActionArea>
                                <Box component="img" src={u} alt="" sx={{ width: "100%", height: 140, objectFit: "cover" }} />
                            </CardActionArea>
                            <Stack direction="row" justifyContent="space-between" sx={{ p: 1 }}>
                                <Typography variant="caption" noWrap>{u}</Typography>
                                <IconButton size="small" onClick={() => onChange(mediaUrls.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
}

function ServicePreview({
    data
}: {
    data: Pick<Service, "title" | "description" | "category" | "subcategory" | "tags" | "packages" | "mediaUrls">;
}) {
    return (
        <Grid container spacing={3}>
            <Grid component="div" xs={12} md={7}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">{data.title || "Untitled Service"}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {data.category} {data.subcategory ? `• ${data.subcategory}` : ""}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                        {data.tags.map((t, i) => <Chip key={i} size="small" label={t} />)}
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Typography whiteSpace="pre-wrap">{data.description}</Typography>
                </Paper>
            </Grid>
            <Grid component="div" xs={12} md={5}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Packages</Typography>
                    <Stack spacing={1.5}>
                        {data.packages.map((p, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography fontWeight={600}>{p.name}</Typography>
                                    <Typography>{fmtMoney(p.price, "USD")}</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary">Delivery: {p.deliveryDays} day(s) • Revisions: {p.revisions}</Typography>
                                {p.features.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                        {p.features.map((f, idx) => <Chip key={idx} size="small" label={f} />)}
                                    </Stack>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                </Paper>
                <Paper sx={{ mt: 2, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Gallery</Typography>
                    <Grid container spacing={1}>
                        {data.mediaUrls.map((u, i) => (
                            <Grid component="div" xs={6} key={i}>
                                <Box component="img" src={u} alt="" sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1 }} />
                            </Grid>
                        ))}
                        {data.mediaUrls.length === 0 && <Typography color="text.secondary">No media yet.</Typography>}
                    </Grid>
                </Paper>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------
// 4) Seller Orders (list) + 5) Order Detail (workroom)
// ---------------------------------------------------------
function SellerOrders({
    orders,
    onRefresh,
    onAccept,
    onReject,
    onOrderUpdated
}: {
    orders: Order[];
    onRefresh: () => Promise<void>;
    onAccept: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onOrderUpdated: (order: Order) => void;
}) {
    const [selected, setSelected] = useState<Order | null>(null);
    const [filter, setFilter] = useState<"all" | OrderStatus>("all");

    const filtered = useMemo(() => {
        return filter === "all" ? orders : orders.filter((o) => o.status === filter);
    }, [orders, filter]);

    return (
        <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">Orders</Typography>
                    <Chip size="small" label={`${orders.length} total`} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" select label="Status" value={filter} onChange={(e) => setFilter(e.target.value as any)} sx={{ minWidth: 220 }}>
                        <MenuItem value="all">All</MenuItem>
                        {["submitted", "in_progress", "delivered", "revision_requested", "completed", "cancelled", "disputed"].map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </TextField>
                    <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
                </Stack>
            </Stack>

            <Grid container spacing={2}>
                {filtered.map((o) => (
                    <Grid component="div" xs={12} md={6} key={o.id}>
                        <Card variant="outlined">
                            <CardHeader
                                avatar={<Avatar>{o.buyerName[0]}</Avatar>}
                                title={`${o.serviceTitle}`}
                                subheader={`Buyer: ${o.buyerName}`}
                                action={
                                    isOverdue(o.dueAt) ? (
                                        <Chip color="error" icon={<WarningIcon />} label="Overdue" />
                                    ) : isDueSoon(o.dueAt) ? (
                                        <Chip color="warning" icon={<DueIcon />} label="Due soon" />
                                    ) : (
                                        <Chip color="default" label={o.status} />
                                    )
                                }
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Due: {new Date(o.dueAt).toLocaleString()} • Price: {fmtMoney(o.price, o.currency)}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }} noWrap title={o.requirements}>
                                    Requirements: {o.requirements}
                                </Typography>
                            </CardContent>
                            <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2 }}>
                                {o.status === "submitted" && (
                                    <>
                                        <Button variant="contained" onClick={() => onAccept(o.id)}>Accept</Button>
                                        <Button color="error" onClick={() => onReject(o.id)}>Reject</Button>
                                    </>
                                )}
                                <Button variant="outlined" startIcon={<ChatIcon />} onClick={() => setSelected(o)}>Open Workroom</Button>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
                {filtered.length === 0 && (
                    <Grid component="div" xs={12}>
                        <Paper sx={{ p: 4, textAlign: "center" }}>
                            <Typography>No orders for this filter.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            <OrderWorkroom
                order={selected}
                open={!!selected}
                onClose={() => setSelected(null)}
                onUpdate={(o) => {
                    onOrderUpdated(o);
                    setSelected(o);
                }}
            />
        </Box>
    );
}

function OrderWorkroom({
    order,
    open,
    onClose,
    onUpdate
}: {
    order: Order | null;
    open: boolean;
    onClose: () => void;
    onUpdate: (o: Order) => void;
}) {
    const [message, setMessage] = useState("");
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    if (!order) return null;

    const canDeliver = ["in_progress", "revision_requested", "delivered"].includes(order.status);
    const canRequestRevision = order.status === "delivered" && order.usedRevisions < order.allowedRevisions;
    const revisionLeft = Math.max(0, order.allowedRevisions - order.usedRevisions);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Order Workroom — {order.serviceTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid component="div" xs={12} md={7}>
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Client Requirements</Typography>
                            <Typography sx={{ whiteSpace: "pre-wrap" }}>{order.requirements}</Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography variant="subtitle2" color="text.secondary">Timeline</Typography>
                            <Typography variant="body2">
                                Submitted: {new Date(order.submittedAt).toLocaleString()} • Due: {new Date(order.dueAt).toLocaleString()}
                            </Typography>
                            <Typography variant="body2">Status: <b>{order.status}</b></Typography>
                            {order.dispute && (
                                <Chip color="error" icon={<WarningIcon />} label={`Dispute: ${order.dispute.status} — ${order.dispute.reason}`} sx={{ mt: 1 }} />
                            )}
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Conversation</Typography>
                            <List dense sx={{ maxHeight: 260, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}>
                                {order.thread.map((m) => (
                                    <ListItem key={m.id} alignItems="flex-start">
                                        <ListItemAvatar><Avatar>{m.author[0].toUpperCase()}</Avatar></ListItemAvatar>
                                        <ListItemText
                                            primary={`${m.author === "seller" ? "You" : m.author === "buyer" ? "Client" : "System"} • ${new Date(m.at).toLocaleString()}`}
                                            secondary={m.body}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Write a message to client..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <Button
                                    variant="contained"
                                    disabled={!message.trim()}
                                    onClick={async () => {
                                        const o = await api.postMessage(order.id, message.trim());
                                        onUpdate(o);
                                        setMessage("");
                                    }}
                                >
                                    Send
                                </Button>
                            </Stack>
                        </Paper>
                    </Grid>

                    <Grid component="div" xs={12} md={5}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Deliveries</Typography>
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                {order.deliveries.map((d) => (
                                    <Paper key={d.id} variant="outlined" sx={{ p: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary">{new Date(d.at).toLocaleString()}</Typography>
                                        {d.message && <Typography variant="body2" sx={{ mt: 0.5 }}>{d.message}</Typography>}
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                            {d.files.map((f, idx) => (
                                                <Chip key={idx} icon={<FileIcon />} label={f.name} component="a" href={f.url || "#"} clickable />
                                            ))}
                                        </Stack>
                                    </Paper>
                                ))}
                                {order.deliveries.length === 0 && <Typography color="text.secondary">No deliveries yet.</Typography>}
                            </Stack>

                            <FormGroup>
                                <TextField
                                    label="Delivery note (optional)"
                                    value={deliveryMessage}
                                    onChange={(e) => setDeliveryMessage(e.target.value)}
                                    multiline
                                    minRows={3}
                                />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button
                                        startIcon={<UploadIcon />}
                                        disabled={!canDeliver || uploading}
                                        onClick={async () => {
                                            setUploading(true);
                                            const o = await api.uploadDelivery(order.id, {
                                                message: deliveryMessage.trim() || undefined,
                                                files: [{ name: "final.zip" }]
                                            });
                                            setUploading(false);
                                            setDeliveryMessage("");
                                            onUpdate(o);
                                        }}
                                    >
                                        {order.status === "delivered" ? "Re-deliver" : "Upload Delivery"}
                                    </Button>
                                    {order.status === "delivered" && (
                                        <Tooltip title={revisionLeft === 0 ? "No revisions left" : `Client can still request ${revisionLeft}`}>
                                            <Chip size="small" color={revisionLeft > 0 ? "default" : "error"} label={`Revisions left: ${revisionLeft}`} />
                                        </Tooltip>
                                    )}
                                </Stack>
                            </FormGroup>

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>Actions</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {order.status === "delivered" && canRequestRevision && (
                                    <Button
                                        variant="outlined"
                                        onClick={async () => {
                                            const o = await api.markRevisionRequested(order.id);
                                            onUpdate(o);
                                        }}
                                    >
                                        Mark: Revision Requested
                                    </Button>
                                )}
                                {order.status === "revision_requested" && (
                                    <Button
                                        variant="outlined"
                                        onClick={async () => {
                                            const o = await api.markInProgress(order.id);
                                            onUpdate(o);
                                        }}
                                    >
                                        Mark: In Progress
                                    </Button>
                                )}
                                {order.status === "delivered" && (
                                    <Tooltip title="When client accepts, payment moves from pending to available.">
                                        <Button
                                            variant="outlined"
                                            onClick={async () => {
                                                const o = await api.markCompleted(order.id);
                                                onUpdate(o);
                                            }}
                                        >
                                            Mark: Completed (client approved)
                                        </Button>
                                    </Tooltip>
                                )}
                                {order.status !== "disputed" && (
                                    <Button
                                        color="error"
                                        startIcon={<WarningIcon />}
                                        onClick={async () => {
                                            const o = await api.openDispute(order.id, "Work not per requirements");
                                            onUpdate(o);
                                        }}
                                    >
                                        Open Dispute
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

// ---------------------------------------------------------
// 6) Earnings & Wallet
// ---------------------------------------------------------
function EarningsWallet({ wallet }: { wallet: Wallet }) {
    return (
        <Grid container spacing={3}>
            <Grid component="div" xs={12} md={4}>
                <Card>
                    <CardHeader avatar={<WalletIcon />} title="Wallet" subheader="Available vs Pending" />
                    <CardContent>
                        <Typography variant="h4">{fmtMoney(wallet.available, wallet.currency)}</Typography>
                        <Typography color="text.secondary">Available balance</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6">{fmtMoney(wallet.pending, wallet.currency)}</Typography>
                        <Typography color="text.secondary">Pending (clearing period)</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2">On-time delivery rate</Typography>
                        <LinearProgress variant="determinate" value={wallet.onTimeRate * 100} />
                    </CardContent>
                </Card>
            </Grid>
            <Grid component="div" xs={12} md={8}>
                <Card>
                    <CardHeader avatar={<MoneyIcon />} title="Transactions" subheader="All movements" />
                    <CardContent>
                        <List dense>
                            {wallet.transactions.map((t) => (
                                <ListItem key={t.id}>
                                    <ListItemIcon><MoneyIcon /></ListItemIcon>
                                    <ListItemText
                                        primary={`${t.type.replaceAll("_", " ")} — ${fmtMoney(t.amount, wallet.currency)}`}
                                        secondary={`${new Date(t.at).toLocaleString()}${t.note ? " • " + t.note : ""}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------
// 7) Payouts / Banking (KYC + Withdrawals)
// ---------------------------------------------------------
function PayoutsBanking({
    payout,
    wallet,
    onSubmitKYC,
    onSetMethod,
    onWithdraw
}: {
    payout: PayoutProfile;
    wallet: Wallet;
    onSubmitKYC: () => Promise<void>;
    onSetMethod: (m: { type: "bank" | "paypal"; label: string; detailsMasked: string }) => Promise<void>;
    onWithdraw: (amount: number) => Promise<void>;
}) {
    const [amount, setAmount] = useState<number>(0);
    const [methodType, setMethodType] = useState<"bank" | "paypal">(payout.method?.type || "bank");
    const [methodLabel, setMethodLabel] = useState<string>(payout.method?.label || "");
    const [methodDetails, setMethodDetails] = useState<string>(payout.method?.detailsMasked || "");

    return (
        <Grid container spacing={3}>
            <Grid component="div" xs={12} md={6}>
                <Card>
                    <CardHeader avatar={<KycIcon />} title="KYC / Identity Verification" />
                    <CardContent>
                        <Stack spacing={1}>
                            <Typography>Status: <b>{payout.kycStatus}</b></Typography>
                            {payout.kycStatus === "not_started" && (
                                <Button variant="contained" startIcon={<KycIcon />} onClick={onSubmitKYC}>Start KYC</Button>
                            )}
                            {payout.kycStatus === "pending" && (
                                <Typography color="text.secondary">Your KYC is being reviewed.</Typography>
                            )}
                            {payout.kycStatus === "verified" && (
                                <Chip color="success" label="Verified" />
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                <Card sx={{ mt: 2 }}>
                    <CardHeader avatar={<BankIcon />} title="Payout Method" />
                    <CardContent>
                        <Stack spacing={2}>
                            <FormControl>
                                <RadioGroup row value={methodType} onChange={(e) => setMethodType(e.target.value as any)}>
                                    <FormControlLabel value="bank" control={<Radio />} label="Bank Transfer" />
                                    <FormControlLabel value="paypal" control={<Radio />} label="PayPal" />
                                </RadioGroup>
                                <FormHelperText>Select where your withdrawals will be sent.</FormHelperText>
                            </FormControl>
                            <TextField label="Label (e.g., VakıfBank - TRY)" value={methodLabel} onChange={(e) => setMethodLabel(e.target.value)} />
                            <TextField label={methodType === "bank" ? "IBAN (masked)" : "PayPal email (masked)"} value={methodDetails} onChange={(e) => setMethodDetails(e.target.value)} />
                            <Button
                                variant="outlined"
                                onClick={() => onSetMethod({ type: methodType, label: methodLabel || "My Payout", detailsMasked: methodDetails || "••••" })}
                            >
                                Save Method
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid component="div" xs={12} md={6}>
                <Card>
                    <CardHeader avatar={<WalletIcon />} title="Withdraw" />
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Available: <b>{fmtMoney(wallet.available, wallet.currency)}</b>
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                type="number"
                                label="Amount"
                                value={amount}
                                InputProps={{ endAdornment: <InputAdornment position="end">{wallet.currency}</InputAdornment> }}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <Button
                                variant="contained"
                                disabled={amount <= 0 || amount > wallet.available || payout.kycStatus !== "verified" || !payout.method}
                                onClick={() => onWithdraw(amount)}
                            >
                                Request Withdrawal
                            </Button>
                        </Stack>
                        {payout.kycStatus !== "verified" && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                                You must complete KYC before withdrawing.
                            </Typography>
                        )}
                        {!payout.method && (
                            <Typography variant="caption" color="error" sx={{ display: "block" }}>
                                Add a payout method to proceed.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------
// 8) Seller Profile (private)
// ---------------------------------------------------------
function SellerProfileView({
    profile,
    onSave
}: {
    profile: SellerProfile;
    onSave: (changes: Partial<SellerProfile>) => Promise<void>;
}) {
    const [local, setLocal] = useState<SellerProfile>(profile);

    const update = (patch: Partial<SellerProfile>) => setLocal((p) => ({ ...p, ...patch }));

    return (
        <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
                <TextField label="Display Name" value={local.displayName} onChange={(e) => update({ displayName: e.target.value })} />
                <TextField label="Bio" value={local.bio} onChange={(e) => update({ bio: e.target.value })} minRows={4} multiline />
                <TextField
                    label="Languages (code:level, comma-separated)"
                    helperText="Example: en:Fluent, tr:Native, fr:Basic"
                    value={local.languages.map((l) => `${l.code}:${l.level}`).join(", ")}
                    onChange={(e) =>
                        update({
                            languages: e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean)
                                .map((pair) => {
                                    const [code, level] = pair.split(":").map((t) => t.trim());
                                    return { code, level: (level as any) || "Basic" };
                                })
                        })
                    }
                />
                <TextField
                    label="Skills (comma-separated)"
                    value={local.skills.join(", ")}
                    onChange={(e) => update({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
                <FormControlLabel
                    control={<Switch checked={local.vacationMode} onChange={(e) => update({ vacationMode: e.target.checked })} />}
                    label="Vacation mode"
                />
                {local.vacationMode && (
                    <TextField label="Vacation note" value={local.vacationNote || ""} onChange={(e) => update({ vacationNote: e.target.value })} />
                )}
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={() => onSave(local)}>Save</Button>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setLocal(profile)}>Reset</Button>
                </Stack>
            </Stack>
        </Paper>
    );
}

// ---------------------------------------------------------
// 9) Portfolio Manager (optional)
// ---------------------------------------------------------
function PortfolioManager({
    items,
    onAdd,
    onDelete,
    onReorder
}: {
    items: PortfolioItem[];
    onAdd: (file: File) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onReorder: (orderedIds: string[]) => Promise<void>;
}) {
    const [ordering, setOrdering] = useState<string[]>(items.sort((a, b) => a.order - b.order).map((i) => i.id));
    const [uploading, setUploading] = useState(false);

    useEffect(() => setOrdering(items.sort((a, b) => a.order - b.order).map((i) => i.id)), [items]);

    const move = (id: string, dir: -1 | 1) => {
        setOrdering((prev) => {
            const idx = prev.indexOf(id);
            const j = idx + dir;
            if (idx < 0 || j < 0 || j >= prev.length) return prev;
            const copy = [...prev];
            [copy[idx], copy[j]] = [copy[j], copy[idx]];
            return copy;
        });
    };

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadIcon />}
                    >
                        Upload Portfolio Item
                        <input
                            type="file"
                            hidden
                            accept="image/*,video/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                await onAdd(file);
                                setUploading(false);
                            }}
                        />
                    </Button>
                    {uploading && <CircularProgress size={20} />}
                    <Button
                        variant="contained"
                        onClick={() => onReorder(ordering)}
                        startIcon={<SaveIcon />}
                        disabled={ordering.join(",") === items.sort((a, b) => a.order - b.order).map((i) => i.id).join(",")}
                    >
                        Save Order
                    </Button>
                </Stack>
            </Paper>

            <Grid container spacing={2}>
                {ordering.map((id) => {
                    const it = items.find((x) => x.id === id)!;
                    return (
                        <Grid component="div" xs={12} sm={6} md={4} key={id}>
                            <Card variant="outlined">
                                <CardHeader
                                    avatar={<Avatar>{it.type === "image" ? <ImageIcon /> : "V"}</Avatar>}
                                    title={it.title}
                                    subheader={`#${it.order}`}
                                    action={
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" onClick={() => move(id, -1)}>Up</Button>
                                            <Button size="small" onClick={() => move(id, +1)}>Down</Button>
                                        </Stack>
                                    }
                                />
                                {it.type === "image" ? (
                                    <Box component="img" src={it.thumbnailUrl || it.url} alt="" sx={{ width: "100%", height: 180, objectFit: "cover" }} />
                                ) : (
                                    <Box sx={{ p: 2 }}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                                            <Typography variant="caption">Video: {it.url}</Typography>
                                        </Paper>
                                    </Box>
                                )}
                                <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
                                    <Button size="small" component="a" href={it.url} target="_blank">Open</Button>
                                    <Box flex={1} />
                                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(id)}>Delete</Button>
                                </Stack>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}

// ---------------------------------------------------------
// MOCK API (replace with real endpoints)
// ---------------------------------------------------------
const api = {
    // Editor draft lives in-memory for demo
    editorDraft: {
        title: "",
        description: "",
        category: "",
        subcategory: "",
        tags: [] as string[],
        packages: [] as PackageTier[],
        mediaUrls: [] as string[]
    },
    resetEditorDraft() {
        this.editorDraft = { title: "", description: "", category: "", subcategory: "", tags: [], packages: [], mediaUrls: [] };
    },
    async setEditorDraftFromService(id: string) {
        const s = (await this.listServices()).find((x) => x.id === id);
        if (!s) return;
        this.editorDraft = {
            title: s.title,
            description: s.description,
            category: s.category,
            subcategory: s.subcategory || "",
            tags: s.tags,
            packages: s.packages,
            mediaUrls: s.mediaUrls
        };
    },

    async listServices(): Promise<Service[]> {
        await delay(300);
        return demo.services;
    },
    async duplicateService(id: string): Promise<Service> {
        await delay(200);
        const original = demo.services.find((s) => s.id === id)!;
        const copy: Service = {
            ...original,
            id: `svc_${Math.random().toString(36).slice(2, 9)}`,
            title: original.title + " (Copy)",
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        demo.services = [copy, ...demo.services];
        return copy;
    },
    async toggleServiceStatus(id: string): Promise<Service> {
        await delay(150);
        const idx = demo.services.findIndex((s) => s.id === id);
        const s = demo.services[idx];
        s.status = s.status === "active" ? "paused" : "active";
        s.updatedAt = new Date().toISOString();
        return s;
    },
    async deleteService(id: string) {
        await delay(150);
        demo.services = demo.services.filter((s) => s.id !== id);
    },
    async upsertServiceDraft(
        payload: Pick<Service, "title" | "description" | "category" | "subcategory" | "tags" | "packages" | "mediaUrls">,
        publish: boolean
    ): Promise<Service> {
        await delay(400);
        // create new if title not found; simplistic logic
        const existing = demo.services.find((s) => s.title === payload.title);
        if (existing) {
            Object.assign(existing, payload);
            existing.status = publish ? "active" : "draft";
            existing.updatedAt = new Date().toISOString();
            return existing;
        }
        const created: Service = {
            id: `svc_${Math.random().toString(36).slice(2, 9)}`,
            title: payload.title,
            description: payload.description,
            category: payload.category,
            subcategory: payload.subcategory,
            tags: payload.tags,
            status: publish ? "active" : "draft",
            coverUrl: payload.mediaUrls[0],
            mediaUrls: payload.mediaUrls,
            packages: payload.packages,
            rating: undefined,
            totalReviews: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        demo.services = [created, ...demo.services];
        return created;
    },

    async listOrders(): Promise<Order[]> {
        await delay(300);
        return demo.orders;
    },
    async acceptOrder(id: string): Promise<Order> {
        await delay(150);
        const o = demo.orders.find((x) => x.id === id)!;
        o.status = "in_progress";
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Seller accepted the order.", at: new Date().toISOString() });
        return o;
    },
    async rejectOrder(id: string): Promise<Order> {
        await delay(150);
        const o = demo.orders.find((x) => x.id === id)!;
        o.status = "cancelled";
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Seller rejected the order.", at: new Date().toISOString() });
        return o;
    },
    async postMessage(orderId: string, body: string): Promise<Order> {
        await delay(120);
        const o = demo.orders.find((x) => x.id === orderId)!;
        o.thread.push({ id: `m_${Date.now()}`, author: "seller", body, at: new Date().toISOString() });
        return o;
    },
    async uploadDelivery(orderId: string, payload: { message?: string; files: { name: string; url?: string }[] }): Promise<Order> {
        await delay(350);
        const o = demo.orders.find((x) => x.id === orderId)!;
        o.deliveries.push({ id: `d_${Date.now()}`, at: new Date().toISOString(), message: payload.message, files: payload.files });
        o.status = "delivered";
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Seller uploaded a delivery.", at: new Date().toISOString() });
        return o;
    },
    async markRevisionRequested(orderId: string): Promise<Order> {
        await delay(150);
        const o = demo.orders.find((x) => x.id === orderId)!;
        if (o.usedRevisions < o.allowedRevisions) {
            o.usedRevisions += 1;
            o.status = "revision_requested";
            o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Buyer requested a revision.", at: new Date().toISOString() });
        }
        return o;
    },
    async markInProgress(orderId: string): Promise<Order> {
        await delay(120);
        const o = demo.orders.find((x) => x.id === orderId)!;
        o.status = "in_progress";
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Order marked In Progress.", at: new Date().toISOString() });
        return o;
    },
    async markCompleted(orderId: string): Promise<Order> {
        await delay(150);
        const o = demo.orders.find((x) => x.id === orderId)!;
        o.status = "completed";
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Order marked Completed. Payment released.", at: new Date().toISOString() });
        // Move pending to available in wallet demo
        const income = o.price * 0.8; // after fee (example)
        demo.wallet.available += income;
        demo.wallet.pending = Math.max(0, demo.wallet.pending - income);
        demo.wallet.transactions.unshift({
            id: `tx_${Date.now()}`,
            type: "order_income",
            amount: income,
            at: new Date().toISOString(),
            note: `Order ${o.id} released`
        });
        return o;
    },
    async openDispute(orderId: string, reason: string): Promise<Order> {
        await delay(180);
        const o = demo.orders.find((x) => x.id === orderId)!;
        o.status = "disputed";
        o.dispute = { openedAt: new Date().toISOString(), reason, status: "open" };
        o.thread.push({ id: `m_${Date.now()}`, author: "system", body: "Dispute opened by seller.", at: new Date().toISOString() });
        return o;
    },

    async getWallet(): Promise<Wallet> {
        await delay(200);
        return demo.wallet;
    },

    async getPayoutProfile(): Promise<PayoutProfile> {
        await delay(200);
        return demo.payout;
    },
    async submitKYC(): Promise<PayoutProfile> {
        await delay(500);
        demo.payout.kycStatus = "verified";
        return demo.payout;
    },
    async setPayoutMethod(method: NonNullable<PayoutProfile["method"]>): Promise<PayoutProfile> {
        await delay(200);
        demo.payout.method = method;
        return demo.payout;
    },
    async requestWithdrawal(amount: number): Promise<PayoutProfile> {
        await delay(400);
        if (amount > demo.wallet.available) throw new Error("Insufficient funds");
        demo.wallet.available -= amount;
        demo.wallet.transactions.unshift({
            id: `tx_${Date.now()}`,
            type: "withdrawal",
            amount: -amount,
            at: new Date().toISOString()
        });
        return demo.payout;
    },

    async getSellerProfile(): Promise<SellerProfile> {
        await delay(150);
        return demo.profile;
    },
    async updateSellerProfile(changes: Partial<SellerProfile>): Promise<SellerProfile> {
        await delay(200);
        demo.profile = { ...demo.profile, ...changes };
        return demo.profile;
    },

    async getPortfolio(): Promise<PortfolioItem[]> {
        await delay(150);
        return demo.portfolio.sort((a, b) => a.order - b.order);
    },
    async addPortfolioItem(file: File): Promise<PortfolioItem> {
        await delay(400);
        const id = `pf_${Math.random().toString(36).slice(2, 8)}`;
        const count = demo.portfolio.length;
        const url = URL.createObjectURL(file);
        const item: PortfolioItem = { id, title: file.name, type: file.type.startsWith("image/") ? "image" : "video", url, order: count + 1 };
        demo.portfolio.push(item);
        return item;
    },
    async deletePortfolioItem(id: string): Promise<void> {
        await delay(120);
        demo.portfolio = demo.portfolio.filter((x) => x.id !== id);
        // reindex order
        demo.portfolio = demo.portfolio.map((x, i) => ({ ...x, order: i + 1 }));
    },
    async reorderPortfolio(orderedIds: string[]): Promise<PortfolioItem[]> {
        await delay(150);
        const map = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
        demo.portfolio = demo.portfolio.map((x) => ({ ...x, order: map.get(x.id) || x.order }));
        return demo.portfolio.sort((a, b) => a.order - b.order);
    }
};

function delay(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

// ---------------------------------------------------------
// DEMO DATA (seed)
// ---------------------------------------------------------
const now = Date.now();
let demo: {
    services: Service[];
    orders: Order[];
    wallet: Wallet;
    payout: PayoutProfile;
    profile: SellerProfile;
    portfolio: PortfolioItem[];
} = {
    services: [
        {
            id: "svc_alpha",
            title: "Design a modern responsive landing page",
            description: "I will design a pixel-perfect, responsive landing page with Figma + handoff.\nIncludes basic motion and dark/light support.",
            category: "Design",
            subcategory: "UI/UX",
            tags: ["figma", "landing", "responsive"],
            status: "active",
            coverUrl: "https://images.unsplash.com/photo-1559027615-5ee22a6b95c0?q=80&w=1200&auto=format&fit=crop",
            mediaUrls: [
                "https://images.unsplash.com/photo-1559027615-5ee22a6b95c0?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1200&auto=format&fit=crop"
            ],
            packages: [
                { name: "Basic", price: 49, deliveryDays: 3, revisions: 1, features: ["1 section", "Wireframe"] },
                { name: "Standard", price: 129, deliveryDays: 5, revisions: 2, features: ["3 sections", "Visual design"] },
                { name: "Premium", price: 299, deliveryDays: 7, revisions: 3, features: ["5 sections", "Design system snippet"] }
            ],
            rating: 4.9,
            totalReviews: 82,
            createdAt: new Date(now - 86400000 * 40).toISOString(),
            updatedAt: new Date(now - 86400000 * 2).toISOString()
        },
        {
            id: "svc_beta",
            title: "Develop a secure REST API with Node.js",
            description: "Production-ready REST API with authentication, validation, and tests.",
            category: "Programming",
            subcategory: "Web Back-end",
            tags: ["node", "express", "jwt"],
            status: "paused",
            mediaUrls: [],
            packages: [
                { name: "Basic", price: 99, deliveryDays: 4, revisions: 1, features: ["CRUD endpoints"] },
                { name: "Standard", price: 249, deliveryDays: 7, revisions: 2, features: ["Auth + Docs"] }
            ],
            createdAt: new Date(now - 86400000 * 22).toISOString(),
            updatedAt: new Date(now - 86400000 * 10).toISOString()
        }
    ],
    orders: [
        {
            id: "ord_1001",
            serviceId: "svc_alpha",
            serviceTitle: "Design a modern responsive landing page",
            buyerName: "Alice",
            submittedAt: new Date(now - 86400000 * 2).toISOString(),
            dueAt: new Date(now + 86400000 * 0.5).toISOString(),
            price: 129,
            currency: "USD",
            status: "in_progress",
            requirements: "Target audience: fintech founders.\nBrand: teal + purple.\nDeliver Figma link + export hero visuals.",
            allowedRevisions: 2,
            usedRevisions: 1,
            thread: [
                { id: "m1", author: "buyer", body: "Can we add pricing table?", at: new Date(now - 86400000).toISOString() },
                { id: "m2", author: "seller", body: "Yes, I can include it in Standard/Premium.", at: new Date(now - 86400000 + 3600000).toISOString() }
            ],
            deliveries: []
        },
        {
            id: "ord_1002",
            serviceId: "svc_alpha",
            serviceTitle: "Design a modern responsive landing page",
            buyerName: "Bob",
            submittedAt: new Date(now - 86400000 * 5).toISOString(),
            dueAt: new Date(now - 3600000).toISOString(), // overdue
            price: 299,
            currency: "USD",
            status: "delivered",
            requirements: "Brand: eco-friendly.\nDeliver Figma file and 2 PNGs.",
            allowedRevisions: 2,
            usedRevisions: 0,
            thread: [{ id: "m3", author: "seller", body: "First delivery uploaded.", at: new Date(now - 7200000).toISOString() }],
            deliveries: [{ id: "d1", at: new Date(now - 7200000).toISOString(), files: [{ name: "landing.fig" }, { name: "hero.png" }], message: "Initial handoff" }]
        },
        {
            id: "ord_1003",
            serviceId: "svc_beta",
            serviceTitle: "Develop a secure REST API with Node.js",
            buyerName: "Charlie",
            submittedAt: new Date(now - 86400000 * 1).toISOString(),
            dueAt: new Date(now + 86400000 * 3).toISOString(),
            price: 249,
            currency: "USD",
            status: "submitted",
            requirements: "JWT auth, rate limiting, Swagger docs.",
            allowedRevisions: 1,
            usedRevisions: 0,
            thread: [],
            deliveries: []
        }
    ],
    wallet: {
        available: 420,
        pending: 258,
        currency: "USD",
        onTimeRate: 0.92,
        transactions: [
            { id: "t1", type: "order_income", amount: 129, at: new Date(now - 86400000 * 3).toISOString(), note: "Order ord_0950" },
            { id: "t2", type: "withdrawal", amount: -300, at: new Date(now - 86400000 * 7).toISOString() },
            { id: "t3", type: "fee", amount: -6, at: new Date(now - 86400000 * 7).toISOString(), note: "Withdrawal fee" }
        ]
    },
    payout: {
        kycStatus: "not_started",
        method: undefined
    },
    profile: {
        displayName: "Enes Y.",
        bio: "UI/UX and full-stack dev. I help startups ship fast.",
        languages: [{ code: "en", level: "Fluent" }, { code: "tr", level: "Native" }],
        skills: ["figma", "react", "node", "tailwind"],
        vacationMode: false
    },
    portfolio: [
        { id: "pf_1", title: "Hero Shot", type: "image", url: "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1200&auto=format&fit=crop", order: 1 },
        { id: "pf_2", title: "Dashboard Concept", type: "image", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop", order: 2 }
    ]
};
