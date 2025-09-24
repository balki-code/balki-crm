// backend/queries.js
// Final Production-Ready Code for Analytics
const db = require('./db');

// (All other functions like getLeads, createLead, etc., are unchanged)
const parsePaymentSchedule = (scheduleString) => { if (!scheduleString) return []; return scheduleString.split(';').map(item => { const amountMatch = item.match(/Amount: ([\d.]+)/); const dueDateMatch = item.match(/Due: ([\d-]+)/); const statusMatch = item.match(/Status: (\w+)/); if (amountMatch && dueDateMatch && statusMatch) { return { amount: parseFloat(amountMatch[1]), dueDate: dueDateMatch[1], status: statusMatch[1] }; } return null; }).filter(Boolean); };
const getLeads = async (request, response) => { const { startDate, endDate } = request.query; try { await db.query(`UPDATE payment_installments SET status = 'Overdue' WHERE dueDate < CURRENT_DATE AND status = 'Pending';`); let query = `SELECT l.*, (SELECT json_agg(pi.* ORDER BY pi.dueDate ASC) FROM payment_installments pi WHERE pi.leadId = l.id) as installments FROM leads l`; const queryParams = []; if (startDate && endDate) { query += ` WHERE l.dateAdded BETWEEN $1 AND $2`; queryParams.push(startDate, endDate); } query += ` ORDER BY l.dateAdded DESC`; const results = await db.query(query, queryParams); response.status(200).json(results.rows); } catch (error) { console.error('Error fetching leads:', error); response.status(500).json({ error: 'Internal Server Error' }); }};
const createLead = async (request, response) => { try { const { dateAdded, companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentSchedule } = request.body; const paymentScheduleString = paymentSchedule.map(p => `[Amount: ${parseFloat(p.amount).toFixed(2)}, Due: ${p.dueDate}, Status: ${p.status}]`).join('; '); const client = await db.query('BEGIN'); const leadQuery = `INSERT INTO leads (dateAdded, companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentSchedule) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id;`; const leadValues = [dateAdded, companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentScheduleString]; const newLead = await db.query(leadQuery, leadValues); const leadId = newLead.rows[0].id; if (paymentSchedule && paymentSchedule.length > 0) { const installmentQuery = `INSERT INTO payment_installments (leadId, amount, dueDate, status) VALUES ($1, $2, $3, $4);`; for (const installment of paymentSchedule) { await db.query(installmentQuery, [leadId, installment.amount, installment.dueDate, installment.status]); } } await db.query('COMMIT'); response.status(201).json({ message: 'Lead created successfully', id: leadId }); } catch (error) { await db.query('ROLLBACK'); console.error('Error creating lead:', error); response.status(500).json({ error: 'Internal Server Error' }); }};
const updateLead = async (request, response) => { try { const id = parseInt(request.params.id); const { companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentSchedule } = request.body; const paymentScheduleString = paymentSchedule.map(p => `[Amount: ${parseFloat(p.amount).toFixed(2)}, Due: ${p.dueDate}, Status: ${p.status}]`).join('; '); const client = await db.query('BEGIN'); const leadQuery = `UPDATE leads SET companyName = $1, contactPerson = $2, contactInfo = $3, leadSource = $4, leadStatus = $5, leadOwner = $6, nextFollowUpDate = $7, proposalStatus = $8, quotedAmount = $9, paymentStatus = $10, notes = $11, reasonForLossWin = $12, dateWon = $13, paymentSchedule = $14 WHERE id = $15;`; const leadValues = [companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentScheduleString, id]; await db.query(leadQuery, leadValues); await db.query('DELETE FROM payment_installments WHERE leadId = $1', [id]); if (paymentSchedule && paymentSchedule.length > 0) { const installmentQuery = `INSERT INTO payment_installments (leadId, amount, dueDate, status) VALUES ($1, $2, $3, $4);`; for (const installment of paymentSchedule) { await db.query(installmentQuery, [id, installment.amount, installment.dueDate, installment.status]); } } await db.query('COMMIT'); response.status(200).send(`Lead modified with ID: ${id}`); } catch (error) { await db.query('ROLLBACK'); console.error('Error updating lead:', error); response.status(500).json({ error: 'Internal Server Error' }); }};
const deleteLead = async (request, response) => { const id = parseInt(request.params.id); try { await db.query('DELETE FROM leads WHERE id = $1', [id]); response.status(200).send(`Lead deleted with ID: ${id}`); } catch (error) { console.error('Error deleting lead:', error); response.status(500).json({ error: 'Internal Server Error' }); }};
const updateInstallmentStatus = async (request, response) => { const id = parseInt(request.params.id); const { status } = request.body; if (!['Paid', 'Pending', 'Overdue'].includes(status)) return response.status(400).json({ error: 'Invalid status' }); try { const oldData = await db.query('SELECT status, leadId FROM payment_installments WHERE id = $1', [id]); if (oldData.rows.length === 0) return response.status(404).json({ error: 'Installment not found' }); const oldStatus = oldData.rows[0].status; const leadId = oldData.rows[0].leadId; await db.query('UPDATE payment_installments SET status = $1 WHERE id = $2', [status, id]); await db.query('INSERT INTO payment_history (installmentId, old_status, new_status) VALUES ($1, $2, $3)', [id, oldStatus, status]); const installments = await db.query('SELECT status FROM payment_installments WHERE leadId = $1', [leadId]); const statuses = installments.rows.map(r => r.status); let newLeadPaymentStatus = 'Pending'; if (statuses.length > 0 && statuses.every(s => s === 'Paid')) newLeadPaymentStatus = 'Paid'; else if (statuses.some(s => s === 'Overdue')) newLeadPaymentStatus = 'Overdue'; await db.query('UPDATE leads SET paymentStatus = $1 WHERE id = $2', [newLeadPaymentStatus, leadId]); response.status(200).json({ message: 'Installment status updated' }); } catch (error) { console.error('Error updating installment status:', error); response.status(500).json({ error: 'Internal Server Error' }); }};

