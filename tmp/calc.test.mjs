// src/utils/date.ts
function todayISO() {
  const d = /* @__PURE__ */ new Date();
  return toISO(d);
}
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function monthKey(iso) {
  return iso.slice(0, 7);
}
function isThisMonth(iso) {
  return monthKey(iso) === monthKey(todayISO());
}
function yearsBetween(startISO, endISO) {
  const a = parseISO(startISO).getTime();
  const b = parseISO(endISO).getTime();
  if (b <= a) return 0;
  return (b - a) / (365 * 864e5);
}

// src/services/calc.ts
function computeTotals(accounts2, deposits2, investments2, reserveFunds) {
  const current = accounts2.reduce((s, a) => s + a.balance, 0);
  const deposit = deposits2.reduce((s, d) => s + d.principal, 0);
  const investment = investments2.reduce((s, i) => s + i.currentValue, 0);
  const reserve = reserveFunds.reduce((s, r) => s + r.currentAmount, 0);
  return { current, deposit, investment, reserve, total: current + deposit + investment + reserve };
}
function monthlyChange(transactions) {
  let change = 0;
  for (const t3 of transactions) {
    if (!isThisMonth(t3.date)) continue;
    if (t3.type === "income") change += t3.amount;
    else if (t3.type === "expense") change -= t3.amount;
  }
  return change;
}
function depositExpectedInterest(d) {
  const years = yearsBetween(d.startDate, d.endDate);
  return Math.round(d.principal * (d.annualRate / 100) * years);
}
function depositMaturityAmount(d) {
  return d.principal + depositExpectedInterest(d);
}
function investmentTotalProfit(i) {
  return i.currentValue + i.realizedProfit - i.investedAmount;
}
function investmentRate(i) {
  if (i.investedAmount === 0) return 0;
  return investmentTotalProfit(i) / i.investedAmount * 100;
}

// scripts/calc.test.ts
var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}
var accounts = [
  { id: "a", name: "\u6D3B\u671F", type: "current", balance: 8e4, currency: "CNY", createdAt: "", updatedAt: "" }
];
var deposits = [
  {
    id: "d",
    bank: "\u62DB\u884C",
    name: "\u4E09\u5E74\u5B9A\u671F",
    type: "\u5B9A\u671F\u5B58\u6B3E",
    principal: 1e5,
    annualRate: 2.5,
    startDate: "2026-08-14",
    endDate: "2029-08-14",
    note: "",
    createdAt: "",
    updatedAt: ""
  }
];
var investments = [
  {
    id: "i",
    name: "\u57FA\u91D1",
    code: "",
    type: "\u57FA\u91D1",
    investedAmount: 112e3,
    currentValue: 120580,
    realizedProfit: 0,
    unrealizedProfit: 0,
    fee: 0,
    purchaseDate: "",
    note: "",
    createdAt: "",
    updatedAt: ""
  }
];
var reserves = [
  { id: "r", name: "\u5E94\u6025", targetAmount: 5e4, currentAmount: 2e4, accountId: "a", note: "", createdAt: "", updatedAt: "" }
];
var t = computeTotals(accounts, deposits, investments, reserves);
assert(t.total === 320580, `\u603B\u8D44\u4EA7 = ${t.total} (\u671F\u671B 320580)`);
assert(t.current === 8e4, "\u6D3B\u671F = 80000");
assert(t.deposit === 1e5, "\u5B58\u6B3E = 100000");
assert(t.investment === 120580, "\u7406\u8D22 = 120580");
assert(t.reserve === 2e4, "\u5907\u7528\u91D1 = 20000");
var acc2 = [
  { id: "a", name: "\u6D3B\u671F", type: "current", balance: 8e4, currency: "CNY", createdAt: "", updatedAt: "" }
];
var t2 = computeTotals(acc2, [], [], [{ id: "r", name: "\u5E94\u6025", targetAmount: 5e4, currentAmount: 2e4, accountId: "a", note: "", createdAt: "", updatedAt: "" }]);
assert(t2.total === 1e5, `\u8F6C\u8D26\u540E\u603B\u8D44\u4EA7\u4E0D\u53D8 = ${t2.total} (\u671F\u671B 100000)`);
assert(depositExpectedInterest(deposits[0]) === 7500, `\u9884\u8BA1\u5229\u606F = ${depositExpectedInterest(deposits[0])} (\u671F\u671B 7500)`);
assert(depositMaturityAmount(deposits[0]) === 107500, `\u5230\u671F\u672C\u606F = ${depositMaturityAmount(deposits[0])} (\u671F\u671B 107500)`);
assert(investmentTotalProfit(investments[0]) === 8580, `\u603B\u6536\u76CA = ${investmentTotalProfit(investments[0])} (\u671F\u671B 8580)`);
assert(Math.abs(investmentRate(investments[0]) - 7.66) < 0.01, `\u6536\u76CA\u7387 = ${investmentRate(investments[0]).toFixed(2)}% (\u671F\u671B 7.66%)`);
var txs = [
  { id: "1", type: "income", amount: 2e6, category: "\u5DE5\u8D44", accountId: "a", date: "2026-08-14", note: "", createdAt: "", updatedAt: "" },
  { id: "2", type: "expense", amount: 8500, category: "\u9910\u996E", accountId: "a", date: "2026-08-14", note: "", createdAt: "", updatedAt: "" },
  { id: "3", type: "transfer", amount: 5e5, category: "\u8F6C\u8D26", from: { kind: "account", id: "a" }, to: { kind: "reserve", id: "r" }, date: "2026-08-14", note: "", createdAt: "", updatedAt: "" }
];
assert(monthlyChange(txs) === 1991500, `\u672C\u6708\u53D8\u52A8 = ${monthlyChange(txs)} (\u671F\u671B 1991500)`);
if (failed === 0) console.log("\n\u2705 \u6240\u6709\u8D44\u4EA7\u8BA1\u7B97\u6D4B\u8BD5\u901A\u8FC7");
else {
  console.error(`
\u274C ${failed} \u4E2A\u6D4B\u8BD5\u5931\u8D25`);
  process.exit(1);
}
