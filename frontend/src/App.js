// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

import DashboardMetrics from './components/DashboardMetrics';
import AddLeadModal from './components/AddLeadModal';

const LeadTable = ({ leads, onEdit, onDelete, onUpdatePayment }) => (
    <div className="card full-width-card">
        <h2>Company List</h2>
        <table>
            <thead>
                <tr><th>Company / Added</th><th>Contact</th><th>Status</th><th>Quoted Amount</th><th>Payment Status & Schedule</th><th>Owner</th><th>Actions</th></tr>
            </thead>
            <tbody>
                {leads.map(lead => (
                    <tr key={lead.id}>
                        <td><div>{lead.companyname}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{format(parseISO(lead.dateadded), 'dd MMM yyyy')}</div></td>
                        <td>{lead.contactperson}</td>
                        <td><span className={`status-badge status-${lead.leadstatus?.toLowerCase().replace(/[\s/]+/g, '-')}`}>{lead.leadstatus}</span></td>
                        <td>{`₹${parseFloat(lead.quotedamount || 0).toLocaleString('en-IN')}`}</td>
                        <td>
                            <div className={`payment-status-${lead.paymentstatus?.toLowerCase()}`}>{lead.paymentstatus}</div>
                            <div style={{ fontSize: '0.75rem' }}>
                                {lead.installments?.map(inst => (
                                    <div key={inst.id} title={`Due: ${format(parseISO(inst.duedate), 'dd MMM')}`}>
                                        <span onClick={() => onUpdatePayment(inst.id, 'Paid')} style={{cursor: 'pointer', textDecoration: inst.status === 'Paid' ? 'line-through' : 'none' }}>
                                            {inst.status === 'Paid' ? '✅' : '⬜'}
                                        </span>
                                        {` ₹${parseFloat(inst.amount).toLocaleString('en-IN')}`}
                                    </div>
                                ))}
                            </div>
                        </td>
                        <td>{lead.leadowner}</td>
                        <td className="action-buttons">
                            <button onClick={() => onEdit(lead)}>✏️</button>
                            <button onClick={() => onDelete(lead.id)}>🗑️</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

function App() {
  const [leads, setLeads] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  
  const [dateRange, setDateRange] = useState('lifetime');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comparison, setComparison] = useState('none');

  const fetchData = useCallback(async () => {
      if ((dateRange === 'custom' && (!startDate || !endDate)) || (dateRange === 'lifetime' && comparison !== 'none')) {
        if (dateRange === 'lifetime' && comparison !== 'none') {
            alert("Please select a specific date range to use the comparison feature.");
            setComparison('none');
        }
        return;
      }
      const params = { startDate, endDate, comparison };
      if (dateRange === 'lifetime') {
        delete params.startDate;
        delete params.endDate;
      }
      try {
        const [leadsResponse, analyticsResponse] = await Promise.all([
          axios.get(`${API_URL}/leads`, { params }),
          axios.get(`${API_URL}/analytics`, { params })
        ]);
        setLeads(leadsResponse.data);
        setAnalyticsData(analyticsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to fetch data. Make sure the backend server is running.');
      }
    }, [startDate, endDate, dateRange, comparison]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (e) => {
    const range = e.target.value;
    setDateRange(range);
    if (range === 'lifetime') setComparison('none');
    const today = new Date();
    let start, end;
    switch(range) {
        case 'this_week': start = startOfWeek(today, { weekStartsOn: 1 }); end = endOfWeek(today, { weekStartsOn: 1 }); break;
        case 'last_week': const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 }); start = lastWeekStart; end = endOfWeek(lastWeekStart, { weekStartsOn: 1 }); break;
        case 'this_month': start = startOfMonth(today); end = endOfMonth(today); break;
        case 'last_month': const lastMonthStart = startOfMonth(subMonths(today, 1)); start = lastMonthStart; end = endOfMonth(lastMonthStart); break;
        case 'last_3_months': start = startOfMonth(subMonths(today, 2)); end = endOfMonth(today); break;
        case 'last_6_months': start = startOfMonth(subMonths(today, 5)); end = endOfMonth(today); break;
        case 'this_year': start = startOfYear(today); end = endOfYear(today); break;
        case 'lifetime': start = ''; end = ''; break;
        case 'custom': start = null; end = null; break;
        default: start = ''; end = '';
    }
    if(range !== 'custom'){
        setStartDate(start ? format(start, 'yyyy-MM-dd') : '');
        setEndDate(end ? format(end, 'yyyy-MM-dd') : '');
    }
  };

  const handleOpenModal = (lead = null) => { setLeadToEdit(lead); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setLeadToEdit(null); };

  // --- THIS IS THE FIX for the modal not closing and data not refreshing ---
  const handleSaveLead = async (leadData) => {
    try {
        if (leadToEdit) { await axios.put(`${API_URL}/leads/${leadToEdit.id}`, leadData); } 
        else { await axios.post(`${API_URL}/leads`, leadData); }
        handleCloseModal(); // This closes the pop-up
        fetchData(); // This refreshes the data
    } catch (error) { console.error('Error saving lead:', error); alert('Failed to save lead.'); }
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
        try {
            await axios.delete(`${API_URL}/leads/${id}`);
            fetchData(); // This refreshes the data
        } catch (error) { console.error('Error deleting lead:', error); alert('Failed to delete lead.'); }
    }
  };

  const handleUpdatePayment = async (installmentId, newStatus) => {
      if(window.confirm(`Mark this payment as ${newStatus}?`)) {
          try {
              await axios.put(`${API_URL}/installments/${installmentId}`, { status: newStatus });
              fetchData(); // This refreshes the data
          } catch(error) {
              console.error('Error updating payment status:', error);
              alert('Failed to update payment status.');
          }
      }
  };

  return (
    <div className="App">
      <header>
        <h1>Balki Enterprises Sales Dashboard</h1>
        <div className="filters">
            <select value={dateRange} onChange={handleDateChange}>
                <option value="lifetime">Lifetime</option>
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Range</option>
            </select>
            <select value={comparison} onChange={(e) => setComparison(e.target.value)} disabled={dateRange === 'lifetime'}>
                <option value="none">Compare to...</option>
                <option value="previous_period">Previous Period</option>
                <option value="previous_year">Previous Year</option>
            </select>
            {dateRange === 'custom' && (
                <>
                    <input type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
                    <span>to</span>
                    <input type="date" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} />
                </>
            )}
             <button className="add-lead-btn" onClick={() => handleOpenModal()}>+ Add New Lead</button>
        </div>
      </header>
      <main>
        <DashboardMetrics analyticsData={analyticsData} />
        <LeadTable 
            leads={leads} 
            onEdit={handleOpenModal} 
            onDelete={handleDeleteLead} 
            onUpdatePayment={handleUpdatePayment}
        />
      </main>
      <AddLeadModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLead}
        leadToEdit={leadToEdit}
      />
    </div>
  );
}

export default App;
