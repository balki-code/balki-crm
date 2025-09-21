// backend/queries.js
const db = require('./db');

// Helper function to parse the payment schedule string
const parsePaymentSchedule = (scheduleString) => {
    if (!scheduleString) return [];
    return scheduleString.split(';').map(item => {
        const amountMatch = item.match(/Amount: ([\d.]+)/);
        const dueDateMatch = item.match(/Due: ([\d-]+)/);
        const statusMatch = item.match(/Status: (\w+)/);
        
        if (amountMatch && dueDateMatch && statusMatch) {
            return {
                amount: parseFloat(amountMatch[1]),
                dueDate: dueDateMatch[1],
                status: statusMatch[1]
            };
        }
        return null;
    }).filter(Boolean); // Filter out any null entries from parsing errors
};

// Get all leads with their installments
const getLeads = async (request, response) => {
    try {
        // Check for overdue payments and update them first
        await db.query(`
            UPDATE payment_installments
            SET status = 'Overdue'
            WHERE dueDate < CURRENT_DATE AND status = 'Pending';
        `);
        
        // Now fetch all leads
        const results = await db.query(`
            SELECT
                l.*,
                (
                    SELECT json_agg(pi.* ORDER BY pi.dueDate ASC)
                    FROM payment_installments pi
                    WHERE pi.leadId = l.id
                ) as installments
            FROM leads l
            ORDER BY l.dateAdded DESC
        `);
        response.status(200).json(results.rows);
    } catch (error) {
        console.error('Error fetching leads:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// Add a new lead
const createLead = async (request, response) => {
    try {
        const {
            dateAdded, companyName, contactPerson, contactInfo, leadSource,
            leadStatus, leadOwner, nextFollowUpDate, proposalStatus,
            quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon,
            paymentSchedule // This is the array of installment objects from the frontend
        } = request.body;
    
        // Convert the installment array back to the CSV-compatible string format
        const paymentScheduleString = paymentSchedule.map(p => 
            // --- FIX IS HERE: Added parseFloat() ---
            `[Amount: ${parseFloat(p.amount).toFixed(2)}, Due: ${p.dueDate}, Status: ${p.status}]`
        ).join('; ');
    
        const client = await db.query('BEGIN'); // Start a transaction
    
        const leadQuery = `
            INSERT INTO leads (dateAdded, companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentSchedule)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id;
        `;
        const leadValues = [dateAdded, companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner, nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon, paymentScheduleString];
        
        const newLead = await db.query(leadQuery, leadValues);
        const leadId = newLead.rows[0].id;

        // Insert installments
        if (paymentSchedule && paymentSchedule.length > 0) {
            const installmentQuery = `
                INSERT INTO payment_installments (leadId, amount, dueDate, status)
                VALUES ($1, $2, $3, $4);
            `;
            for (const installment of paymentSchedule) {
                await db.query(installmentQuery, [leadId, installment.amount, installment.dueDate, installment.status]);
            }
        }

        await db.query('COMMIT'); // Commit the transaction
        response.status(201).json({ message: 'Lead created successfully', id: leadId });
    } catch (error) {
        await db.query('ROLLBACK'); // Rollback on error
        console.error('Error creating lead:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update an existing lead
const updateLead = async (request, response) => {
    try {
        const id = parseInt(request.params.id);
        const {
            companyName, contactPerson, contactInfo, leadSource,
            leadStatus, leadOwner, nextFollowUpDate, proposalStatus,
            quotedAmount, paymentStatus, notes, reasonForLossWin, dateWon,
            paymentSchedule // This is the array of installment objects
        } = request.body;
    
        const paymentScheduleString = paymentSchedule.map(p => 
            // --- FIX IS HERE: Added parseFloat() ---
            `[Amount: ${parseFloat(p.amount).toFixed(2)}, Due: ${p.dueDate}, Status: ${p.status}]`
        ).join('; ');
    
        const client = await db.query('BEGIN');
    
        const leadQuery = `
            UPDATE leads
            SET companyName = $1, contactPerson = $2, contactInfo = $3, leadSource = $4, leadStatus = $5,
                leadOwner = $6, nextFollowUpDate = $7, proposalStatus = $8, quotedAmount = $9,
                paymentStatus = $10, notes = $11, reasonForLossWin = $12, dateWon = $13, paymentSchedule = $14
            WHERE id = $15;
        `;
        const leadValues = [
            companyName, contactPerson, contactInfo, leadSource, leadStatus, leadOwner,
            nextFollowUpDate, proposalStatus, quotedAmount, paymentStatus, notes, reasonForLossWin,
            dateWon, paymentScheduleString, id
        ];
        await db.query(leadQuery, leadValues);

        // Delete old installments for this lead
        await db.query('DELETE FROM payment_installments WHERE leadId = $1', [id]);

        // Insert new installments
        if (paymentSchedule && paymentSchedule.length > 0) {
            const installmentQuery = `
                INSERT INTO payment_installments (leadId, amount, dueDate, status)
                VALUES ($1, $2, $3, $4);
            `;
            for (const installment of paymentSchedule) {
                await db.query(installmentQuery, [id, installment.amount, installment.dueDate, installment.status]);
            }
        }

        await db.query('COMMIT');
        response.status(200).send(`Lead modified with ID: ${id}`);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating lead:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// Delete a lead
const deleteLead = async (request, response) => {
    const id = parseInt(request.params.id);

    try {
        // ON DELETE CASCADE in the schema will handle deleting linked installments
        await db.query('DELETE FROM leads WHERE id = $1', [id]);
        response.status(200).send(`Lead deleted with ID: ${id}`);
    } catch (error) {
        console.error('Error deleting lead:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update an installment status
const updateInstallmentStatus = async (request, response) => {
    const id = parseInt(request.params.id);
    const { status } = request.body;

    if (!['Paid', 'Pending', 'Overdue'].includes(status)) {
        return response.status(400).json({ error: 'Invalid status' });
    }

    try {
        // First, get the old status for logging
        const oldData = await db.query('SELECT status, leadId FROM payment_installments WHERE id = $1', [id]);
        if (oldData.rows.length === 0) {
            return response.status(404).json({ error: 'Installment not found' });
        }
        const oldStatus = oldData.rows[0].status;
        const leadId = oldData.rows[0].leadId;

        // Update the status
        await db.query('UPDATE payment_installments SET status = $1 WHERE id = $2', [status, id]);
        
        // Log the change in payment_history
        await db.query(
            'INSERT INTO payment_history (installmentId, old_status, new_status) VALUES ($1, $2, $3)',
            [id, oldStatus, status]
        );

        // After updating an installment, we should re-calculate the overall lead's paymentStatus
        const installments = await db.query('SELECT status FROM payment_installments WHERE leadId = $1', [leadId]);
        const statuses = installments.rows.map(r => r.status);
        
        let newLeadPaymentStatus = 'Pending';
        if (statuses.length > 0 && statuses.every(s => s === 'Paid')) {
            newLeadPaymentStatus = 'Paid';
        } else if (statuses.some(s => s === 'Overdue')) {
            newLeadPaymentStatus = 'Overdue';
        }
        
        await db.query('UPDATE leads SET paymentStatus = $1 WHERE id = $2', [newLeadPaymentStatus, leadId]);

        response.status(200).json({ message: 'Installment status updated' });
    } catch (error) {
        console.error('Error updating installment status:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// --- ANALYTICS FUNCTION ---
const getAnalytics = async (request, response) => {
    try {
        // Pipeline Overview
        const pipelineQuery = `
            SELECT
                COUNT(*) AS total_open_leads,
                COALESCE(SUM(quotedAmount), 0) AS pipeline_value,
                (SELECT COUNT(*) FROM leads WHERE leadStatus = 'Closed-Won/Customer') AS deals_won,
                (SELECT COUNT(*) FROM leads WHERE leadStatus = 'Closed-Lost') AS deals_lost,
                COALESCE(AVG(quotedAmount), 0) AS avg_deal_size
            FROM leads
            WHERE leadStatus NOT IN ('Closed-Won/Customer', 'Closed-Lost');
        `;
        const pipelineResult = await db.query(pipelineQuery);

        // Payments at a Glance
        const paymentsQuery = `
            SELECT
                COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS total_received,
                COALESCE(SUM(CASE WHEN status IN ('Pending', 'Overdue') THEN amount ELSE 0 END), 0) AS total_pending,
                COALESCE((SELECT SUM(quotedAmount) FROM leads WHERE leadStatus = 'Closed-Won/Customer'), 0) AS total_invoiced
            FROM payment_installments;
        `;
        const paymentsResult = await db.query(paymentsQuery);

        // Upcoming Payments
        const upcomingPaymentsQuery = `
            SELECT p.id, p.amount, p.dueDate, l.companyName, p.status, (p.dueDate - CURRENT_DATE) as days_until_due
            FROM payment_installments p
            JOIN leads l ON p.leadId = l.id
            WHERE p.status IN ('Pending', 'Overdue')
            ORDER BY p.dueDate ASC
            LIMIT 10;
        `;
        const upcomingPaymentsResult = await db.query(upcomingPaymentsQuery);

        // Sales Leaderboard
        const leaderboardQuery = `
            SELECT
                leadOwner,
                COALESCE(SUM(quotedAmount), 0) AS total_sales_value,
                COUNT(*) AS accounts_won
            FROM leads
            WHERE leadStatus = 'Closed-Won/Customer'
            GROUP BY leadOwner
            ORDER BY total_sales_value DESC;
        `;
        const leaderboardResult = await db.query(leaderboardQuery);

        // Lead Source Analysis
        const leadSourceQuery = `
            SELECT
                leadSource,
                COUNT(*) AS total_leads,
                SUM(CASE WHEN leadStatus = 'Closed-Won/Customer' THEN 1 ELSE 0 END) AS converted_leads,
                COALESCE(AVG(CASE WHEN leadStatus = 'Closed-Won/Customer' THEN quotedAmount ELSE NULL END), 0) AS avg_order_value
            FROM leads
            GROUP BY leadSource
            ORDER BY total_leads DESC;
        `;
        const leadSourceResult = await db.query(leadSourceQuery);

        const analyticsData = {
            pipelineOverview: pipelineResult.rows[0],
            paymentsAtAGlance: paymentsResult.rows[0],
            upcomingPayments: upcomingPaymentsResult.rows,
            salesLeaderboard: leaderboardResult.rows,
            leadSourceAnalysis: leadSourceResult.rows,
        };

        response.status(200).json(analyticsData);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
};

// Export all the functions
module.exports = {
    getLeads,
    createLead,
    updateLead,
    deleteLead,
    updateInstallmentStatus,
    getAnalytics,
};
