import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, X, Edit2 } from 'lucide-react';

const RectifyMistake2Page = () => {
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRows, setEditingRows] = useState({});
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [submittedRows, setSubmittedRows] = useState(new Set());

  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const SHEET_NAME = "ACCOUNTS";

  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';
    
    try {
      let date;
      
      if (!isNaN(dateString) && parseFloat(dateString) > 30000) {
        const serialNumber = parseFloat(dateString);
        date = new Date((serialNumber - 25569) * 86400 * 1000);
      }
      else if (dateString.includes('/') || dateString.includes('-')) {
        date = new Date(dateString);
      }
      else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const getCellValue = (row, colIndex) => {
    const cell = row.c?.[colIndex];
    if (!cell) return null;
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return null;
  };

  const calculateDelayDays = (timestampString) => {
    if (!timestampString || timestampString === '' || timestampString === '-') return 0;
    
    try {
      let originalDate;
      
      if (!isNaN(timestampString) && parseFloat(timestampString) > 30000) {
        const serialNumber = parseFloat(timestampString);
        originalDate = new Date((serialNumber - 25569) * 86400 * 1000);
      } else if (timestampString.includes('/') || timestampString.includes('-')) {
        originalDate = new Date(timestampString);
      } else {
        originalDate = new Date(timestampString);
      }
      
      if (isNaN(originalDate.getTime())) {
        return 0;
      }
      
      const currentDate = new Date();
      const timeDifference = currentDate.getTime() - originalDate.getTime();
      const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
      
      return Math.max(0, daysDifference);
      
    } catch (error) {
      console.error('Error calculating delay:', error);
      return 0;
    }
  };

  const initializeFormData = (rowId) => {
    const formKey = `rectify2_${rowId}`;
    
    setFormData(prev => ({
      ...prev,
      [formKey]: {
        status: 'Not Done',
        remarks: ''
      }
    }));
  };

  const handleFormChange = (rowId, field, value) => {
    const formKey = `rectify2_${rowId}`;
    setFormData(prev => ({
      ...prev,
      [formKey]: {
        ...prev[formKey],
        [field]: value
      }
    }));
  };

  const submitFormData = async (rowId) => {
    const formKey = `rectify2_${rowId}`;
    const data = formData[formKey];
    
    if (!data) {
      alert('No form data to submit');
      return;
    }

    const row = accountsData.find(r => r.id === rowId);
    if (!row || !row.liftNumber) {
      alert('Error: Could not find lift number for this row');
      return;
    }

    setSubmitting(prev => ({ ...prev, [formKey]: true }));

    try {
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec';
      
      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      const delayDays = calculateDelayDays(row.timestamp);
      
      const submitFormData = {
        actual: actualDateTime,
        delay: String(delayDays),
        status: data.status || 'Not Done',
        remarks: data.remarks || ''
      };

      const requestData = {
        action: 'submitForm',
        sheetName: 'ACCOUNTS',
        liftNo: row.liftNumber,
        type: 'rectify-mistake-2',
        formData: JSON.stringify(submitFormData)
      };

      const formDataToSend = new FormData();
      Object.keys(requestData).forEach(key => {
        formDataToSend.append(key, requestData[key]);
      });

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: formDataToSend,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        const responseLower = responseText.toLowerCase();
        const successIndicators = ['success', 'updated', 'submitted', 'complete', 'true'];
        const errorIndicators = ['error', 'failed', 'exception', 'false'];
        
        const hasSuccess = successIndicators.some(indicator => responseLower.includes(indicator));
        const hasError = errorIndicators.some(indicator => responseLower.includes(indicator));
        
        if (hasError && !hasSuccess) {
          throw new Error(`Apps Script error: ${responseText}`);
        } else {
          result = { success: true, message: 'Form submitted successfully' };
        }
      }

      if (result.success === false || (result.error && !result.success)) {
        throw new Error(result.error || result.message || 'Form submission failed');
      }

      setSubmittedRows(prev => new Set([...prev, `rectify2_${rowId}`]));
      setEditingRows(prev => ({ ...prev, [formKey]: false }));
      
      alert(`SUCCESS: Form submitted successfully for Lift Number: ${row.liftNumber}\nActual Date: ${actualDateTime}\nDelay: ${delayDays} days`);
      
      setTimeout(() => {
        fetchData();
      }, 2000);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert(`SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(prev => ({ ...prev, [formKey]: false }));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&cb=${new Date().getTime()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
      }
      
      let text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format from Google Sheets.");
      }
      
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      
      if (!data.table || !data.table.rows) {
        setAccountsData([]);
        return;
      }

      let parsedData = data.table.rows.map((row, index) => {
        if (!row || !row.c) return null;
        
        const firstCellValue = getCellValue(row, 0);
        const secondCellValue = getCellValue(row, 1);
        
        if (firstCellValue === 'Timestamp' || 
            firstCellValue === 'Rectify The Mistake & Bilty Add' ||
            secondCellValue === 'Lift Number' ||
            !firstCellValue || firstCellValue === '') {
          return null;
        }
        
        const rowData = {
          id: index,
          timestamp: formatDate(getCellValue(row, 0)) || '',
          liftNumber: getCellValue(row, 1) || '',
          type: getCellValue(row, 2) || '',
          billNo: getCellValue(row, 3) || '',
          partyName: getCellValue(row, 4) || '',
          productName: getCellValue(row, 5) || '',
          qty: getCellValue(row, 6) || '',
          transporterName: getCellValue(row, 9) || ''
        };
        
        const hasData = Object.values(rowData).some(value => 
          value && value !== '' && value !== index
        );
        
        return hasData ? rowData : null;
      }).filter(Boolean);
      
      parsedData = parsedData.filter(item => {
        const submittedKey = `rectify2_${item.id}`;
        return !submittedRows.has(submittedKey);
      });
      
      setAccountsData(parsedData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderEditableForm = (row) => {
    const formKey = `rectify2_${row.id}`;
    const isEditing = editingRows[formKey];
    const isSubmitting = submitting[formKey];
    const currentFormData = formData[formKey] || {};

    if (!isEditing) {
      return (
        <button
          onClick={() => {
            setEditingRows(prev => ({ ...prev, [formKey]: true }));
            initializeFormData(row.id);
          }}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          Add Entry
        </button>
      );
    }

    return (
      <div className="bg-gray-50 border border-gray-300 rounded-md p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Status</label>
            <select
              value={currentFormData.status || 'Not Done'}
              onChange={(e) => handleFormChange(row.id, 'status', e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="Done">Done</option>
              <option value="Not Done">Not Done</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Remarks</label>
            <textarea
              value={currentFormData.remarks || ''}
              onChange={(e) => handleFormChange(row.id, 'remarks', e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter remarks..."
              rows={2}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
          <button
            onClick={() => setEditingRows(prev => ({ ...prev, [formKey]: false }))}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => submitFormData(row.id)}
            disabled={isSubmitting}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Save className="w-3 h-3 mr-1" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
          <div className="flex items-center">
            <X className="w-6 h-6 text-red-500 mr-2 flex-shrink-0" />
            <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
          </div>
          <div className="mt-2 text-red-700">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-red-100 p-3 rounded mt-2 overflow-auto">
              {error}
            </pre>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border mb-4">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900">Rectify The Mistake 2</h3>
              <p className="text-sm text-gray-600 mt-1">Secondary correction and verification process</p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
        <div className="px-4 py-3">
          <span className="text-sm text-gray-600">
            Showing {accountsData.length} records available for secondary rectification
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lift Number</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accountsData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No records available for secondary rectification
                  </td>
                </tr>
              ) : (
                accountsData.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.timestamp || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.liftNumber || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.type || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.billNo || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.partyName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.productName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.qty || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.transporterName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderEditableForm(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RectifyMistake2Page;