/** One fictional production month: 100,000 shirts. CNY; no VAT or personal tax.
 * Headcounts, pay, prices, benefit rate, depreciation, interest and tax are
 * teaching assumptions, not estimates of a real company or industry.
 */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const BATCH = 100_000;
export const ROLES = [
	{ id: 'workers', label: '一线员工', count: 80, pay: 6000, min: 4000, max: 12000, step: 500, color: '#91cfb2' },
	{ id: 'leads', label: '组长与技术员', count: 8, pay: 12000, min: 8000, max: 24000, step: 1000, color: '#78baca' },
	{ id: 'executives', label: '高管', count: 2, pay: 30000, min: 15000, max: 80000, step: 5000, color: '#dfb781' },
	{ id: 'director', label: '老板兼总经理', count: 1, pay: 60000, min: 20000, max: 120000, step: 5000, color: '#c893ae' },
] as const;
export type RoleId = (typeof ROLES)[number]['id'];
export type EconomyParams = {
	salaries: Record<RoleId, number>;
	factoryPrice: number;
	retailPrice: number;
	fullPriceShare: number;
	depositShare: number;
	paymentDay: number;
	payoutShare: number;
	textileWorkerPay: number;
};
export const DEFAULT_ECONOMY: EconomyParams = {
	salaries: { workers: 6000, leads: 12000, executives: 30000, director: 60000 },
	factoryPrice: 32,
	retailPrice: 100,
	fullPriceShare: 1,
	depositShare: 0.3,
	paymentDay: 90,
	payoutShare: 0.5,
	textileWorkerPay: 4000,
};

