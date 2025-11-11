// AdminWorkspace.tsx
// Admin panel for a freelance marketplace (TypeScript + MUI).
// Tabs: Dashboard, Disputes, Users, Services, Transactions, Analytics.
// NOTE: Uses a mock in-memory API at bottom. Replace with real endpoints later.

import {
    Shield as AdminIcon,
    Assessment as AnalyticsIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Gavel as GavelIcon,
    Refresh as RefreshIcon,
    PlaylistAdd as RelistIcon,
    Report as ReportIcon,
    Handshake as ResolveIcon,
    Search as SearchIcon,
    Storefront as ServiceIcon,
    Block as SuspendIcon,
    AutoAwesome as TrendIcon,
    PlaylistRemove as UnlistIcon,
    SupervisedUserCircle as UsersIcon,
    Warning as WarningIcon
} from "@mui/icons-material";
import {
    AppBar, Avatar, Badge, Box, Button, Card, CardContent, CardHeader, Chip,
    Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
    FormControl,
    IconButton,
    InputAdornment, InputLabel, LinearProgress, List, ListItem, ListItemText,
    MenuItem,
    Grid as MuiGrid,
    Paper, Select, Snackbar, Stack, Tab,
    Table,
    TableBody,
    TableCell,
    TableHead, TableRow,
    Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

// Workaround: some MUI Grid type definitions conflict with our TypeScript setup here.
// Create a local any-typed alias so JSX usages of <Grid .../> compile cleanly.
const Grid: any = MuiGrid;

// -----------------------------
// Types
// -----------------------------
type Currency = "USD" | "EUR" | "TRY";

type AdminStats = {
    salesVolume: number;
    ordersCount: number;
    openDisputes: number;
    refunds: number;
    trend7dPct: number;
    currency: Currency;
};

type DisputeStatus = "open" | "reviewing" | "resolved_refund" | "resolved_release";
type DisputeCategory = "quality" | "delivery_late" | "communication" | "other";

type Message = { id: string; author: "buyer" | "seller" | "system"; body: string; at: string; };

type Dispute = {
    id: string;
    orderId: string;
    buyer: string;
    seller: string;
    serviceTitle: string;
    openedAt: string;
    status: DisputeStatus;
    category: DisputeCategory;
    amount: number;
    currency: Currency;
    ageDays: number;
    thread: Message[];
    deliveries: { name: string; url?: string }[];
    evidence: { by: "buyer" | "seller"; note: string; url?: string }[];
    assignment?: string; // admin username/id
    resolutionNote?: string;
};

type Role = "user" | "seller" | "admin";
type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: "active" | "suspended";
    createdAt: string;
};

type ServiceModerationStatus = "pending" | "reported" | "approved" | "unlisted";
type ServiceModerationItem = {
    id: string;
    title: string;
    seller: string;
    category: string;
    status: ServiceModerationStatus;
    reports?: number;
    submittedAt: string;
};

type TxType = "payment" | "payout" | "refund" | "fee" | "adjustment";
type Transaction = {
    id: string;
    type: TxType;
    amount: number;
    currency: Currency;
    at: string;
    orderId?: string;
    user?: string;
    note?: string;
};

type TopFreelancer = { seller: string; totalSales: number; rating: number; };
type CategoryTrend = { category: string; volume: number; avgPrice: number; };

type AnalyticsData = {
    topFreelancers: TopFreelancer[];
    popularCategories: CategoryTrend[];
    pricingTrends: { date: string; avgPrice: number }[];
    disputeRates: { date: string; rate: number }[];
    satisfaction: { date: string; score: number }[];
};

