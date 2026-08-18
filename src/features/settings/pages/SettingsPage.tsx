import { Settings, Cpu, HardDrive, Shield, Mail } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-primary-600" /> Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure global system parameters and AI engine settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          <button className="w-full text-left px-4 py-2 bg-primary-50 text-primary-700 font-medium rounded-md">General & System</button>
          <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 font-medium rounded-md">AI Engine</button>
          <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 font-medium rounded-md">Notifications</button>
          <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 font-medium rounded-md">Security</button>
        </div>
        
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">System Health</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center">
                <Cpu className="w-8 h-8 text-blue-500 mr-4" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium">GPU Utilization</span><span>78%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: '78%'}}></div></div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center">
                <HardDrive className="w-8 h-8 text-indigo-500 mr-4" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium">Storage Space</span><span>45%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{width: '45%'}}></div></div>
                </div>
              </div>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-3">General Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
                <input type="text" className="w-full max-w-md border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500" defaultValue="ClassroomGuard Main Instance" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Retention Period (Days)</label>
                <input type="number" className="w-full max-w-md border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500" defaultValue="30" />
              </div>
              <div className="pt-4">
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
