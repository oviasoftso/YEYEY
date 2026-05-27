import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LedgerRow {
  date: string;
  details: string;
  folio: string;
  amount: string;
}

interface JournalRow {
  date: string;
  details: string;
  debit: string;
  credit: string;
}

interface TrialBalanceRow {
  account: string;
  debit: string;
  credit: string;
}

interface CashBookRow {
  date: string;
  details: string;
  discount: string;
  cash: string;
  bank: string;
}

interface StatementRow {
  label: string;
  amount: string;
}

type TableType = "ledger" | "journal" | "trial_balance" | "cash_book" | "income_statement" | "manufacturing";

interface AccountingTableProps {
  tableType: TableType;
  onChange: (value: string) => void;
}

function detectTableType(question: string): TableType | null {
  const q = question.toLowerCase();
  if (q.includes("cash book") || q.includes("three column")) return "cash_book";
  if (q.includes("trial balance")) return "trial_balance";
  if (q.includes("journal") || (q.includes("narrative") && !q.includes("account"))) return "journal";
  if (q.includes("manufacturing")) return "manufacturing";
  if (q.includes("trading") || q.includes("profit and loss") || q.includes("income statement")) return "income_statement";
  if (q.includes("ledger") || q.includes("t-account") || q.includes("account")) return "ledger";
  return null;
}

export function isAccountingTableQuestion(question: string): boolean {
  if (!question.includes("[TABLE]") && !question.toLowerCase().includes("| date") && !question.toLowerCase().includes("| account")) {
    return detectTableType(question) !== null && (
      question.toLowerCase().includes("prepare") ||
      question.toLowerCase().includes("record") ||
      question.toLowerCase().includes("enter") ||
      question.toLowerCase().includes("post") ||
      question.toLowerCase().includes("draw up") ||
      question.toLowerCase().includes("write up")
    );
  }
  return true;
}

