// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { format, parseISO } from 'date-fns';

// Import our new components
import DashboardMetrics from './components/DashboardMetrics';
import AddLeadModal from './components/AddLeadModal';

// This is a placeholder for now, but you could move the table into its own file too.
const LeadTable = ({ leads, onEdit, onDelete, onUpdatePayment }) => (
    <div className="card full-width-card">
        <h2>Company List</h2>
        <table>
            <thead>
                <tr>
                    <th>Company / Added</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Quoted Amount</th>
                    <th>Payment Status & Schedule</th>
                    <th>Owner</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {leads.map(lead => (
                    <tr key={lead.id}>
                        <td>
                            <div>{lead.companyname}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {format(parseISO(lead.dateadded), 'dd MMM yyyy')}
                            </div>
                        </td>
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


// Set the base URL for all API requests to our working port
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

function App() {
  const [leads, setLeads] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null); // New state for analytics
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Function to fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [leadsResponse, analyticsResponse] = await Promise.all([
        axios.get(`${API_URL}/leads`),
        axios.get(`${API_URL}/analytics`)
      ]);
      setLeads(leadsResponse.data);
      setAnalyticsData(analyticsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data. Make sure the backend server is running.');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (lead = null) => {
    setLeadToEdit(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLeadToEdit(null);
  };

  const handleSaveLead = async (leadData) => {
    try {
        if (leadToEdit) {
            await axios.put(`${API_URL}/leads/${leadToEdit.id}`, leadData);
        } else {
            await axios.post(`${API_URL}/leads`, leadData);
        }
        fetchData(); // Refresh ALL data
        handleCloseModal();
    } catch (error) {
        console.error('Error saving lead:', error);
        alert('Failed to save lead.');
    }
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
        try {
            await axios.delete(`${API_URL}/leads/${id}`);
            fetchData(); // Refresh ALL data
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead.');
        }
    }
  };

  const handleUpdatePayment = async (installmentId, newStatus) => {
      if(window.confirm(`Mark this payment as ${newStatus}?`)) {
          try {
              await axios.put(`${API_URL}/installments/${installmentId}`, { status: newStatus });
              fetchData(); // Refresh all data to see updates instantly
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
        <div className='header-actions'>
            <button className="add-lead-btn" onClick={() => handleOpenModal()}>+ Add New Lead</button>
        </div>
      </header>

      <main>
        {/* Render our new dashboard component */}
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
