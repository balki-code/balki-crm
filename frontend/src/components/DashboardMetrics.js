// src/components/DashboardMetrics.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

const StatCard = ({ value, label, className }) => (
    <div className={`card stat-card ${className || ''}`}>
        <div className="value">{value}</div>
        <div className="label">{label}</div>
    </div>
);

const formatCurrency = (num) => `₹${parseFloat(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const DashboardMetrics = ({ analyticsData }) => {
    if (!analyticsData) {
        return <div className="dashboard-grid">Loading analytics...</div>;
    }

    const { 
        pipelineOverview, 
        paymentsAtAGlance, 
        upcomingPayments, 
        salesLeaderboard, 
        leadSourceAnalysis 
    } = analyticsData;
    
    // Calculate conversion rate
    const dealsWon = parseFloat(pipelineOverview.deals_won) || 0;
    const dealsLost = parseFloat(pipelineOverview.deals_lost) || 0;
    const totalClosedDeals = dealsWon + dealsLost;
    const conversionRate = totalClosedDeals > 0 ? ((dealsWon / totalClosedDeals) * 100).toFixed(1) : 0;

    return (
        <div className="dashboard-grid">
            {/* Pipeline Overview */}
            <StatCard value={pipelineOverview.total_open_leads || 0} label="Total Open Leads" />
            <StatCard value={formatCurrency(pipelineOverview.pipeline_value)} label="Pipeline Value" />
            <StatCard value={`${conversionRate}%`} label="Conversion Rate" />
            <StatCard value={formatCurrency(pipelineOverview.avg_deal_size)} label="Avg. Deal Size" />
            
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
                        <tr>
                            <th>Company</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {upcomingPayments && upcomingPayments.map((p, i) => (
                            <tr key={i} className={p.status === 'Overdue' ? 'upcoming-payment overdue' : 'upcoming-payment'}>
                                <td>{p.companyname}</td>
                                <td>{formatCurrency(p.amount)}</td>
                                <td>{format(parseISO(p.duedate), 'dd MMM, yyyy')}</td>
                                <td>
                                    {p.status} 
                                    {p.status === 'Overdue' ? ` (${Math.abs(p.days_until_due)} days ago)` : ` (in ${p.days_until_due} days)`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Sales Leaderboard */}
            <div className="card">
                <h2>Sales Leaderboard</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Owner</th>
                            <th>Total Sales</th>
                            <th>Accounts Won</th>
                        </tr>
                    </thead>
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

            {/* Lead Source Analysis */}
            <div className="card">
                <h2>Lead Source Analysis</h2>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={leadSourceAnalysis} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="leadsource" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="avg_order_value" fill="#8884d8" name="Avg. Order Value" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DashboardMetrics;