// -----------------------------
// Utils
// -----------------------------
function fmtMoney(amount: number, ccy: Currency) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(amount);
}
function downloadCSV(filename: string, rows: any[]) {
    const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// -----------------------------
// Root Workspace
// -----------------------------
export default function AdminWorkspace() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [services, setServices] = useState<ServiceModerationItem[]>([]);
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [snack, setSnack] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const [s, dq, us, sv, t, a] = await Promise.all([
                api.getAdminStats(),
                api.listDisputes(),
                api.listUsers(),
                api.listServicesForModeration(),
                api.listTransactions(),
                api.getAnalytics()
            ]);
            setStats(s);
            setDisputes(dq);
            setUsers(us);
            setServices(sv);
            setTxs(t);
            setAnalytics(a);
            setLoading(false);
        })();
    }, []);

    return (
        <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
            <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Container maxWidth="lg" sx={{ py: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <AdminIcon />
                            <Typography variant="h6" fontWeight={700}>Admin Workspace</Typography>
                            {stats && (
                                <>
                                    <Chip size="small" color="primary" label={`Sales: ${fmtMoney(stats.salesVolume, stats.currency)}`} />
                                    <Chip size="small" label={`Orders: ${stats.ordersCount}`} />
                                    <Chip size="small" color={stats.openDisputes > 0 ? "warning" : "default"} icon={<WarningIcon />} label={`${stats.openDisputes} disputes`} />
                                </>
                            )}
                        </Stack>
                        <Avatar>AD</Avatar>
                    </Stack>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1 }} variant="scrollable" scrollButtons="auto">
                        <Tab label="Dashboard" />
                        <Tab label="Disputes" icon={<Badge color="warning" badgeContent={stats?.openDisputes || null}><span /></Badge>} iconPosition="end" />
                        <Tab label="Users" />
                        <Tab label="Services" />
                        <Tab label="Transactions" />
                        <Tab label="Analytics & Reports" />
                    </Tabs>
                </Container>
            </AppBar>

            {loading && <LinearProgress />}

            {!loading && (
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    {tab === 0 && stats && <AdminDashboard stats={stats} onRefresh={async () => {
                        setLoading(true);
                        setStats(await api.getAdminStats());
                        setLoading(false);
                        setSnack("Dashboard refreshed.");
                    }} />}
                    {tab === 1 && (
                        <DisputesQueue
                            disputes={disputes}
                            onRefresh={async () => {
                                setDisputes(await api.listDisputes());
                            }}
                            onAssign={async (id, who) => {
                                const d = await api.assignDispute(id, who);
                                setDisputes(prev => prev.map(x => x.id === id ? d : x));
                            }}
                            onResolve={async (id, action, note, amount) => {
                                const d = await api.resolveDispute(id, action, note, amount);
                                setDisputes(prev => prev.map(x => x.id === id ? d : x));
                            }}
                        />
                    )}
                    {tab === 2 && (
                        <UsersManagement
                            users={users}
                            onRefresh={async () => setUsers(await api.listUsers())}
                            onToggleSuspend={async (id) => {
                                const u = await api.toggleUserSuspend(id);
                                setUsers(prev => prev.map(x => x.id === id ? u : x));
                            }}
                            onRoleChange={async (id, role) => {
                                const u = await api.changeUserRole(id, role);
                                setUsers(prev => prev.map(x => x.id === id ? u : x));
                            }}
                        />
                    )}
                    {tab === 3 && (
                        <ServicesModeration
                            items={services}
                            onRefresh={async () => setServices(await api.listServicesForModeration())}
                            onApprove={async (id) => {
                                const it = await api.approveService(id);
                                setServices(prev => prev.map(x => x.id === id ? it : x));
                            }}
                            onRequestEdits={async (id) => {
                                const it = await api.requestServiceEdits(id);
                                setServices(prev => prev.map(x => x.id === id ? it : x));
                            }}
                            onUnlist={async (id) => {
                                const it = await api.unlistService(id);
                                setServices(prev => prev.map(x => x.id === id ? it : x));
                            }}
                            onRelist={async (id) => {
                                const it = await api.relistService(id);
                                setServices(prev => prev.map(x => x.id === id ? it : x));
                            }}
                        />
                    )}
                    {tab === 4 && (
                        <TransactionsLedgers
                            txs={txs}
                            onRefresh={async () => setTxs(await api.listTransactions())}
                            onExport={() => downloadCSV("transactions.csv", txs)}
                        />
                    )}
                    {tab === 5 && analytics && (
                        <AnalyticsReports
                            data={analytics}
                            onRefresh={async () => setAnalytics(await api.getAnalytics())}
                            onExport={() => downloadCSV("analytics_top_freelancers.csv", analytics.topFreelancers)}
                        />
                    )}
                </Container>
            )}

            <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack} />
        </Box>
    );
}

// -----------------------------
// 1) Admin Dashboard
// -----------------------------
function AdminDashboard({ stats, onRefresh }: { stats: AdminStats; onRefresh: () => Promise<void> }) {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
                <Card><CardHeader title="Sales Volume" /><CardContent>
                    <Typography variant="h4">{fmtMoney(stats.salesVolume, stats.currency)}</Typography>
                    <Typography color="text.secondary">Total gross</Typography>
                </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card><CardHeader title="Orders" /><CardContent>
                    <Typography variant="h4">{stats.ordersCount}</Typography>
                    <Typography color="text.secondary">Total orders</Typography>
                </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card><CardHeader title="Open Disputes" /><CardContent>
                    <Typography variant="h4">{stats.openDisputes}</Typography>
                    <Typography color="text.secondary">Awaiting resolution</Typography>
                </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card><CardHeader title="Refunds (total)" /><CardContent>
                    <Typography variant="h4">{fmtMoney(stats.refunds, stats.currency)}</Typography>
                    <Typography color="text.secondary">Processed refunds</Typography>
                </CardContent></Card>
            </Grid>

            <Grid item xs={12}>
                <Card>
                    <CardHeader
                        avatar={<TrendIcon />}
                        title="Trend (7d)"
                        action={<Tooltip title="Refresh"><IconButton onClick={onRefresh}><RefreshIcon /></IconButton></Tooltip>}
                    />
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Chip color={stats.trend7dPct >= 0 ? "success" : "error"} label={`${stats.trend7dPct > 0 ? "+" : ""}${stats.trend7dPct.toFixed(2)}%`} />
                            <Typography variant="body2" color="text.secondary">Sales trajectory over the last 7 days</Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}

