import React, { useState } from 'react';
import { FileBarChart, Download, Printer, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileBarChart className="w-6 h-6 mr-2 text-primary-600" /> Reports
        </h1>
        <p className="text-sm text-gray-500 mt-1">Generate and export analytics reports.</p>
      </div>

      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <select 
            className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="daily">Daily Summary</option>
            <option value="weekly">Weekly Incident Report</option>
            <option value="classroom">Classroom Utilization</option>
            <option value="system">System Health</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <input type="date" className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
          <select className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500">
            <option>All Classrooms</option>
            <option>Hall A</option>
            <option>Room 101</option>
          </select>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center h-[38px]">
          <Filter className="w-4 h-4 mr-2" /> Generate Report
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 min-h-[400px]">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 capitalize">{reportType} Report</h2>
            <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200" title="Export PDF">
              <FileBarChart className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200" title="Export CSV">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200" title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">Total Events</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">1,284</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">Critical Alerts</p>
            <p className="text-3xl font-bold text-red-600 mt-1">12</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">Active Cameras</p>
            <p className="text-3xl font-bold text-primary-600 mt-1">45/48</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg h-64 flex items-center justify-center text-gray-400">
          [ Chart Visualization Placeholder ]
        </div>
      </div>
    </div>
  );
}