export function economyAccount(input: EconomyParams) {
	const roles = ROLES.map((role) => {
		const pay = clamp(input.salaries[role.id], role.min, role.max);
		return { ...role, pay, total: pay * role.count };
	});
	const payroll = roles.reduce((sum, role) => sum + role.total, 0);
	const benefits = payroll * 0.2;
	const material = 18 * BATCH,
		overhead = 150_000,
		depreciation = 30_000;
	const factoryPrice = clamp(input.factoryPrice, 24, 40);
	const revenue = factoryPrice * BATCH;
	const productionCashCost = material + payroll + benefits + overhead;
	const depositShare = clamp(input.depositShare, 0, 0.8);
	const deposit = revenue * depositShare;
	const paymentDay = Math.round(clamp(input.paymentDay, 30, 120));
	const earlyGap = Math.max(0, material - deposit);
	const lateGap = paymentDay > 30 ? Math.max(0, productionCashCost - deposit) : Math.max(0, productionCashCost - revenue);
	const interest = ((earlyGap * 30 + lateGap * (paymentDay - 30)) * 0.08) / 365;
	const ebit = revenue - productionCashCost - depreciation;
	const pretaxProfit = ebit - interest;
	// Deliberately simple effective tax assumption: no loss carryforward/credits.
	const tax = Math.max(0, pretaxProfit) * 0.25;
	const netProfit = pretaxProfit - tax;
	const dividend = Math.max(0, netProfit) * clamp(input.payoutShare, 0, 1);
	const retainedProfit = netProfit - dividend;
	const cashAfterSettlement = revenue - productionCashCost - interest - tax - dividend;
	const ownerDividend = dividend * 0.8;
	const ownerSalary = roles.find((role) => role.id === 'director')!.pay;
	const averageRetail =
		clamp(input.fullPriceShare, 0, 1) * clamp(input.retailPrice, 60, 180) + (1 - clamp(input.fullPriceShare, 0, 1)) * 40;
	const retailRevenue = averageRetail * BATCH;
	const retailCosts = { procurement: revenue, wages: 10 * BATCH, channels: 24 * BATCH, marketing: 10 * BATCH, logistics: 4 * BATCH };
	const retailResidual = retailRevenue - Object.values(retailCosts).reduce((a, b) => a + b, 0);
	const textileRoles = [
		{ id: 'textile-workers', label: '纺织一线员工', count: 60, pay: clamp(input.textileWorkerPay, 3000, 8000), color: '#91cfb2' },
		{ id: 'textile-techs', label: '技术员', count: 4, pay: 9000, color: '#78baca' },
		{ id: 'textile-manager', label: '纺织厂经理', count: 1, pay: 24000, color: '#dfb781' },
	].map((role) => ({ ...role, total: role.count * role.pay }));
	const textilePayroll = textileRoles.reduce((sum, role) => sum + role.total, 0);
	const textileBenefits = textilePayroll * 0.2;
	const textilePretax = material - 6 * BATCH - textilePayroll - textileBenefits - 2 * BATCH - 3 * BATCH - 50_000;
	const textileTax = Math.max(0, textilePretax) * 0.25;
	const textile = {
		roles: textileRoles,
		payroll: textilePayroll,
		benefits: textileBenefits,
		revenue: material,
		pretax: textilePretax,
		tax: textileTax,
		netProfit: textilePretax - textileTax,
		costs: [
			{ id: 'cotton', label: '皮棉采购', amount: 6 * BATCH, color: '#778f9b' },
			{ id: 'payroll', label: '税前工资', amount: textilePayroll, color: '#91cfb2' },
			{ id: 'benefits', label: '雇主福利支出', amount: textileBenefits, color: '#6da491' },
			{ id: 'energy', label: '能源与水处理', amount: 2 * BATCH, color: '#78baca' },
			{ id: 'other', label: '辅料、房租与其他', amount: 3 * BATCH, color: '#778f9b' },
			{ id: 'depreciation', label: '设备折旧', amount: 50_000, color: '#9b8e7e' },
			{ id: 'tax', label: '所得税', amount: textileTax, color: '#738db7' },
			{ id: 'net', label: '纺织厂净利润', amount: textilePretax - textileTax, color: textilePretax >= 0 ? '#dfb781' : '#e18c80' },
		],
	};
	const costs = [
		{ id: 'material', label: '面料采购', amount: material, color: '#778f9b' },
		{ id: 'payroll', label: '税前工资', amount: payroll, color: '#91cfb2' },
		{ id: 'benefits', label: '雇主福利支出', amount: benefits, color: '#6da491' },
		{ id: 'overhead', label: '房租、水电与管理', amount: overhead, color: '#778f9b' },
		{ id: 'depreciation', label: '设备折旧', amount: depreciation, color: '#9b8e7e' },
		{ id: 'interest', label: '借款利息', amount: interest, color: '#c893ae' },
		{ id: 'tax', label: '所得税', amount: tax, color: '#738db7' },
		{ id: 'net', label: '工厂净利润', amount: netProfit, color: netProfit >= 0 ? '#dfb781' : '#e18c80' },
	];
	return {
		roles,
		payroll,
		benefits,
		material,
		overhead,
		depreciation,
		revenue,
		factoryPrice,
		productionCashCost,
		depositShare,
		deposit,
		paymentDay,
		earlyGap,
		lateGap,
		peakFunding: Math.max(earlyGap, lateGap),
		interest,
		ebit,
		pretaxProfit,
		tax,
		netProfit,
		dividend,
		retainedProfit,
		cashAfterSettlement,
		ownerDividend,
		ownerSalary,
		ownerIncome: ownerSalary + ownerDividend,
		otherDividends: dividend * 0.2,
		averageRetail,
		retailRevenue,
		retailCosts,
		retailResidual,
		costs,
		textile,
	};
}
export type EconomyAccount = ReturnType<typeof economyAccount>;

/** Settled-date snapshots; bridge borrowing nets payments on the same date.
 * Interest/tax/dividends settle with final payment. Loans cover cash shortages;
 * credit constraints and simultaneous subsequent orders are out of scope.
 */
export function cashAtDay(a: EconomyAccount, selectedDay: number) {
	const day = clamp(selectedDay, 0, 120);
	const produced = day >= 30,
		settled = day >= a.paymentDay;
	const received = settled ? a.revenue : a.deposit;
	const paid = a.material + (produced ? a.payroll + a.benefits + a.overhead : 0) + (settled ? a.interest + a.tax + a.dividend : 0);
	const unfinancedCash = received - paid;
	return {
		day,
		produced,
		settled,
		received,
		paid,
		bankDebt: Math.max(0, -unfinancedCash),
		cash: Math.max(0, unfinancedCash),
		receivable: produced && !settled ? a.revenue - a.deposit : 0,
		customerAdvance: !produced && !settled ? a.deposit : 0,
		futureBalance: settled ? 0 : a.revenue - a.deposit,
	};
}

export function buildingFunding(a: EconomyAccount, loanShare: number) {
	const cost = 5_000_000;
	const loan = cost * clamp(loanShare, 0, 0.8);
	const equity = cost - loan;
	const batches = a.cashAfterSettlement > 0 ? Math.ceil(equity / a.cashAfterSettlement) : null;
	return { cost, loan, equity, batches };
}