// -----------------------------
// 2) Disputes Queue + Detail
// -----------------------------
function DisputesQueue({
    disputes, onRefresh, onAssign, onResolve
}: {
    disputes: Dispute[];
    onRefresh: () => Promise<void>;
    onAssign: (id: string, who: string) => Promise<void>;
    onResolve: (id: string, action: "refund" | "release", note: string, amount?: number) => Promise<void>;
}) {
    const [status, setStatus] = useState<"all" | DisputeStatus>("all");
    const [category, setCategory] = useState<"all" | DisputeCategory>("all");
    const [age, setAge] = useState<"all" | "lt3" | "lt7" | "gte7">("all");
    const [selected, setSelected] = useState<Dispute | null>(null);
    const [assignee, setAssignee] = useState("admin_1");

    const filtered = useMemo(() => {
        return disputes.filter(d => {
            if (status !== "all" && d.status !== status) return false;
            if (category !== "all" && d.category !== category) return false;
            if (age === "lt3" && d.ageDays >= 3) return false;
            if (age === "lt7" && d.ageDays >= 7) return false;
            if (age === "gte7" && d.ageDays < 7) return false;
            return true;
        });
    }, [disputes, status, category, age]);

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            {["open", "reviewing", "resolved_refund", "resolved_release"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Category</InputLabel>
                        <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            {["quality", "delivery_late", "communication", "other"].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Age</InputLabel>
                        <Select value={age} label="Age" onChange={(e) => setAge(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="lt3">&lt; 3 days</MenuItem>
                            <MenuItem value="lt7">&lt; 7 days</MenuItem>
                            <MenuItem value="gte7">≥ 7 days</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
                    <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
                </Stack>
            </Stack>

            <Grid container spacing={2}>
                {filtered.map(d => (
                    <Grid item xs={12} md={6} key={d.id}>
                        <Card variant="outlined">
                            <CardHeader
                                avatar={<Avatar><GavelIcon /></Avatar>}
                                title={`Dispute ${d.id} — ${d.serviceTitle}`}
                                subheader={`Buyer: ${d.buyer} • Seller: ${d.seller}`}
                                action={
                                    <Chip size="small" color={d.status === "open" ? "warning" : d.status.startsWith("resolved") ? "success" : "default"} label={d.status} />
                                }
                            />
                            <CardContent>
                                <Stack spacing={1}>
                                    <Typography variant="body2">Category: {d.category} • Age: {d.ageDays} day(s)</Typography>
                                    <Typography variant="body2">Amount: {fmtMoney(d.amount, d.currency)}</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="outlined" onClick={() => setSelected(d)}>Open</Button>
                                        <Button size="small" onClick={() => onAssign(d.id, assignee)}>Assign</Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {filtered.length === 0 && (
                    <Grid item xs={12}><Paper sx={{ p: 4, textAlign: "center" }}><Typography>No disputes match the filter.</Typography></Paper></Grid>
                )}
            </Grid>

            <DisputeDetail
                dispute={selected}
                open={!!selected}
                onClose={() => setSelected(null)}
                onResolve={async (action, note, amount) => {
                    if (!selected) return;
                    await onResolve(selected.id, action, note, amount);
                    const updated = await api.getDispute(selected.id);
                    setSelected(updated);
                }}
            />
        </Box>
    );
}

function DisputeDetail({
    dispute, open, onClose, onResolve
}: {
    dispute: Dispute | null;
    open: boolean;
    onClose: () => void;
    onResolve: (action: "refund" | "release", note: string, amount?: number) => Promise<void>;
}) {
    const [note, setNote] = useState("");
    const [amount, setAmount] = useState<number | undefined>(undefined);

    useEffect(() => { setNote(""); setAmount(undefined); }, [dispute]);

    if (!dispute) return null;
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Dispute {dispute.id}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Order</Typography>
                            <Typography>Order ID: {dispute.orderId}</Typography>
                            <Typography>Service: {dispute.serviceTitle}</Typography>
                            <Typography>Buyer: {dispute.buyer} • Seller: {dispute.seller}</Typography>
                            <Typography>Status: <b>{dispute.status}</b> • Category: {dispute.category} • Opened: {new Date(dispute.openedAt).toLocaleString()}</Typography>
                            <Typography>Amount: {fmtMoney(dispute.amount, dispute.currency)}</Typography>
                        </Paper>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2">Chat History</Typography>
                            <List dense sx={{ maxHeight: 260, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1, mt: 1 }}>
                                {dispute.thread.map(m => (
                                    <ListItem key={m.id}>
                                        <ListItemText primary={`${m.author} • ${new Date(m.at).toLocaleString()}`} secondary={m.body} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2">Deliveries/Evidence</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Deliveries:</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                {dispute.deliveries.map((f, i) => <Chip key={i} icon={<ReportIcon />} label={f.name} component="a" href={f.url || "#"} clickable />)}
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2" color="text.secondary">Evidence:</Typography>
                            <List dense>
                                {dispute.evidence.map((e, i) => (
                                    <ListItem key={i}>
                                        <ListItemText primary={`${e.by}: ${e.note}`} secondary={e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a> : undefined} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Resolution</Typography>
                            <TextField
                                label="Resolution note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                multiline minRows={3} fullWidth
                            />
                            <TextField
                                sx={{ mt: 1 }}
                                label="Refund amount (optional)"
                                type="number"
                                value={amount ?? ""}
                                InputProps={{ endAdornment: <InputAdornment position="end">{dispute.currency}</InputAdornment> }}
                                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : undefined)}
                            />
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button color="error" startIcon={<WarningIcon />} onClick={() => onResolve("refund", note, amount)}>Refund</Button>
                                <Button color="success" startIcon={<ResolveIcon />} onClick={() => onResolve("release", note)}>Release Payment</Button>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button startIcon={<CloseIcon />} onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

// -----------------------------
// 3) Users Management
// -----------------------------
function UsersManagement({
    users, onRefresh, onToggleSuspend, onRoleChange
}: {
    users: User[];
    onRefresh: () => Promise<void>;
    onToggleSuspend: (id: string) => Promise<void>;
    onRoleChange: (id: string, role: Role) => Promise<void>;
}) {
    const [q, setQ] = useState("");
    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return users;
        return users.filter(u => u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t));
    }, [q, users]);

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search name/email"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    sx={{ minWidth: 280 }}
                />
                <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
            </Stack>
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Joined</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map(u => (
                            <TableRow key={u.id}>
                                <TableCell>{u.name}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>
                                    <Select size="small" value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value as Role)}>
                                        {["user", "seller", "admin"].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" color={u.status === "active" ? "success" : "default"} label={u.status} />
                                </TableCell>
                                <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <Button size="small" color={u.status === "active" ? "error" : "success"}
                                        startIcon={u.status === "active" ? <SuspendIcon /> : <CheckIcon />}
                                        onClick={() => onToggleSuspend(u.id)}>
                                        {u.status === "active" ? "Suspend" : "Activate"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow><TableCell colSpan={6}><Typography sx={{ p: 2 }} align="center">No users.</Typography></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}

// -----------------------------
// 4) Services Moderation
// -----------------------------
function ServicesModeration({
    items, onRefresh, onApprove, onRequestEdits, onUnlist, onRelist
}: {
    items: ServiceModerationItem[];
    onRefresh: () => Promise<void>;
    onApprove: (id: string) => Promise<void>;
    onRequestEdits: (id: string) => Promise<void>;
    onUnlist: (id: string) => Promise<void>;
    onRelist: (id: string) => Promise<void>;
}) {
    const [filter, setFilter] = useState<"all" | ServiceModerationStatus>("all");
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
        const s = items.filter(i => filter === "all" ? true : i.status === filter);
        const t = q.trim().toLowerCase();
        if (!t) return s;
        return s.filter(i => i.title.toLowerCase().includes(t) || i.seller.toLowerCase().includes(t) || i.category.toLowerCase().includes(t));
    }, [items, filter, q]);

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={filter} label="Status" onChange={(e) => setFilter(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            {["pending", "reported", "approved", "unlisted"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField size="small" placeholder="Search title/seller/category" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 280 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                </Stack>
                <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
            </Stack>

            <Grid container spacing={2}>
                {filtered.map(it => (
                    <Grid item xs={12} md={6} key={it.id}>
                        <Card variant="outlined">
                            <CardHeader
                                avatar={<Avatar><ServiceIcon /></Avatar>}
                                title={it.title}
                                subheader={`Seller: ${it.seller} • ${it.category}`}
                                action={<Chip size="small" color={it.status === "approved" ? "success" : it.status === "reported" ? "warning" : it.status === "unlisted" ? "default" : "info"} label={it.status} />}
                            />
                            <CardContent>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    {it.reports ? <Chip size="small" color="warning" icon={<ReportIcon />} label={`${it.reports} report(s)`} /> : <Chip size="small" label="No reports" />}
                                    <Typography variant="caption" color="text.secondary">Submitted: {new Date(it.submittedAt).toLocaleString()}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button size="small" startIcon={<CheckIcon />} onClick={() => onApprove(it.id)}>Approve</Button>
                                    <Button size="small" startIcon={<EditIcon />} onClick={() => onRequestEdits(it.id)}>Request Edits</Button>
                                    <Button size="small" color="error" startIcon={<UnlistIcon />} onClick={() => onUnlist(it.id)}>Unlist</Button>
                                    <Button size="small" color="success" startIcon={<RelistIcon />} onClick={() => onRelist(it.id)}>Relist</Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {filtered.length === 0 && (
                    <Grid item xs={12}><Paper sx={{ p: 4, textAlign: "center" }}><Typography>No items.</Typography></Paper></Grid>
                )}
            </Grid>
        </Box>
    );
}

// -----------------------------
// 5) Transactions & Ledgers
// -----------------------------
function TransactionsLedgers({
    txs, onRefresh, onExport
}: {
    txs: Transaction[];
    onRefresh: () => Promise<void>;
    onExport: () => void;
}) {
    const [type, setType] = useState<"all" | TxType>("all");
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
        const s = txs.filter(t => type === "all" ? true : t.type === type);
        const t = q.trim().toLowerCase();
        if (!t) return s;
        return s.filter(x =>
            x.orderId?.toLowerCase().includes(t) ||
            x.user?.toLowerCase().includes(t) ||
            x.note?.toLowerCase().includes(t)
        );
    }, [txs, type, q]);

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={type} label="Type" onChange={(e) => setType(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            {["payment", "payout", "refund", "fee", "adjustment"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField size="small" placeholder="Search order/user/note" value={q} onChange={(e) => setQ(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
                    <Button startIcon={<DownloadIcon />} onClick={onExport}>Export CSV</Button>
                </Stack>
            </Stack>

            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Currency</TableCell>
                            <TableCell>Order</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Note</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>{new Date(t.at).toLocaleString()}</TableCell>
                                <TableCell><Chip size="small" label={t.type} /></TableCell>
                                <TableCell align="right">{t.amount.toFixed(2)}</TableCell>
                                <TableCell>{t.currency}</TableCell>
                                <TableCell>{t.orderId || "-"}</TableCell>
                                <TableCell>{t.user || "-"}</TableCell>
                                <TableCell>{t.note || "-"}</TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && <TableRow><TableCell colSpan={7}><Typography sx={{ p: 2 }} align="center">No transactions.</Typography></TableCell></TableRow>}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}

// -----------------------------
// 6) Analytics & Reports
// -----------------------------
function AnalyticsReports({
    data, onRefresh, onExport
}: {
    data: AnalyticsData;
    onRefresh: () => Promise<void>;
    onExport: () => void;
}) {
    const [from, setFrom] = useState<string>(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10));
    const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10));

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                    <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
                    <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button startIcon={<RefreshIcon />} onClick={onRefresh}>Refresh</Button>
                    <Button startIcon={<DownloadIcon />} onClick={onExport}>Export Top Freelancers</Button>
                </Stack>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader avatar={<UsersIcon />} title="Top Freelancers" />
                        <CardContent>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Seller</TableCell><TableCell align="right">Sales</TableCell><TableCell align="right">Rating</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {data.topFreelancers.map((t, i) => (
                                        <TableRow key={i}><TableCell>{t.seller}</TableCell><TableCell align="right">{t.totalSales.toFixed(2)}</TableCell><TableCell align="right">{t.rating.toFixed(2)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader avatar={<ServiceIcon />} title="Popular Categories" />
                        <CardContent>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Category</TableCell><TableCell align="right">Volume</TableCell><TableCell align="right">Avg Price</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {data.popularCategories.map((c, i) => (
                                        <TableRow key={i}><TableCell>{c.category}</TableCell><TableCell align="right">{c.volume}</TableCell><TableCell align="right">{c.avgPrice.toFixed(2)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardHeader avatar={<AnalyticsIcon />} title="Dispute Rate / Satisfaction / Pricing Trends (sample)" />
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">
                                For brevity, charts are omitted; values below show latest points.
                            </Typography>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
                                <Paper sx={{ p: 2, flex: 1 }}>
                                    <Typography variant="subtitle2">Latest Dispute Rate</Typography>
                                    <Typography variant="h4">{(data.disputeRates.at(-1)?.rate ?? 0).toFixed(2)}%</Typography>
                                </Paper>
                                <Paper sx={{ p: 2, flex: 1 }}>
                                    <Typography variant="subtitle2">Latest Satisfaction</Typography>
                                    <Typography variant="h4">{(data.satisfaction.at(-1)?.score ?? 0).toFixed(2)}/5</Typography>
                                </Paper>
                                <Paper sx={{ p: 2, flex: 1 }}>
                                    <Typography variant="subtitle2">Latest Avg Price</Typography>
                                    <Typography variant="h4">{(data.pricingTrends.at(-1)?.avgPrice ?? 0).toFixed(2)}</Typography>
                                </Paper>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

// -----------------------------
// MOCK API (swap with real)
// -----------------------------
const api = {
    async getAdminStats(): Promise<AdminStats> {
        await delay(200);
        return demo.stats;
    },
    async listDisputes(): Promise<Dispute[]> {
        await delay(200);
        return demo.disputes;
    },
    async getDispute(id: string): Promise<Dispute> {
        await delay(120);
        return demo.disputes.find(d => d.id === id)!;
    },
    async assignDispute(id: string, who: string): Promise<Dispute> {
        await delay(150);
        const d = demo.disputes.find(x => x.id === id)!;
        d.assignment = who;
        d.status = d.status === "open" ? "reviewing" : d.status;
        return d;
    },
    async resolveDispute(id: string, action: "refund" | "release", note: string, amount?: number): Promise<Dispute> {
        await delay(250);
        const d = demo.disputes.find(x => x.id === id)!;
        d.status = action === "refund" ? "resolved_refund" : "resolved_release";
        d.resolutionNote = note || (action === "refund" ? `Refunded ${amount ?? d.amount}` : "Payment released");
        // create ledger event
        demo.transactions.unshift({
            id: `tx_${Date.now()}`,
            type: action === "refund" ? "refund" : "adjustment",
            amount: action === "refund" ? -(amount ?? d.amount) : 0,
            currency: d.currency,
            at: new Date().toISOString(),
            orderId: d.orderId,
            user: action === "refund" ? d.buyer : d.seller,
            note: d.resolutionNote
        });
        return d;
    },
    async listUsers(): Promise<User[]> {
        await delay(150);
        return demo.users;
    },
    async toggleUserSuspend(id: string): Promise<User> {
        await delay(120);
        const u = demo.users.find(x => x.id === id)!;
        u.status = u.status === "active" ? "suspended" : "active";
        return u;
    },
    async changeUserRole(id: string, role: Role): Promise<User> {
        await delay(120);
        const u = demo.users.find(x => x.id === id)!;
        u.role = role;
        return u;
    },
    async listServicesForModeration(): Promise<ServiceModerationItem[]> {
        await delay(150);
        return demo.services;
    },
    async approveService(id: string): Promise<ServiceModerationItem> {
        await delay(120);
        const it = demo.services.find(x => x.id === id)!; it.status = "approved"; it.reports = 0; return it;
    },
    async requestServiceEdits(id: string): Promise<ServiceModerationItem> {
        await delay(120);
        const it = demo.services.find(x => x.id === id)!; it.status = "pending"; return it;
    },
    async unlistService(id: string): Promise<ServiceModerationItem> {
        await delay(120);
        const it = demo.services.find(x => x.id === id)!; it.status = "unlisted"; return it;
    },
    async relistService(id: string): Promise<ServiceModerationItem> {
        await delay(120);
        const it = demo.services.find(x => x.id === id)!; it.status = "approved"; return it;
    },
    async listTransactions(): Promise<Transaction[]> {
        await delay(150);
        return demo.transactions;
    },
    async getAnalytics(): Promise<AnalyticsData> {
        await delay(150);
        return demo.analytics;
    }
};
function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// -----------------------------
// DEMO DATA (seed)
// -----------------------------
const now = Date.now();
const demo: {
    stats: AdminStats;
    disputes: Dispute[];
    users: User[];
    services: ServiceModerationItem[];
    transactions: Transaction[];
    analytics: AnalyticsData;
} = {
    stats: {
        salesVolume: 154320.55, ordersCount: 1275, openDisputes: 3, refunds: 7820.25, trend7dPct: +4.7, currency: "USD"
    },
    disputes: [
        {
            id: "dp_101",
            orderId: "ord_3001",
            buyer: "Alice",
            seller: "DevWorks",
            serviceTitle: "Build a Next.js Website",
            openedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
            status: "open",
            category: "quality",
            amount: 299,
            currency: "USD",
            ageDays: 2,
            thread: [
                { id: "m1", author: "buyer", body: "Delivered site has layout issues on mobile.", at: new Date(now - 1000 * 60 * 60 * 25).toISOString() },
                { id: "m2", author: "seller", body: "Can fix within 24h.", at: new Date(now - 1000 * 60 * 60 * 23).toISOString() }
            ],
            deliveries: [{ name: "site.zip" }],
            evidence: [{ by: "buyer", note: "Screenshots of bugs" }]
        },
        {
            id: "dp_102",
            orderId: "ord_3002",
            buyer: "Bob",
            seller: "PixelForge",
            serviceTitle: "Logo Pack Design",
            openedAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
            status: "reviewing",
            category: "communication",
            amount: 149,
            currency: "USD",
            ageDays: 7,
            thread: [{ id: "m3", author: "buyer", body: "Designer stopped responding.", at: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString() }],
            deliveries: [],
            evidence: [{ by: "buyer", note: "Messages screenshot" }],
            assignment: "admin_1"
        },
        {
            id: "dp_103",
            orderId: "ord_3003",
            buyer: "Charlie",
            seller: "APICrafters",
            serviceTitle: "REST API with Auth",
            openedAt: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
            status: "open",
            category: "delivery_late",
            amount: 499,
            currency: "USD",
            ageDays: 9,
            thread: [],
            deliveries: [],
            evidence: [{ by: "buyer", note: "Late beyond due date" }]
        }
    ],
    users: [
        { id: "u1", name: "Alice", email: "alice@example.com", role: "user", status: "active", createdAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString() },
        { id: "u2", name: "Bob", email: "bob@example.com", role: "seller", status: "active", createdAt: new Date(now - 1000 * 60 * 60 * 24 * 90).toISOString() },
        { id: "u3", name: "Celine", email: "celine@example.com", role: "seller", status: "suspended", createdAt: new Date(now - 1000 * 60 * 60 * 24 * 60).toISOString() },
        { id: "u4", name: "Admin", email: "admin@example.com", role: "admin", status: "active", createdAt: new Date(now - 1000 * 60 * 60 * 24 * 365).toISOString() }
    ],
    services: [
        { id: "s1", title: "Minimal Logo Design", seller: "Celine", category: "Design", status: "reported", reports: 3, submittedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString() },
        { id: "s2", title: "WordPress Landing Page", seller: "DevWorks", category: "Programming", status: "pending", reports: 0, submittedAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString() },
        { id: "s3", title: "Social Media Pack", seller: "PixelForge", category: "Design", status: "approved", reports: 0, submittedAt: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString() },
        { id: "s4", title: "iOS App Prototype", seller: "Swiftly", category: "Mobile", status: "unlisted", reports: 1, submittedAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString() }
    ],
    transactions: [
        { id: "t1", type: "payment", amount: 299, currency: "USD", at: new Date(now - 1000 * 60 * 60 * 10).toISOString(), orderId: "ord_3001", user: "Alice", note: "Order payment" },
        { id: "t2", type: "fee", amount: -45, currency: "USD", at: new Date(now - 1000 * 60 * 60 * 9).toISOString(), orderId: "ord_3001", user: "DevWorks", note: "Platform fee" },
        { id: "t3", type: "payout", amount: -200, currency: "USD", at: new Date(now - 1000 * 60 * 60 * 5).toISOString(), user: "DevWorks", note: "Payout to bank" },
        { id: "t4", type: "refund", amount: -149, currency: "USD", at: new Date(now - 1000 * 60 * 60 * 3).toISOString(), orderId: "ord_3002", user: "Bob", note: "Partial refund" },
        { id: "t5", type: "adjustment", amount: 0, currency: "USD", at: new Date(now - 1000 * 60 * 60 * 2).toISOString(), orderId: "ord_3003", user: "APICrafters", note: "Dispute: release decision queued" }
    ],
    analytics: {
        topFreelancers: [
            { seller: "DevWorks", totalSales: 12540, rating: 4.8 },
            { seller: "PixelForge", totalSales: 9320, rating: 4.6 },
            { seller: "APICrafters", totalSales: 8800, rating: 4.7 }
        ],
        popularCategories: [
            { category: "Design", volume: 420, avgPrice: 76 },
            { category: "Programming", volume: 350, avgPrice: 210 },
            { category: "Video", volume: 180, avgPrice: 160 }
        ],
        pricingTrends: [
            { date: "2025-10-15", avgPrice: 140 }, { date: "2025-10-22", avgPrice: 150 }, { date: "2025-10-29", avgPrice: 155 }, { date: "2025-11-05", avgPrice: 158 }
        ],
        disputeRates: [
            { date: "2025-10-15", rate: 1.2 }, { date: "2025-10-22", rate: 1.4 }, { date: "2025-10-29", rate: 1.1 }, { date: "2025-11-05", rate: 1.3 }
        ],
        satisfaction: [
            { date: "2025-10-15", score: 4.55 }, { date: "2025-10-22", score: 4.62 }, { date: "2025-10-29", score: 4.58 }, { date: "2025-11-05", score: 4.64 }
        ]
    }
};
