import React, { useState } from 'react';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

const mockAlerts = [
  { id: 'ALT-001', title: 'Multiple Phones Detected', description: '3 phones detected simultaneously in Classroom 101 during exam period.', severity: 'high', status: 'active', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), classroom: 'Classroom 101' },
  { id: 'ALT-002', title: 'Suspicious Movement', description: 'Student moving between desks repeatedly.', severity: 'medium', status: 'active', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), classroom: 'Classroom 105' },
  { id: 'ALT-003', title: 'Camera Offline', description: 'Camera CAM-04 lost connection.', severity: 'high', status: 'acknowledged', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), classroom: 'Hall A' },
  { id: 'ALT-004', title: 'Unauthorized Material', description: 'Book detected on desk during closed-book exam.', severity: 'medium', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), classroom: 'Lab 2' },
];

const Tabs = ({ tabs, active, onChange }: any) => (
  <div className="flex space-x-1 border-b border-gray-200 mb-6">
    {tabs.map((tab: any) => (
      <button
        key={tab.id}
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
          active === tab.id 
            ? "border-primary-500 text-primary-600" 
            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
        )}
        onClick={() => onChange(tab.id)}
      >
        {tab.label} {tab.count !== undefined && <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{tab.count}</span>}
      </button>
    ))}
  </div>
);

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('active');

  const activeCount = mockAlerts.filter(a => a.status === 'active').length;
  
  const filteredAlerts = mockAlerts.filter(a => a.status === activeTab);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Bell className="w-6 h-6 mr-2 text-primary-600" /> System Alerts
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage and respond to automated system alerts.</p>
      </div>

      <Tabs 
        tabs={[
          { id: 'active', label: 'Active', count: activeCount },
          { id: 'acknowledged', label: 'Acknowledledged' },
          { id: 'resolved', label: 'Resolved' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">All clear</h3>
            <p className="text-gray-500 text-sm">No alerts in this category.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex relative">
              <div className={cn(
                "w-1.5 flex-shrink-0",
                alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
              )}></div>
              
              <div className="p-4 flex-1 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' : alert.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    )}>
                      {alert.severity}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{alert.title}</h3>
                    <span className="text-xs font-mono text-gray-400">{alert.id}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {new Date(alert.timestamp).toLocaleString()}</span>
                    <span>Classroom: <span className="font-medium text-gray-700">{alert.classroom}</span></span>
                  </div>
                </div>
                
                <div className="flex sm:flex-col gap-2">
                  {alert.status === 'active' && (
                    <button className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Acknowledge</button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded hover:bg-primary-700">Resolve</button>
                  )}
                  <button className="px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded hover:bg-primary-50">Investigate</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
