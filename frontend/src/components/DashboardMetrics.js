// src/components/DashboardMetrics.js
import React from 'react';
import { format, parseISO } from 'date-fns';

const formatCurrency = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const calculatePercentageChange = (current, previous) => {
    if (previous === null || previous === undefined || previous === 0) return { change: null };
    const change = ((current - previous) / previous) * 100;
    return { change: change.toFixed(1), isPositive: change > 0, isNegative: change < 0 };
};

const StatCard = ({ value, label, previousValue }) => {
    const numericValue = parseFloat(value) || 0;
    const numericPreviousValue = parseFloat(previousValue) || 0;
    
    const { change, isPositive, isNegative } = calculatePercentageChange(numericValue, numericPreviousValue);

    const displayValue = () => {
        if (label.includes('Rate')) return `${numericValue}%`;
        if (label.includes('Leads') || label.includes('Won')) return numericValue;
        return formatCurrency(numericValue);
    };

    const formatPreviousValue = () => {
        if (label.includes('Rate')) return `${numericPreviousValue}%`;
        if (label.includes('Leads') || label.includes('Won')) return numericPreviousValue;
        return formatCurrency(numericPreviousValue);
    };

    return (
        <div className="card stat-card">
            <div className="value">{displayValue()}</div>
            <div className="label">{label}</div>
            {change !== null && (
                <div className={`percentage-change ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
                    {isPositive ? '▲' : '▼'} {Math.abs(change)}% (was {formatPreviousValue()})
                </div>
            )}
        </div>
    );
};

const DashboardMetrics = ({ analyticsData }) => {
    if (!analyticsData || !analyticsData.currentPeriod) {
        return <div className="dashboard-grid">Loading analytics...</div>;
    }

    const { currentPeriod, previousPeriod, upcomingPayments, salesLeaderboard, leadSourceAnalysis } = analyticsData;
    const { pipelineOverview, paymentsAtAGlance } = currentPeriod;
    
    const dealsWon = parseFloat(pipelineOverview.deals_won) || 0;
    const dealsLost = parseFloat(pipelineOverview.deals_lost) || 0;
    const totalClosedDeals = dealsWon + dealsLost;
    const conversionRate = totalClosedDeals > 0 ? ((dealsWon / totalClosedDeals) * 100).toFixed(1) : 0;
    
    let prevConversionRate = 0;
    if(previousPeriod && previousPeriod.pipelineOverview) {
        const prevDealsWon = parseFloat(previousPeriod.pipelineOverview.deals_won) || 0;
        const prevDealsLost = parseFloat(previousPeriod.pipelineOverview.deals_lost) || 0;
        const prevTotalClosed = prevDealsWon + prevDealsLost;
        prevConversionRate = prevTotalClosed > 0 ? ((prevDealsWon / prevTotalClosed) * 100).toFixed(1) : 0;
    }

    return (
        <div className="dashboard-grid">
            {/* Pipeline Overview */}
            <StatCard value={pipelineOverview.total_open_leads} label="Total Open Leads" previousValue={previousPeriod?.pipelineOverview.total_open_leads} />
            <StatCard value={pipelineOverview.pipeline_value} label="Pipeline Value" previousValue={previousPeriod?.pipelineOverview.pipeline_value} />
            <StatCard value={conversionRate} label="Conversion Rate" previousValue={prevConversionRate} />
            <StatCard value={pipelineOverview.avg_deal_size} label="Avg. Deal Size" previousValue={previousPeriod?.pipelineOverview.avg_deal_size} />
            
            {/* Payments at a Glance */}
            <div className="card full-width-card payments-glance">
                <h2>Payments at a Glance</h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                        <div className="payment-value">{formatCurrency(paymentsAtAGlance.total_invoiced)}</div>
                        <div className="label">Total Invoiced</div>
                    </div>
                    <div>
                        <div className="payment-value total-received">{formatCurrency(paymentsAtAGlance.total_received)}</div>
                        <div className="label">Total Received</div>
                    </div>
                    <div>
                        <div className="payment-value total-pending">{formatCurrency(paymentsAtAGlance.total_pending)}</div>
                        <div className="label">Total Pending</div>
                    </div>
                </div>
            </div>

            {/* Upcoming Payments */}
            <div className="card full-width-card">
                <h2>Upcoming Payments</h2>
                <table>
                    <thead>
                        <tr><th>Company</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        {upcomingPayments && upcomingPayments.map((p) => (
                            <tr key={p.id} className={p.status === 'Overdue' ? 'upcoming-payment overdue' : 'upcoming-payment'}>
                                <td>{p.companyname}</td>
                                <td>{formatCurrency(p.amount)}</td>
                                <td>{format(parseISO(p.duedate), 'dd MMM, yyyy')}</td>
                                <td>
                                    {p.status} 
                                    {p.status !== 'Paid' && p.days_until_due < 0 ? ` (${Math.abs(p.days_until_due)} days ago)` : ''}
                                    {p.status !== 'Paid' && p.days_until_due >= 0 ? ` (in ${p.days_until_due} days)` : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- THIS IS THE FIX --- */}
            {/* New container for the bottom row with the new layout style */}
            <div className="card dashboard-bottom-row">
                <div className="card">
                    <h2>Sales Leaderboard</h2>
                    <table>
                        <thead><tr><th>Owner</th><th>Total Sales</th><th>Accounts Won</th></tr></thead>
                        <tbody>
                            {salesLeaderboard && salesLeaderboard.map((s, i) => (
                                <tr key={i}>
                                    <td>{s.leadowner}</td>
                                    <td>{formatCurrency(s.total_sales_value)}</td>
                                    <td>{s.accounts_won}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <h2>Lead Source Analysis</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Leads</th>
                                <th>Avg. Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leadSourceAnalysis && leadSourceAnalysis.map((s, i) => (
                                <tr key={i}>
                                    <td>{s.leadsource}</td>
                                    <td>
                                        {s.current_leads}
                                        {previousPeriod && <span className="previous-value"> (was {s.previous_leads})</span>}
                                    </td>
                                    <td>
                                        {formatCurrency(s.current_avg_value)}
                                        {previousPeriod && <span className="previous-value"> (was {formatCurrency(s.previous_avg_value)})</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardMetrics;