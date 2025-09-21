// src/components/AddLeadModal.js
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const AddLeadModal = ({ isOpen, onClose, onSave, leadToEdit }) => {
  const getInitialState = () => ({
    companyName: '',
    contactPerson: '',
    contactInfo: '',
    leadSource: 'SEO/Website',
    leadStatus: 'MQL',
    leadOwner: 'Owner1',
    proposalStatus: 'Pending',
    quotedAmount: 0,
    nextFollowUpDate: format(new Date(), 'yyyy-MM-dd'),
    paymentStatus: 'Pending',
    notes: '',
    reasonForLossWin: '',
    dateWon: null,
    paymentSchedule: [{ amount: 0, dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' }]
  });

  const [leadData, setLeadData] = useState(getInitialState());

  useEffect(() => {
    if (leadToEdit) {
        // If editing, populate the form. The paymentSchedule needs careful handling.
        const schedule = leadToEdit.installments ? leadToEdit.installments.map(inst => ({
            amount: inst.amount,
            dueDate: format(new Date(inst.duedate), 'yyyy-MM-dd'),
            status: inst.status
        })) : [];

        setLeadData({
            companyName: leadToEdit.companyname || '',
            contactPerson: leadToEdit.contactperson || '',
            contactInfo: leadToEdit.contactinfo || '',
            leadSource: leadToEdit.leadsource || 'SEO/Website',
            leadStatus: leadToEdit.leadstatus || 'MQL',
            leadOwner: leadToEdit.leadowner || 'Owner1',
            proposalStatus: leadToEdit.proposalstatus || 'Pending',
            quotedAmount: parseFloat(leadToEdit.quotedamount) || 0,
            nextFollowUpDate: leadToEdit.nextfollowupdate ? format(new Date(leadToEdit.nextfollowupdate), 'yyyy-MM-dd') : '',
            paymentStatus: leadToEdit.paymentstatus || 'Pending',
            notes: leadToEdit.notes || '',
            reasonForLossWin: leadToEdit.reasonforlosswin || '',
            dateWon: leadToEdit.datewon ? format(new Date(leadToEdit.datewon), 'yyyy-MM-dd') : null,
            paymentSchedule: schedule.length > 0 ? schedule : getInitialState().paymentSchedule
        });
    } else {
        setLeadData(getInitialState());
    }
  }, [leadToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLeadData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleScheduleChange = (index, e) => {
    const { name, value } = e.target;
    const newSchedule = [...leadData.paymentSchedule];
    newSchedule[index][name] = value;
    setLeadData(prev => ({ ...prev, paymentSchedule: newSchedule }));
  };

  const addInstallment = () => {
    if (leadData.paymentSchedule.length < 3) {
        setLeadData(prev => ({
            ...prev,
            paymentSchedule: [
                ...prev.paymentSchedule,
                { amount: 0, dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' }
            ]
        }));
    }
  };

  const removeInstallment = (index) => {
    if (leadData.paymentSchedule.length > 1) {
        const newSchedule = leadData.paymentSchedule.filter((_, i) => i !== index);
        setLeadData(prev => ({ ...prev, paymentSchedule: newSchedule }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalInstallmentAmount = leadData.paymentSchedule.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
    if (totalInstallmentAmount !== parseFloat(leadData.quotedAmount)) {
        alert(`The sum of installments (₹${totalInstallmentAmount.toLocaleString('en-IN')}) does not match the Quoted Amount (₹${parseFloat(leadData.quotedAmount).toLocaleString('en-IN')}). Please correct it.`);
        return;
    }

    // Prepare data for the backend
    const submissionData = {
        ...leadData,
        dateAdded: leadToEdit ? leadToEdit.dateadded : format(new Date(), 'yyyy-MM-dd'),
        dateWon: leadData.leadStatus === 'Closed-Won/Customer' ? (leadData.dateWon || format(new Date(), 'yyyy-MM-dd')) : null,
    };
    onSave(submissionData);
  };
  
  if (!isOpen) return null;

  const totalInstallments = leadData.paymentSchedule.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
  const isAmountMismatch = totalInstallments !== parseFloat(leadData.quotedAmount);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{leadToEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
            <button type="button" className="close-button" onClick={onClose}>&times;</button>
          </div>

          <div className="form-grid">
            {/* Form fields... */}
            <div className="form-group">
              <label>Company Name</label>
              <input name="companyName" value={leadData.companyName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Contact Person</label>
              <input name="contactPerson" value={leadData.contactPerson} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Contact Info</label>
              <input name="contactInfo" value={leadData.contactInfo} onChange={handleChange} />
            </div>
             <div className="form-group">
                <label>Lead Source</label>
                <select name="leadSource" value={leadData.leadSource} onChange={handleChange}>
                    <option>Cold Calling</option>
                    <option>Referral</option>
                    <option>Social Media</option>
                    <option>SEO/Website</option>
                    <option>Email Marketing</option>
                </select>
            </div>
            <div className="form-group">
                <label>Lead Status</label>
                <select name="leadStatus" value={leadData.leadStatus} onChange={handleChange}>
                    <option>MQL</option>
                    <option>SQL</option>
                    <option>Opportunity/Proposal Development</option>
                    <option>Negotiation/Awaiting Decision</option>
                    <option>Closed-Won/Customer</option>
                    <option>Closed-Lost</option>
                </select>
            </div>
             <div className="form-group">
                <label>Lead Owner</label>
                <select name="leadOwner" value={leadData.leadOwner} onChange={handleChange}>
                    <option>Owner1</option>
                    <option>Owner2</option>
                    <option>Owner3</option>
                </select>
            </div>
             <div className="form-group">
              <label>Quoted Amount (₹)</label>
              <input type="number" name="quotedAmount" value={leadData.quotedAmount} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Next Follow-up Date</label>
              <input type="date" name="nextFollowUpDate" value={leadData.nextFollowUpDate} onChange={handleChange} />
            </div>
          </div>

          <div className="payment-schedule-creator full-span" style={{marginTop: '20px'}}>
            <h3>Payment Schedule</h3>
            {leadData.paymentSchedule.map((inst, index) => (
                <div className="installment-row" key={index}>
                    <input type="number" placeholder="Amount (₹)" name="amount" value={inst.amount} onChange={(e) => handleScheduleChange(index, e)} required />
                    <input type="date" name="dueDate" value={inst.dueDate} onChange={(e) => handleScheduleChange(index, e)} required />
                    <select name="status" value={inst.status} onChange={(e) => handleScheduleChange(index, e)}>
                        <option>Pending</option>
                        <option>Paid</option>
                    </select>
                    <button type="button" onClick={() => removeInstallment(index)} style={{background: 'none', border: 'none', cursor: 'pointer'}}>🗑️</button>
                </div>
            ))}
            {leadData.paymentSchedule.length < 3 && <button type="button" onClick={addInstallment}>+ Add Installment</button>}
            <div style={{ marginTop: '10px', fontWeight: 'bold', color: isAmountMismatch ? 'red' : 'green' }}>
                Total of Installments: ₹{totalInstallments.toLocaleString('en-IN')} / Quoted: ₹{parseFloat(leadData.quotedAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className='add-lead-btn'>Save Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
