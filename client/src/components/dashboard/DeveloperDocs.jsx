import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ClayCard, ClayBadge, ClayButton } from '../Claymorphic';
import { RefreshCw, Code, AlertTriangle, FileJson, ArrowUpRight } from 'lucide-react';

export default function DeveloperDocs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servicesList, setServicesList] = useState([]);
  const [openapiDoc, setOpenapiDoc] = useState(null);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [codeTab, setCodeTab] = useState('curl');

  const fetchDocsAndServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, docsRes] = await Promise.all([
        api.get('/api/v1/services'),
        api.get('/api/v1/docs')
      ]);

      if (servicesRes.data.success) {
        setServicesList(servicesRes.data.services || []);
        if (servicesRes.data.services && servicesRes.data.services.length > 0) {
          setSelectedApiKey(servicesRes.data.services[0].key);
        }
      } else {
        throw new Error('Failed to retrieve API services.');
      }

      setOpenapiDoc(docsRes.data);
    } catch (err) {
      console.error('Error fetching documentation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to connect to documentation services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocsAndServices();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px] border border-slate-200 bg-white rounded-[24px] shadow-sm text-center">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h4 className="text-base font-bold text-slate-800 font-display">Loading Developer Documentation</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">Fetching service catalogs and OpenAPI specifications from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-16 min-h-[400px] border border-red-200 bg-red-50/20 rounded-[24px] text-center max-w-xl mx-auto gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 font-display">Failed to Load API Documentation</h4>
          <p className="text-xs text-slate-650 mt-1">{error}</p>
        </div>
        <ClayButton variant="primary" onClick={fetchDocsAndServices} className="flex items-center gap-2 py-2 px-5 text-xs font-semibold mt-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Docs
        </ClayButton>
      </div>
    );
  }

  if (servicesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px] border border-slate-200 bg-white rounded-[24px] shadow-sm text-center">
        <Code className="w-12 h-12 text-slate-400 mb-4" />
        <h4 className="text-base font-bold text-slate-800 font-display">No APIs Available</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">The API gateway doesn't list any services currently. Generate key and start testing.</p>
        <ClayButton variant="primary" onClick={fetchDocsAndServices} className="flex items-center gap-2 py-2 px-5 text-xs font-semibold mt-4">
          <RefreshCw className="w-3.5 h-3.5" /> Reload Catalog
        </ClayButton>
      </div>
    );
  }

  const selectedService = servicesList.find(s => s.key === selectedApiKey) || servicesList[0];

  // Generate examples dynamically
  const generateExamples = (service) => {
    const method = service.method || 'GET';
    const endpoint = service.endpoint;
    const key = service.key;
    const inputFields = service.inputFields;

    let curlQuery = '';
    let fetchBody = '';
    let pythonParams = '';
    let nodeBody = '';

    const paramsObj = {};
    inputFields.forEach(f => {
      paramsObj[f.name] = f.placeholder.replace('e.g. ', '');
    });

    const qStr = new URLSearchParams({ api_key: 'vh_live_xxxxxxxxxxxxxxxxx', ...paramsObj }).toString();
    curlQuery = `?${qStr}`;

    const resolvedUrl = endpoint.startsWith('/api/v1') ? `https://authserver.dizipay.in${endpoint}` : `https://authserver.dizipay.in/api/v1${endpoint}`;
    const fullUrlWithParams = `${resolvedUrl}${curlQuery}`;

    const curl = `curl -X GET "${fullUrlWithParams}" \\\n  -H "x-api-key: vh_live_xxxxxxxxxxxxxxxxx"`;

    const node = `const axios = require('axios');\n\naxios.get('${fullUrlWithParams}', {\n  headers: {\n    'x-api-key': 'vh_live_xxxxxxxxxxxxxxxxx'\n  }\n})\n.then(response => console.log(response.data))\n.catch(error => console.error(error));`;

    const fetchCode = `fetch('${fullUrlWithParams}', {\n  method: 'GET',\n  headers: {\n    'x-api-key': 'vh_live_xxxxxxxxxxxxxxxxx'\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));`;

    const python = `import requests\n\nurl = "${fullUrlWithParams}"\nheaders = {\n    "x-api-key": "vh_live_xxxxxxxxxxxxxxxxx"\n}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`;

    return { curl, node, fetchCode, python };
  };

  const codeExamples = generateExamples(selectedService);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full text-left">
      {/* Sidebar - API List */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 font-display">API Endpoint Catalog</span>
        <div className="bg-white border border-slate-200 rounded-[24px] p-4 flex flex-col gap-1 max-h-[600px] overflow-y-auto shadow-sm">
          {servicesList.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedApiKey(service.key)}
              className={`flex items-center justify-between p-3 rounded-2xl text-xs font-semibold font-sans transition-all duration-150 ${
                selectedService.key === service.key
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-650 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-bold text-slate-850 truncate">{service.name}</span>
                <span className="text-[10px] text-slate-450 font-mono mt-0.5 truncate">{service.endpoint}</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                service.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {service.method}
              </span>
            </button>
          ))}
        </div>

        {/* Raw OpenAPI Link */}
        {openapiDoc && (
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-[24px] border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors duration-200 mt-2 text-xs font-semibold text-slate-700 group"
          >
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-emerald-500" />
              <span>Raw OpenAPI JSON Document</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-450 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        )}
      </div>

      {/* Main Documentation Area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <ClayCard className="bg-white border border-slate-200 shadow-sm p-8 rounded-[24px] flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {selectedService.category === 'kyc' ? 'KYC Verification' : 'Verification API'}
              </span>
              <h3 className="text-2xl font-bold font-display text-slate-900">{selectedService.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${
                selectedService.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {selectedService.method}
              </span>
              <ClayBadge>{selectedService.latency || '150ms'}</ClayBadge>
            </div>
          </div>

          {/* Overview */}
          <div>
            <h4 className="text-sm font-bold font-display text-slate-850 mb-1.5">Overview</h4>
            <p className="text-xs text-slate-650 leading-relaxed">
              {selectedService.description}
            </p>
          </div>

          {/* Authentication */}
          <div>
            <h4 className="text-sm font-bold font-display text-slate-850 mb-1.5">Authentication</h4>
            <p className="text-xs text-slate-650 leading-relaxed mb-2">
              This endpoint requires authorization using a workspace API key. Pass the credential via the header parameter:
            </p>
            <pre className="bg-slate-50 border border-slate-200 p-3 rounded-2xl font-mono text-[11px] text-slate-700 select-all">
              x-api-key: vh_live_xxxxxxxxxxxxxxxxx
            </pre>
            <p className="text-[10px] text-slate-450 mt-1">
              Alternatively, Authorization Bearer tokens, or query/body api_key parameters are supported.
            </p>
          </div>

          {/* Parameters */}
          <div>
            <h4 className="text-sm font-bold font-display text-slate-850 mb-2">Request Parameters</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-slate-50 font-bold text-slate-500 p-3 border-b border-slate-200">
                <div className="col-span-3">Field</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Required</div>
                <div className="col-span-5">Description</div>
              </div>
              
              {/* Optional api_key param listing */}
              {selectedService.method === 'GET' && (
                <div className="grid grid-cols-12 p-3 border-b border-slate-100 text-slate-650 items-center">
                  <div className="col-span-3 font-mono font-bold text-emerald-600">api_key</div>
                  <div className="col-span-2">string</div>
                  <div className="col-span-2 text-red-500 font-semibold">Yes</div>
                  <div className="col-span-5">Your Dizipay workspace API key.</div>
                </div>
              )}
              {selectedService.key === 'PAN_TRACK' && (
                <div className="grid grid-cols-12 p-3 border-b border-slate-100 text-slate-650 items-center">
                  <div className="col-span-3 font-mono font-bold text-emerald-600">api_key</div>
                  <div className="col-span-2">string</div>
                  <div className="col-span-2 text-red-500 font-semibold">Yes</div>
                  <div className="col-span-5">Your Dizipay workspace API key.</div>
                </div>
              )}

              {selectedService.inputFields.map((field) => (
                <div key={field.name} className="grid grid-cols-12 p-3 border-b border-slate-100 last:border-0 text-slate-650 items-center">
                  <div className="col-span-3 font-mono font-bold text-slate-850">{field.name}</div>
                  <div className="col-span-2">{field.type || 'string'}</div>
                  <div className="col-span-2 text-red-500 font-semibold">{field.required ? 'Yes' : 'No'}</div>
                  <div className="col-span-5">{field.label}. e.g. {field.placeholder}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Example Request / Response */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold font-display text-slate-850 mb-2">Example Request</h4>
              <pre className="bg-[#0A0F1D] text-[#00C2FF] p-4 rounded-2xl font-mono text-xs overflow-x-auto min-h-[150px]">
                {JSON.stringify(selectedService.sampleRequest, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-slate-850 mb-2">Example Response</h4>
              <pre className="bg-[#0A0F1D] text-[#36FFA1] p-4 rounded-2xl font-mono text-xs overflow-x-auto min-h-[150px] max-h-[300px]">
                {JSON.stringify(selectedService.sampleResponse, null, 2)}
              </pre>
            </div>
          </div>

          {/* Error Responses */}
          <div>
            <h4 className="text-sm font-bold font-display text-slate-850 mb-2">Error Responses</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 border border-slate-200 rounded-2xl">
                <strong className="text-red-500 block mb-0.5">401 Unauthorized</strong>
                <span className="text-slate-500 leading-relaxed">Invalid API Key or token expired. Ensure you are passing a valid credential.</span>
              </div>
              <div className="p-3 border border-slate-200 rounded-2xl">
                <strong className="text-red-500 block mb-0.5">403 Forbidden Scope</strong>
                <span className="text-slate-500 leading-relaxed">Insufficient wallet balance to invoke the service, or API key lacks required service permissions.</span>
              </div>
            </div>
          </div>

          {/* Code Integration Tabs */}
          <div>
            <h4 className="text-sm font-bold font-display text-slate-850 mb-3">Code Integration Examples</h4>
            <div className="flex gap-2 mb-4 border-b border-slate-100 pb-2">
              {[
                { id: 'curl', label: 'cURL' },
                { id: 'node', label: 'Node.js (Axios)' },
                { id: 'fetch', label: 'JS (Fetch)' },
                { id: 'python', label: 'Python (Requests)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCodeTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    codeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <pre className="bg-[#0A0F1D] text-slate-200 p-5 rounded-2xl font-mono text-xs text-left overflow-x-auto select-all leading-relaxed max-h-[300px]">
              {codeTab === 'curl' && codeExamples.curl}
              {codeTab === 'node' && codeExamples.node}
              {codeTab === 'fetch' && codeExamples.fetchCode}
              {codeTab === 'python' && codeExamples.python}
            </pre>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
