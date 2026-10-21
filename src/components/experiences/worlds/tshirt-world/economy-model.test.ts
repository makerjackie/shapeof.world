import { describe, expect, it } from 'vitest';
import { BATCH, DEFAULT_ECONOMY, buildingFunding, cashAtDay, economyAccount } from './economy-model';

describe('one shirt, one connected economy', () => {
	it('reconciles every factory revenue yuan through expenses, tax and profit', () => {
		for (const price of [24, 32, 40])
			for (const workers of [4000, 6000, 12000]) {
				const a = economyAccount({ ...DEFAULT_ECONOMY, factoryPrice: price, salaries: { ...DEFAULT_ECONOMY.salaries, workers } });
				expect(a.costs.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(a.revenue, 7);
				expect(a.cashAfterSettlement).toBeCloseTo(a.retainedProfit + a.depreciation, 7);
			}
	});
	it('connects the garment fabric bill to textile revenue and reconciles textile wages and profit', () => {
		for (const textileWorkerPay of [3000, 4000, 8000]) {
			const a = economyAccount({ ...DEFAULT_ECONOMY, textileWorkerPay });
			expect(a.textile.revenue).toBe(a.material);
			expect(a.textile.roles.reduce((n, r) => n + r.count, 0)).toBe(65);
			expect(a.textile.costs.reduce((n, c) => n + c.amount, 0)).toBeCloseTo(a.material);
			expect(a.textile.payroll).toBe(60 * textileWorkerPay + 60000);
		}
	});
	it('distinguishes 91 people, their per-person salaries and each group total', () => {
		const a = economyAccount(DEFAULT_ECONOMY);
		expect(a.roles.reduce((sum, role) => sum + role.count, 0)).toBe(91);
		expect(a.payroll).toBe(696000);
		expect(a.roles[0].total).toBe(480000);
		expect(a.ownerSalary).toBe(60000);
		expect(a.benefits).toBe(139200);
	});
	it('higher worker pay changes supplier margin, cash needs and dividends coherently', () => {
		const a = economyAccount(DEFAULT_ECONOMY);
		const b = economyAccount({ ...DEFAULT_ECONOMY, salaries: { ...DEFAULT_ECONOMY.salaries, workers: 8000 } });
		expect(b.productionCashCost - a.productionCashCost).toBe(192000);
		expect(b.peakFunding - a.peakFunding).toBe(192000);
		expect(b.netProfit).toBeLessThan(a.netProfit);
		expect(b.ownerDividend).toBeLessThan(a.ownerDividend);
		expect(b.ownerSalary).toBe(a.ownerSalary);
	});
	it('same-day settlement avoids a fictitious second borrowing peak', () => {
		const a = economyAccount({ ...DEFAULT_ECONOMY, paymentDay: 30 });
		expect(a.peakFunding).toBe(840000);
		expect(a.interest).toBeCloseTo((840000 * 30 * 0.08) / 365);
		expect(cashAtDay(a, 30).bankDebt).toBe(0);
		expect(cashAtDay(a, 30).receivable).toBe(0);
	});
	it('does not recognize customer advances as receivables before delivery', () => {
		const a = economyAccount(DEFAULT_ECONOMY);
		expect(cashAtDay(a, 0)).toMatchObject({ bankDebt: 840000, receivable: 0, customerAdvance: 960000 });
		expect(cashAtDay(a, 30)).toMatchObject({ bankDebt: 1825200, receivable: 2240000, customerAdvance: 0 });
		expect(cashAtDay(a, 90)).toMatchObject({ bankDebt: 0, receivable: 0, settled: true });
	});
	it('retail markdown losses do not erase a fixed supplier contract', () => {
		const a = economyAccount({ ...DEFAULT_ECONOMY, fullPriceShare: 0 });
		expect(a.retailRevenue).toBe(40 * BATCH);
		expect(a.retailResidual).toBe(-40 * BATCH);
		expect(a.revenue).toBe(32 * BATCH);
	});
	it('losses pay no tax or dividend and may leave bridge debt outstanding', () => {
		const a = economyAccount({ ...DEFAULT_ECONOMY, factoryPrice: 24 });
		expect(a.netProfit).toBeLessThan(0);
		expect(a.tax).toBe(0);
		expect(a.dividend).toBe(0);
		expect(cashAtDay(a, 120).bankDebt).toBeGreaterThan(0);
	});
	it('changing distributions preserves profit and divides ownership correctly', () => {
		const a = economyAccount(DEFAULT_ECONOMY);
		const b = economyAccount({ ...DEFAULT_ECONOMY, payoutShare: 1 });
		expect(b.netProfit).toBe(a.netProfit);
		expect(b.ownerDividend + b.otherDividends).toBeCloseTo(b.dividend);
		expect(b.cashAfterSettlement).toBeCloseTo(b.depreciation);
	});
	it('a building is funded by both equity and debt, not counted as new income', () => {
		const a = economyAccount(DEFAULT_ECONOMY);
		const building = buildingFunding(a, 0.7);
		expect(building.loan + building.equity).toBe(building.cost);
		expect(building.loan).toBe(3500000);
		expect(building.batches).toBe(Math.ceil(1500000 / a.cashAfterSettlement));
		expect(buildingFunding(economyAccount({ ...DEFAULT_ECONOMY, factoryPrice: 24 }), 0.7).batches).toBeNull();
	});
});