const getAnalytics = async (request, response) => {
    const { startDate, endDate, comparison } = request.query;
    
    const calculateMetricsForPeriod = async (sDate, eDate) => {
        const dateFilter = (sDate && eDate) ? `AND l.dateAdded BETWEEN '${sDate}' AND '${eDate}'` : '';
        
        const pipelineQuery = `SELECT COUNT(*) AS total_open_leads, COALESCE(SUM(l.quotedAmount), 0) AS pipeline_value, COALESCE(AVG(l.quotedAmount), 0) AS avg_deal_size FROM leads l WHERE l.leadStatus NOT IN ('Closed-Won/Customer', 'Closed-Lost') ${dateFilter};`;
        const closedDealsQuery = `SELECT COUNT(CASE WHEN l.leadStatus = 'Closed-Won/Customer' THEN 1 END) AS deals_won, COUNT(CASE WHEN l.leadStatus = 'Closed-Lost' THEN 1 END) AS deals_lost FROM leads l WHERE 1=1 ${dateFilter};`;
        const paymentsQuery = `SELECT (SELECT COALESCE(SUM(amount), 0) FROM payment_installments WHERE status = 'Paid') as total_received, (SELECT COALESCE(SUM(amount), 0) FROM payment_installments WHERE status IN ('Pending', 'Overdue')) as total_pending, (SELECT COALESCE(SUM(l.quotedAmount), 0) FROM leads l WHERE l.leadStatus = 'Closed-Won/Customer' ${dateFilter}) as total_invoiced;`;
        
        const [pipelineResult, closedDealsResult, paymentsResult] = await Promise.all([
            db.query(pipelineQuery), db.query(closedDealsQuery), db.query(paymentsQuery)
        ]);

        return {
            pipelineOverview: { ...pipelineResult.rows[0], ...closedDealsResult.rows[0] },
            paymentsAtAGlance: paymentsResult.rows[0],
        };
    };

    const getSourceAnalysisForPeriod = async (sDate, eDate) => {
        const dateFilter = (sDate && eDate) ? `WHERE l.dateAdded BETWEEN '${sDate}' AND '${eDate}'` : '';
        const query = `SELECT leadSource, COUNT(*) AS total_leads, SUM(CASE WHEN leadStatus = 'Closed-Won/Customer' THEN 1 ELSE 0 END) AS converted_leads, COALESCE(AVG(CASE WHEN leadStatus = 'Closed-Won/Customer' THEN quotedAmount ELSE NULL END), 0) AS avg_order_value FROM leads l ${dateFilter} GROUP BY leadSource ORDER BY total_leads DESC;`;
        const result = await db.query(query);
        return result.rows || [];
    };

    try {
        const currentPeriodData = await calculateMetricsForPeriod(startDate, endDate);
        let previousPeriodData = null;
        let leadSourceCurrent = await getSourceAnalysisForPeriod(startDate, endDate);
        let leadSourcePrevious = [];

        if (comparison !== 'none' && startDate && endDate) {
            const start = new Date(startDate); const end = new Date(endDate); let prevStart, prevEnd;
            if (comparison === 'previous_period') {
                const diff = end.getTime() - start.getTime();
                prevStart = new Date(start.getTime() - diff - (24 * 60 * 60 * 1000));
                prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
            } else if (comparison === 'previous_year') {
                prevStart = new Date(new Date(start).setFullYear(start.getFullYear() - 1));
                prevEnd = new Date(new Date(end).setFullYear(end.getFullYear() - 1));
            }
            if (prevStart && prevEnd) {
                const prevStartDate = prevStart.toISOString().split('T')[0];
                const prevEndDate = prevEnd.toISOString().split('T')[0];
                previousPeriodData = await calculateMetricsForPeriod(prevStartDate, prevEndDate);
                leadSourcePrevious = await getSourceAnalysisForPeriod(prevStartDate, prevEndDate);
            }
        }
        
        // Merge lead source data for easy comparison on the frontend
        const allSources = [...new Set([...leadSourceCurrent.map(s => s.leadsource), ...leadSourcePrevious.map(s => s.leadsource)])];
        const leadSourceAnalysis = allSources.map(source => {
            const current = leadSourceCurrent.find(s => s.leadsource === source) || {};
            const previous = leadSourcePrevious.find(s => s.leadsource === source) || {};
            return {
                leadsource: source,
                current_leads: current.total_leads || 0,
                previous_leads: previous.total_leads || 0,
                current_avg_value: current.avg_order_value || 0,
                previous_avg_value: previous.avg_order_value || 0,
            };
        });

        const upcomingPaymentsQuery = `SELECT p.id, p.amount, p.dueDate, l.companyName, p.status, (p.dueDate - CURRENT_DATE) as days_until_due FROM payment_installments p JOIN leads l ON p.leadId = l.id WHERE p.status IN ('Pending', 'Overdue') ORDER BY p.dueDate ASC LIMIT 10;`;
        const leaderboardQuery = `SELECT leadOwner, COALESCE(SUM(quotedAmount), 0) AS total_sales_value, COUNT(*) AS accounts_won FROM leads l WHERE l.leadStatus = 'Closed-Won/Customer' AND l.dateAdded BETWEEN '${startDate || '1970-01-01'}' AND '${endDate || '2999-12-31'}' GROUP BY leadOwner ORDER BY total_sales_value DESC;`;
        
        const [upcomingPaymentsResult, leaderboardResult] = await Promise.all([
            db.query(upcomingPaymentsQuery), db.query(leaderboardQuery)
        ]);

        response.status(200).json({
            currentPeriod: currentPeriodData,
            previousPeriod: previousPeriodData,
            upcomingPayments: upcomingPaymentsResult.rows || [],
            salesLeaderboard: leaderboardResult.rows || [],
            leadSourceAnalysis: leadSourceAnalysis || [],
        });

    } catch (error) {
        console.error('🔴 Error fetching analytics:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getLeads, createLead, updateLead, deleteLead,
    updateInstallmentStatus, getAnalytics,
};