function serializeRows(headers: string[], rows: Record<string, string>[]): string {
  if (rows.length === 0) return "(no entries)";
  const lines = [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`];
  rows.forEach((row) => {
    lines.push(`| ${headers.map((h) => row[h.toLowerCase().replace(/[^a-z]/g, "")] || "").join(" | ")} |`);
  });
  return lines.join("\n");
}

const cellClass = "h-8 text-sm border border-border bg-background px-2 rounded-none";
const headerClass = "h-8 text-[11px] font-semibold text-muted-foreground bg-muted px-2 border border-border whitespace-nowrap";

// ─── T-ACCOUNT (Dr | Cr side by side) ───────────────────────────
const TAccountTable = ({ onChange, title }: { onChange: (v: string) => void; title?: string }) => {
  const [drRows, setDrRows] = useState<LedgerRow[]>([{ date: "", details: "", folio: "", amount: "" }]);
  const [crRows, setCrRows] = useState<LedgerRow[]>([{ date: "", details: "", folio: "", amount: "" }]);

  const update = (side: "dr" | "cr", rows: LedgerRow[]) => {
    if (side === "dr") setDrRows(rows); else setCrRows(rows);
    const newDr = side === "dr" ? rows : drRows;
    const newCr = side === "cr" ? rows : crRows;
    const drStr = serializeRows(["Date", "Details", "Folio", "Amount"], newDr.map(r => ({ date: r.date, details: r.details, folio: r.folio, amount: r.amount })));
    const crStr = serializeRows(["Date", "Details", "Folio", "Amount"], newCr.map(r => ({ date: r.date, details: r.details, folio: r.folio, amount: r.amount })));
    onChange(`DEBIT (Dr):\n${drStr}\n\nCREDIT (Cr):\n${crStr}`);
  };

  const renderSide = (label: string, rows: LedgerRow[], side: "dr" | "cr") => (
    <div className="flex-1 min-w-0">
      <table className="w-full border-collapse border-2 border-foreground/20">
        <thead>
          <tr>
            <th colSpan={5} className="text-xs font-bold text-center py-1 bg-muted border border-border text-foreground">
              {label}
            </th>
          </tr>
          <tr>
            <th className={headerClass}>Date</th>
            <th className={`${headerClass} min-w-[100px]`}>Details</th>
            <th className={`${headerClass} w-12`}>Fo.</th>
            <th className={headerClass}>$ Amount</th>
            <th className="w-6 bg-muted border border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td><Input className={cellClass} value={row.date} placeholder="Jan 1" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], date: e.target.value }; update(side, c); }} /></td>
              <td><Input className={cellClass} value={row.details} placeholder="Narrative..." onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], details: e.target.value }; update(side, c); }} /></td>
              <td><Input className={`${cellClass} w-12`} value={row.folio} placeholder="" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], folio: e.target.value }; update(side, c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.amount} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], amount: e.target.value }; update(side, c); }} /></td>
              <td className="border border-border bg-muted/30">
                {rows.length > 1 && (
                  <button onClick={() => update(side, rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="ghost" size="sm" className="mt-1 text-[10px] gap-1 h-6" onClick={() => update(side, [...rows, { date: "", details: "", folio: "", amount: "" }])}>
        <Plus size={10} /> Row
      </Button>
    </div>
  );

  return (
    <div className="space-y-1">
      {title && <div className="text-center text-xs font-bold text-foreground underline mb-1">{title}</div>}
      <div className="flex gap-0 overflow-x-auto">
        {renderSide("Dr", drRows, "dr")}
        <div className="w-px bg-foreground/40 shrink-0" />
        {renderSide("Cr", crRows, "cr")}
      </div>
    </div>
  );
};

// ─── VERTICAL STATEMENT (Profit & Loss, Manufacturing, Trading) ──
const VerticalStatementTable = ({ onChange, title }: { onChange: (v: string) => void; title?: string }) => {
  const [rows, setRows] = useState<StatementRow[]>([
    { label: "", amount: "" },
    { label: "", amount: "" },
    { label: "", amount: "" },
  ]);

  const update = (newRows: StatementRow[]) => {
    setRows(newRows);
    const lines = newRows
      .filter(r => r.label.trim() || r.amount.trim())
      .map(r => `${r.label}: $${r.amount || "0"}`)
      .join("\n");
    onChange(`${title || "Statement"}:\n${lines}`);
  };

  return (
    <div className="space-y-1">
      {title && <div className="text-center text-xs font-bold text-foreground underline mb-2">{title}</div>}
      <table className="w-full border-collapse border-2 border-foreground/20">
        <thead>
          <tr>
            <th className={`${headerClass} w-3/5 text-left`}>Particulars</th>
            <th className={`${headerClass} w-1/5`}>$ </th>
            <th className={`${headerClass} w-1/5`}>$ </th>
            <th className="w-6 bg-muted border border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td><Input className={cellClass} value={row.label} placeholder={i === 0 ? "Sales / Revenue..." : "Line item..."} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], label: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.amount} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], amount: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} type="number" placeholder="" disabled={i < rows.length - 1} /></td>
              <td className="border border-border bg-muted/30">
                {rows.length > 1 && (
                  <button onClick={() => update(rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="ghost" size="sm" className="mt-1 text-[10px] gap-1 h-6" onClick={() => update([...rows, { label: "", amount: "" }])}>
        <Plus size={10} /> Add line
      </Button>
    </div>
  );
};

// ─── JOURNAL ─────────────────────────────────────────────────────
const JournalTable = ({ onChange }: { onChange: (v: string) => void }) => {
  const [rows, setRows] = useState<JournalRow[]>([
    { date: "", details: "", debit: "", credit: "" },
    { date: "", details: "", debit: "", credit: "" },
  ]);

  const update = (newRows: JournalRow[]) => {
    setRows(newRows);
    onChange(serializeRows(["Date", "Details", "Debit", "Credit"], newRows.map(r => ({ date: r.date, details: r.details, debit: r.debit, credit: r.credit }))));
  };

  return (
    <div className="overflow-x-auto">
      <div className="text-center text-xs font-bold text-foreground underline mb-2">General Journal</div>
      <table className="w-full border-collapse border-2 border-foreground/20">
        <thead>
          <tr>
            <th className={headerClass}>Date</th>
            <th className={`${headerClass} w-2/5`}>Details (Narrative)</th>
            <th className={headerClass}>Folio</th>
            <th className={headerClass}>Debit ($)</th>
            <th className={headerClass}>Credit ($)</th>
            <th className="w-6 bg-muted border border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td><Input className={cellClass} value={row.date} placeholder="Jan 1" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], date: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} value={row.details} placeholder="Narrative..." onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], details: e.target.value }; update(c); }} /></td>
              <td><Input className={`${cellClass} w-12`} placeholder="" /></td>
              <td><Input className={cellClass} type="number" value={row.debit} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], debit: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.credit} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], credit: e.target.value }; update(c); }} /></td>
              <td className="border border-border bg-muted/30">{rows.length > 1 && <button onClick={() => update(rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="ghost" size="sm" className="mt-1 text-[10px] gap-1 h-6" onClick={() => update([...rows, { date: "", details: "", debit: "", credit: "" }])}>
        <Plus size={10} /> Add row
      </Button>
    </div>
  );
};

// ─── TRIAL BALANCE ───────────────────────────────────────────────
const TrialBalanceTable = ({ onChange }: { onChange: (v: string) => void }) => {
  const [rows, setRows] = useState<TrialBalanceRow[]>([
    { account: "", debit: "", credit: "" },
    { account: "", debit: "", credit: "" },
    { account: "", debit: "", credit: "" },
  ]);

  const update = (newRows: TrialBalanceRow[]) => {
    setRows(newRows);
    onChange(serializeRows(["Account", "Debit", "Credit"], newRows.map(r => ({ account: r.account, debit: r.debit, credit: r.credit }))));
  };

  const drTotal = rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
  const crTotal = rows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);

  return (
    <div className="overflow-x-auto">
      <div className="text-center text-xs font-bold text-foreground underline mb-2">Trial Balance</div>
      <table className="w-full border-collapse border-2 border-foreground/20">
        <thead>
          <tr>
            <th className={`${headerClass} w-1/2 text-left`}>Account Name</th>
            <th className={headerClass}>Debit ($)</th>
            <th className={headerClass}>Credit ($)</th>
            <th className="w-6 bg-muted border border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td><Input className={cellClass} value={row.account} placeholder="Account name..." onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], account: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.debit} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], debit: e.target.value }; update(c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.credit} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], credit: e.target.value }; update(c); }} /></td>
              <td className="border border-border bg-muted/30">{rows.length > 1 && <button onClick={() => update(rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-foreground/30">
            <td className="h-8 text-xs font-bold text-foreground px-2 border border-border bg-muted">TOTALS</td>
            <td className={`h-8 text-xs font-bold text-center border border-border bg-muted ${drTotal !== crTotal ? "text-destructive" : "text-success"}`}>{drTotal.toFixed(2)}</td>
            <td className={`h-8 text-xs font-bold text-center border border-border bg-muted ${drTotal !== crTotal ? "text-destructive" : "text-success"}`}>{crTotal.toFixed(2)}</td>
            <td className="border border-border bg-muted" />
          </tr>
        </tbody>
      </table>
      {drTotal > 0 && crTotal > 0 && drTotal !== crTotal && (
        <p className="text-[10px] text-destructive mt-1">⚠ Debit and Credit totals do not balance</p>
      )}
      <Button variant="ghost" size="sm" className="mt-1 text-[10px] gap-1 h-6" onClick={() => update([...rows, { account: "", debit: "", credit: "" }])}>
        <Plus size={10} /> Add row
      </Button>
    </div>
  );
};

// ─── CASH BOOK (Dr | Cr two-sided) ──────────────────────────────
const CashBookTable = ({ onChange }: { onChange: (v: string) => void }) => {
  const [drRows, setDrRows] = useState<CashBookRow[]>([{ date: "", details: "", discount: "", cash: "", bank: "" }]);
  const [crRows, setCrRows] = useState<CashBookRow[]>([{ date: "", details: "", discount: "", cash: "", bank: "" }]);

  const update = (side: "dr" | "cr", rows: CashBookRow[]) => {
    if (side === "dr") setDrRows(rows); else setCrRows(rows);
    const newDr = side === "dr" ? rows : drRows;
    const newCr = side === "cr" ? rows : crRows;
    const drStr = serializeRows(["Date", "Details", "Discount", "Cash", "Bank"], newDr.map(r => ({ date: r.date, details: r.details, discount: r.discount, cash: r.cash, bank: r.bank })));
    const crStr = serializeRows(["Date", "Details", "Discount", "Cash", "Bank"], newCr.map(r => ({ date: r.date, details: r.details, discount: r.discount, cash: r.cash, bank: r.bank })));
    onChange(`RECEIPTS (Dr):\n${drStr}\n\nPAYMENTS (Cr):\n${crStr}`);
  };

  const renderSide = (label: string, rows: CashBookRow[], side: "dr" | "cr") => (
    <div className="flex-1 min-w-0">
      <table className="w-full border-collapse border-2 border-foreground/20">
        <thead>
          <tr>
            <th colSpan={6} className="text-xs font-bold text-center py-1 bg-muted border border-border text-foreground">{label}</th>
          </tr>
          <tr>
            <th className={headerClass}>Date</th>
            <th className={`${headerClass} min-w-[80px]`}>Details</th>
            <th className={`${headerClass} w-12`}>Disc.</th>
            <th className={headerClass}>Cash</th>
            <th className={headerClass}>Bank</th>
            <th className="w-6 bg-muted border border-border" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td><Input className={cellClass} value={row.date} placeholder="Jan 1" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], date: e.target.value }; update(side, c); }} /></td>
              <td><Input className={cellClass} value={row.details} placeholder="Narrative..." onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], details: e.target.value }; update(side, c); }} /></td>
              <td><Input className={`${cellClass} w-12`} type="number" value={row.discount} placeholder="0" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], discount: e.target.value }; update(side, c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.cash} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], cash: e.target.value }; update(side, c); }} /></td>
              <td><Input className={cellClass} type="number" value={row.bank} placeholder="0.00" onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], bank: e.target.value }; update(side, c); }} /></td>
              <td className="border border-border bg-muted/30">{rows.length > 1 && <button onClick={() => update(side, rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 size={12} /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="ghost" size="sm" className="mt-1 text-[10px] gap-1 h-6" onClick={() => update(side, [...rows, { date: "", details: "", discount: "", cash: "", bank: "" }])}>
        <Plus size={10} /> Row
      </Button>
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="text-center text-xs font-bold text-foreground underline mb-1">Three Column Cash Book</div>
      <div className="flex gap-0 overflow-x-auto">
        {renderSide("Dr (Receipts)", drRows, "dr")}
        <div className="w-px bg-foreground/40 shrink-0" />
        {renderSide("Cr (Payments)", crRows, "cr")}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────
const AccountingTable = ({ tableType, onChange }: AccountingTableProps) => {
  switch (tableType) {
    case "ledger":
      return <TAccountTable onChange={onChange} />;
    case "income_statement":
      return <VerticalStatementTable onChange={onChange} title="Trading, Profit and Loss Account" />;
    case "manufacturing":
      return <VerticalStatementTable onChange={onChange} title="Manufacturing Account" />;
    case "journal":
      return <JournalTable onChange={onChange} />;
    case "trial_balance":
      return <TrialBalanceTable onChange={onChange} />;
    case "cash_book":
      return <CashBookTable onChange={onChange} />;
    default:
      return <TAccountTable onChange={onChange} />;
  }
};

export { detectTableType };
export type { TableType };
export default AccountingTable;
