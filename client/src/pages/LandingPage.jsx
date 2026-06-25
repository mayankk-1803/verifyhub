import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Code, CheckCircle, HelpCircle, Layers, BarChart, Server, Cpu, Globe, Key, BookOpen, HeartHandshake } from 'lucide-react';
import { ClayCard, ClayButton, ClayInput, ClayBadge } from '../components/Claymorphic';
import api from '../lib/api';
const axios = api;
import gsap from 'gsap';

const getPlaceholderForField = (fieldName, labelText) => {
  const name = (fieldName || '').toLowerCase();
  const label = (labelText || '').toLowerCase();
  if (name.includes('gst')) return 'Enter GST Number';
  if (name.includes('pan_no') || name.includes('pan_number') || name.includes('pan')) return 'Enter PAN Number';
  if (name.includes('aadhaar')) return 'Enter Aadhaar Number';
  if (name.includes('otp')) return 'Enter OTP';
  if (name.includes('ration')) return 'Enter Ration Card Number';
  if (name.includes('epic') || name.includes('voter')) return 'Enter Voter ID';
  if (name.includes('application')) return 'Enter Application Number';
  if (name.includes('encdata') || name.includes('enc_data')) return 'Paste Encoded Data';
  return `Enter ${labelText || fieldName}`;
};

const defaultApisCatalog = [
  {
    id: 'def-1',
    name: 'GST Verification',
    category: 'kyc',
    key: 'GST_VERIFY',
    method: 'GET',
    endpoint: '/api/v1/gst/verify',
    desc: 'Verify corporate GSTIN tax filings, status, legal name, and registered addresses.',
    latency: '200ms',
    success: '99.8%',
    inputFields: [
      { name: 'gst', label: 'Corporate GSTIN', placeholder: 'e.g. 29AACCF1132H2ZX', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-2',
    name: 'PAN to GST Verify',
    category: 'kyc',
    key: 'PAN_TO_GST',
    method: 'GET',
    endpoint: '/api/v1/pan-to-gst/verify',
    desc: 'Retrieve and search all registered GSTIN identifier numbers linked to a specific PAN card.',
    latency: '220ms',
    success: '99.8%',
    inputFields: [
      { name: 'pan', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-3',
    name: 'Aadhaar Verify v1 (Send OTP)',
    category: 'kyc',
    key: 'AADHAAR',
    method: 'GET',
    endpoint: '/api/v1/aadhaar/verify',
    desc: 'Initiate Aadhaar card verification by sending a secure OTP to the registered mobile number.',
    latency: '250ms',
    success: '99.5%',
    inputFields: [
      { name: 'aadhaar', label: 'Aadhaar Card Number', placeholder: 'e.g. 123456789012', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-4',
    name: 'Aadhaar Get Data',
    category: 'kyc',
    key: 'AADHAAR_OTP',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-otp/verify',
    desc: 'Submit Aadhaar OTP code to retrieve verified citizen demographics, address, and profile details.',
    latency: '300ms',
    success: '99.5%',
    inputFields: [
      { name: 'application_no', label: 'Application Number', placeholder: 'e.g. app_12345', required: true, type: 'text' },
      { name: 'aadhaar_no', label: 'Aadhaar Number', placeholder: 'e.g. 123456789012', required: true, type: 'text' },
      { name: 'otp', label: 'One-Time Password (OTP)', placeholder: 'e.g. 123456', required: false, type: 'text' }
    ]
  },
  {
    id: 'def-5',
    name: 'PAN Verification',
    category: 'kyc',
    key: 'PAN_CARD',
    method: 'GET',
    endpoint: '/api/v1/pan/verify',
    desc: 'Verify PAN card details against national database and fetch matching holder name.',
    latency: '145ms',
    success: '99.9%',
    inputFields: [
      { name: 'pan_number', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-6',
    name: 'Aadhaar to PAN Lookup',
    category: 'kyc',
    key: 'AADHAAR_PAN',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-pan/verify',
    desc: 'Verify linked status and cross-match credentials between Aadhaar and PAN documents.',
    latency: '280ms',
    success: '99.6%',
    inputFields: [
      { name: 'aadhaar', label: 'Aadhaar Card Number', placeholder: 'e.g. 123456789012', required: true, type: 'text' },
      { name: 'pan', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-7',
    name: 'PAN Verification Advanced',
    category: 'government',
    key: 'PAN_VERIFICATION',
    method: 'GET',
    endpoint: '/api/v1/pan-verification/verify',
    desc: 'Execute standard validation checks on a PAN card for corporate compliance audits.',
    latency: '150ms',
    success: '99.9%',
    inputFields: [
      { name: 'pan_no', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' },
      { name: 'application_no', label: 'Application Number', placeholder: 'e.g. app_12345', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-8',
    name: 'PAN Decode',
    category: 'government',
    key: 'PAN_DECODE',
    method: 'GET',
    endpoint: '/api/v1/pan-decode/verify',
    desc: 'Decode detailed registries for cardholder category, issuing authority, and profile logs.',
    latency: '120ms',
    success: '99.9%',
    inputFields: [
      { name: 'encData', label: 'Encrypted Data', placeholder: 'e.g. base64_string', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-9',
    name: 'Short PAN',
    category: 'government',
    key: 'PAN_SHORT',
    method: 'GET',
    endpoint: '/api/v1/pan-short/verify',
    desc: 'Verify minimal active/inactive validation parameters on target PAN profiles rapidly.',
    latency: '90ms',
    success: '99.9%',
    inputFields: [
      { name: 'pan', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-10',
    name: 'PAN Basic',
    category: 'government',
    key: 'PAN_BASIC',
    method: 'GET',
    endpoint: '/api/v1/pan-basic/verify',
    desc: 'Check active status and basic validation metrics on PAN database records.',
    latency: '80ms',
    success: '99.9%',
    inputFields: [
      { name: 'pan', label: 'PAN Card Number', placeholder: 'e.g. ABCDE1234F', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-11',
    name: 'Ration Verification',
    category: 'government',
    key: 'RATION',
    method: 'GET',
    endpoint: '/api/v1/ration-verify',
    desc: 'Verify Ration card active status, scheme types, address, and family member details.',
    latency: '210ms',
    success: '99.3%',
    inputFields: [
      { name: 'ration', label: 'Ration Card Number', placeholder: 'e.g. 123456789', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-12',
    name: 'Voter Verification',
    category: 'government',
    key: 'VOTER_VERIFY',
    method: 'GET',
    endpoint: '/api/v1/voter/verify',
    desc: 'Validate voter card information directly from the Indian electoral database.',
    latency: '150ms',
    success: '99.4%',
    inputFields: [
      { name: 'epic', label: 'Voter EPIC Number', placeholder: 'e.g. ABC1234567', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-13',
    name: 'PAN Track',
    category: 'tracking',
    key: 'PAN_TRACK',
    method: 'GET',
    endpoint: '/api/v1/pancard_status',
    desc: 'Track dispatch, processing status, and SpeedPost AWB details of PAN card applications.',
    latency: '120ms',
    success: '99.7%',
    inputFields: [
      { name: 'application_no', label: 'Application Number', placeholder: 'e.g. 881060201234567', required: true, type: 'text' }
    ]
  },
  {
    id: 'def-14',
    name: 'Bank Verification',
    category: 'kyc',
    key: 'BANK_VERIFY',
    method: 'GET',
    endpoint: '/api/v1/bank-verify/verify',
    desc: 'Verify bank account credentials, status, and holder name registered with bank nodes.',
    latency: '180ms',
    success: '99.5%',
    inputFields: [
      { name: 'account_number', label: 'Account Number', placeholder: 'e.g. 1234567890', required: true, type: 'text' },
      { name: 'ifsc', label: 'IFSC Code', placeholder: 'e.g. SBIN0001234', required: true, type: 'text' }
    ]
  }
];

export default function LandingPage() {
  const [servicesList, setServicesList] = useState(defaultApisCatalog);
  const [sandboxService, setSandboxService] = useState('GST_VERIFY');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [sandboxInputsState, setSandboxInputsState] = useState({});
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState(null);
  const [dxServiceKey, setDxServiceKey] = useState('GST_VERIFY');
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [devTab, setDevTab] = useState('javascript');
  const [scrolled, setScrolled] = useState(false);
  

  const [integrationTab, setIntegrationTab] = useState('curl');
  const [sdkCopied, setSdkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSandboxServiceChange = (serviceKey) => {
    setSandboxService(serviceKey);
    setSandboxResponse(null);
    setSandboxInputsState({});
  };

  const generateDxSnippets = (service) => {
    if (!service) return { curl: '', axios: '', fetch: '', python: '' };

    const baseUrl = 'https://authserver.dizipay.in';
    const endpoint = service.endpoint || `/api/v1/${(service.key || '').toLowerCase().replace(/_/g, '-')}/verify`;
    const resolvedUrl = endpoint.startsWith('/api/v1') ? `${baseUrl}${endpoint}` : `${baseUrl}/api/v1${endpoint}`;
    
    const paramsObj = {};
    (service.inputFields || []).forEach(f => {
      paramsObj[f.name] = (f.placeholder || '').replace('e.g. ', '');
    });

    const queryStr = `?api_key=vh_live_xxxx&` + new URLSearchParams(paramsObj).toString();
    const urlWithParams = `${resolvedUrl}${queryStr}`;

    const curl = `curl -X GET "${urlWithParams}"`;

    const axiosSnippet = `const axios = require('axios');\n\naxios.get('${urlWithParams}')\n  .then(response => {\n    console.log(response.data);\n  })\n  .catch(error => {\n    console.error(error);\n  });`;

    const fetchSnippet = `fetch('${urlWithParams}')\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;

    const pythonSnippet = `import requests\n\nurl = "${urlWithParams}"\n\nresponse = requests.get(url)\nprint(response.json())`;

    return { curl, axios: axiosSnippet, fetch: fetchSnippet, python: pythonSnippet };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // GSAP Rotator references
  const keywordContainerRef = useRef(null);
  const titleRef = useRef(null);
  const [keywordIndex, setKeywordIndex] = useState(0);

  const keywords = [
    "PAN Verification",
    "GST Verification",
    "Aadhaar Verification",
    "Ration Verification",
    "Voter Verification",
    "KYC Infrastructure"
  ];

  // Metric Count-Up Values
  const [metrics, setMetrics] = useState({
    calls: 0,
    rate: 0,
    latency: 0,
    clients: 0
  });

  // Verification Live Feed State (realistic activities)
  const [feedLogs, setFeedLogs] = useState([
    { id: 1, type: '✓ PAN Verified', detail: 'ABCDE1234F', status: 'SUCCESS' },
    { id: 2, type: '✓ GST Verified', detail: '27ABCDE1234F1Z5', status: 'SUCCESS' },
    { id: 3, type: '✓ Aadhaar OTP Success', detail: 'OTP Verified', status: 'SUCCESS' }
  ]);

  // Terminal Typing Animation State
  const [terminalStep, setTerminalStep] = useState(0);
  const [terminalText, setTerminalText] = useState('');

  // Sticky scroll navbar logic
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch services dynamically on mount
  const fetchServices = () => {
    setServicesLoading(true);
    setServicesError(false);
    axios.get('/api/v1/services')
      .then(res => {
        if (res.data && res.data.success && Array.isArray(res.data.services)) {
          const mapped = res.data.services.map(s => {
            let category = 'government';
            if (s.category === 'kyc') {
              category = 'kyc';
            } else if (s.key === 'PAN_TRACK') {
              category = 'tracking';
            }
            return {
              ...s,
              name: s.name,
              category,
              key: s.key,
              method: s.method,
              desc: s.description,
              latency: s.latency || '150ms',
              success: s.successRate || '99.5%',
              price: s.price.endsWith('/request') ? s.price : `${s.price}/request`
            };
          });
          setServicesList(mapped);

          // Set initial sandbox inputs to empty
          const gstService = mapped.find(s => s.key === 'GST');
          if (gstService && gstService.inputFields) {
            const initial = {};
            gstService.inputFields.forEach(f => {
              initial[f.name] = '';
            });
            setSandboxInputsState(initial);
          }
        }
        setServicesLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch services list dynamically:', err);
        setServicesError(true);
        setServicesLoading(false);
      });
  };

  useEffect(() => {
    const token = localStorage.getItem('vh_token');
    const userStr = localStorage.getItem('vh_user');
    let isApproved = false;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        isApproved = u?.kycStatus === 'KYC_APPROVED' || u?.kycStatus === 'APPROVED' || u?.isAdmin || u?.role === 'Super Admin' || u?.role === 'Admin';
      } catch (e) {}
    }
    if (token && isApproved) {
      fetchServices();
    }
  }, []);

  // Dynamic SEO & Metadata injector for Lighthouse optimization
  useEffect(() => {
    document.title = "Dizipay | Enterprise Verification API Infrastructure For India";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Connect PAN, GST, Aadhaar, Voter, and Ration card verification APIs through one scalable gateway with unified billing, failover routing, and enterprise security.');

    const addMetaTag = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    addMetaTag('property', 'og:title', 'Dizipay | Enterprise KYC & Verification Infrastructure');
    addMetaTag('property', 'og:description', 'Connect identity, PAN, GST, and tax verification APIs through one unified gateway with automated failover.');
    addMetaTag('property', 'og:url', 'https://dizipay.in');
    addMetaTag('property', 'og:image', 'https://dizipay.in/assets/og-image.jpg');
    addMetaTag('name', 'twitter:card', 'summary_large_image');
    addMetaTag('name', 'twitter:title', 'Dizipay | Enterprise Verification Infrastructure');
    addMetaTag('name', 'twitter:description', 'Connect identity and government verification APIs through one scalable platform.');

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = "https://dizipay.in";

    let ldJson = document.querySelector('script[type="application/ld+json"]');
    if (!ldJson) {
      ldJson = document.createElement('script');
      ldJson.type = "application/ld+json";
      document.head.appendChild(ldJson);
    }
    ldJson.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Dizipay",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "url": "https://dizipay.in",
      "description": "Enterprise Verification Infrastructure for PAN, GST, Aadhaar, Voter, and Ration card verifications in India.",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "INR"
      }
    });
  }, []);

  // 1. Text Rotation GSAP Animation (Word cycle + character stagger reveal)
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const cycleDuration = 4000; // Cycle every 4 seconds
    let isMounted = true;

    const animateNext = () => {
      if (!isMounted) return;
      if (!isDesktop) {
        setKeywordIndex((prev) => (prev + 1) % keywords.length);
        return;
      }
      const chars = keywordContainerRef.current?.querySelectorAll('.char');
      if (!chars || chars.length === 0) {
        // Fallback if elements are not mounted yet
        setTimeout(animateNext, 500);
        return;
      }

      // Exit Animation: Slide up and blur out
      gsap.to(chars, {
        y: -35,
        opacity: 0,
        filter: 'blur(12px)',
        stagger: 0.015,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          if (!isMounted) return;
          // Set state to next index to trigger render of new characters
          setKeywordIndex((prev) => (prev + 1) % keywords.length);
        }
      });
    };

    const interval = setInterval(animateNext, cycleDuration);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Trigger Enter Animation whenever keywordIndex changes
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktop) return; // Skip GSAP animations on mobile

    const chars = keywordContainerRef.current?.querySelectorAll('.char');
    if (!chars || chars.length === 0) return;

    // Reset properties to initial entry state
    gsap.set(chars, {
      y: 35,
      opacity: 0,
      filter: 'blur(12px)'
    });

    // Enter Animation: Character reveal stagger, slide up, blur in
    gsap.to(chars, {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      stagger: 0.025,
      duration: 0.65,
      ease: 'power3.out'
    });
  }, [keywordIndex]);

  // Initial title stagger fade up
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktop) return; // Skip GSAP animations on mobile

    const ctx = gsap.context(() => {
      gsap.from('.hero-animate', {
        y: 24,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    }, titleRef);
    return () => ctx.revert();
  }, []);

  // 2. Metrics Count Up Animation
  useEffect(() => {
    const duration = 2000;
    const startTime = performance.now();

    const updateMetrics = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress);

      setMetrics({
        calls: (ease * 12.4).toFixed(1),
        rate: (ease * 99.8).toFixed(1),
        latency: Math.floor(ease * 210),
        clients: Math.floor(ease * 8400)
      });

      if (progress < 1) {
        requestAnimationFrame(updateMetrics);
      }
    };

    requestAnimationFrame(updateMetrics);
  }, []);

  // 3. Live Terminal typing simulation loop (typing request & fade-in response)
  useEffect(() => {
    const codeLine = '{\n  "pan": "ABCDE1234F"\n}';
    let charIdx = 0;
    let typingTimer;

    const runTerminalCycle = () => {
      setTerminalStep(0);
      setTerminalText('');
      charIdx = 0;

      const type = () => {
        if (charIdx < codeLine.length) {
          setTerminalText((prev) => prev + codeLine.charAt(charIdx));
          charIdx++;
          typingTimer = setTimeout(type, 50);
        } else {
          setTimeout(() => {
            setTerminalStep(1); // loader state
            setTimeout(() => {
              setTerminalStep(2); // response state
              setTimeout(runTerminalCycle, 5000);
            }, 1000);
          }, 1000);
        }
      };

      type();
    };

    runTerminalCycle();
    return () => clearTimeout(typingTimer);
  }, []);

  // 4. Live Activity Feed simulation loop (auto-updates activity feed every 3 seconds)
  useEffect(() => {
    const templates = [
      { type: '✓ PAN Verified', detail: 'ABCDE1234F', status: 'SUCCESS' },
      { type: '✓ GST Verified', detail: '27ABCDE1234F1Z5', status: 'SUCCESS' },
      { type: '✓ Aadhaar OTP Success', detail: 'OTP Verification Done', status: 'SUCCESS' },
      { type: '✓ Voter Verified', detail: 'ABC1234567', status: 'SUCCESS' },
      { type: '✓ Ration Card Verified', detail: 'Ration Card Active', status: 'SUCCESS' },
      { type: '✓ PAN Track Success', detail: 'Application Dispatched', status: 'SUCCESS' }
    ];

    const feedTimer = setInterval(() => {
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      setFeedLogs((prev) => {
        // filter out matches to prevent duplicates in current view
        const filtered = prev.filter(p => p.type !== randomTemplate.type);
        const next = [
          { id: Date.now(), ...randomTemplate },
          ...filtered.slice(0, 2)
        ];
        return next;
      });
    }, 3000);

    return () => clearInterval(feedTimer);
  }, []);

  const handleSandboxSubmit = (e) => {
    e.preventDefault();

    const activeService = servicesList.find(s => s.key === sandboxService);
    if (!activeService) return;

    // Reject empty required fields
    for (const field of activeService.inputFields) {
      const val = (sandboxInputsState[field.name] || '').trim();
      if (field.required && !val) {
        showToast(`${field.label || field.name} is required`);
        return;
      }
    }

    setSandboxLoading(true);
    setSandboxResponse(null);

    const startTime = performance.now();

    setTimeout(() => {
      setSandboxLoading(false);
      const latencyMs = Math.floor(performance.now() - startTime) + 80;

      const mockResponse = JSON.parse(JSON.stringify(activeService.sampleResponse || { success: true }));
      
      if (mockResponse.data) {
        Object.keys(sandboxInputsState).forEach(k => {
          if (sandboxInputsState[k] && k in mockResponse.data) {
            mockResponse.data[k] = sandboxInputsState[k].toUpperCase().trim();
          }
        });
      }
      
      mockResponse.requestId = 'req_' + Math.random().toString(36).substring(2, 12);
      mockResponse.latencyMs = latencyMs;
      mockResponse.provider = activeService.sampleResponse?.provider || 'surepass';

      setSandboxResponse(mockResponse);
    }, 1000);
  };



  // integrationCodes removed in favor of dynamic code snippets generator (generateDxSnippets)

  return (
    <div className="min-h-[100dvh] relative text-text-primary bg-background overflow-hidden">
      {/* Very faint grid (opacity max 5% as per V2 specifications) */}
      <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none -z-20 animate-pulse" style={{ animationDuration: '6s' }} />

      {/* Pure CSS animated ambient blurred shape backdrop (zero-JS overhead, ultra-fast loading) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/5 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-accent/4 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* Improved Sticky/Glass Navbar (Height 72px, sticky-on-scroll, subtle blur) */}
      <nav className={`fixed top-0 left-0 right-0 z-40 h-[72px] flex items-center justify-between px-6 lg:px-16 transition-all duration-300 ${
        scrolled ? 'bg-white/80 border-b border-border shadow-sm backdrop-blur-md' : 'bg-transparent border-b border-transparent'
      }`}>
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wider text-text-primary" aria-label="Dizipay Home">
          <img src="/greenshortlogo.png" className="h-7 w-auto object-contain" alt="Dizipay Logo" loading="lazy" /> Dizipay
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary">
          <a href="#demo" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary/30 outline-none rounded px-2 py-1">Sandbox Demo</a>
          <a href="#services" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary/30 outline-none rounded px-2 py-1">APIs Catalog</a>
          <a href="#dx" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary/30 outline-none rounded px-2 py-1">Developer DX</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <ClayButton variant="secondary" className="px-5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none">Login</ClayButton>
          </Link>
          <Link to="/register">
            <ClayButton variant="primary" className="px-5 py-2.5 text-xs font-bold shadow-clay-primary hover:shadow-[0_12px_24px_rgba(109,93,252,0.2)] focus:ring-2 focus:ring-primary/50 outline-none">
              Start Building
            </ClayButton>
          </Link>
        </div>
      </nav>

      <main>
        {/* SECTION 1: REDESIGNED DEVELOPER LIGHT HERO SECTION V2 (55/45 Split, 90vh height bounds, 1440px limit) */}
        <div className="w-full bg-gradient-to-b from-white via-slate-50 to-white">
          <section className="relative pt-32 pb-24 px-6 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center min-h-[90vh]">
            {/* Left Side: Copywriting */}
            <div ref={titleRef} className="flex flex-col gap-6 text-left relative z-10 max-w-[780px]">
              <div className="inline-flex hero-animate">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  Enterprise Verification Infrastructure
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tight text-slate-900 hero-animate">
                Enterprise Verification <br />
                <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Infrastructure
                </span>
              </h1>

              <p className="text-slate-600 font-medium leading-relaxed text-lg md:text-xl max-w-[680px] hero-animate">
                Connect PAN, GST, Aadhaar, Voter ID, Ration Card, and KYC verification APIs through a single enterprise-grade platform with unified billing, wallet management, analytics, API management and real-time monitoring.
              </p>

              {/* Primary/Secondary CTA with Micro Interactions */}
              <div className="flex flex-wrap items-center gap-4 mt-2 hero-animate">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group rounded-full"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                  
                  <Link to="/register" className="relative block" aria-label="Start Building sandbox account">
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xl shadow-emerald-500/30 flex items-center gap-2 px-8 py-4 text-base rounded-full transition-all focus:ring-2 focus:ring-emerald-500/50 outline-none">
                      Start Building <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                    </button>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a href="#dx" className="block" aria-label="View developer integration documentation">
                    <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-full shadow-sm transition-all focus:ring-2 focus:ring-slate-300 outline-none">
                      View API Docs <Code className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </a>
                </motion.div>
              </div>

              {/* Trust Metrics Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-100 mt-4 hero-animate">
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">API Calls</span>
                  <span className="text-slate-800 font-black text-xl font-display flex items-center gap-1.5 justify-start">
                    <span className="text-emerald-500 text-sm">✓</span> {metrics.calls}M+
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Success Rate</span>
                  <span className="text-slate-800 font-black text-xl font-display flex items-center gap-1.5 justify-start">
                    <span className="text-emerald-500 text-sm">✓</span> {metrics.rate}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Businesses</span>
                  <span className="text-slate-800 font-black text-xl font-display flex items-center gap-1.5 justify-start">
                    <span className="text-emerald-500 text-sm">✓</span> {metrics.clients}+
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Avg Latency</span>
                  <span className="text-slate-800 font-black text-xl font-display flex items-center gap-1.5 justify-start">
                    <span className="text-emerald-500 text-sm">✓</span> {metrics.latency}ms
                  </span>
                </div>
              </div>
            </div>
          
          {/* Right Side: Enterprise Verification Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            className="relative flex flex-col gap-6 z-10 w-full"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="w-full"
            >
              {/* Dashboard Container with reduced visual weight and shadow */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-8 flex flex-col gap-6 w-full max-w-md mx-auto shadow-[0_10px_40px_-10px_rgba(15,23,42,0.05)]">
              
              {/* Console Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary font-display">
                    Live Gateway Console
                  </span>
                </div>
                <ClayBadge status="ACTIVE" className="text-[9px] py-0.5">99.8% SLA</ClayBadge>
              </div>

              {/* 1. Live API Terminal (Top) */}
              <div className="w-full">
                <div className="bg-[#0F172A] border border-border shadow-2xl rounded-clay p-5 font-mono text-xs flex flex-col h-[215px] justify-between relative overflow-hidden text-left">
                  <div className="flex justify-between items-center pb-2.5 border-b border-white/10 mb-2">
                    <span className="text-[9px] uppercase text-muted font-sans font-bold tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" /> HTTP Client
                    </span>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500/70" />
                      <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
                      <span className="w-2 h-2 rounded-full bg-green-500/70" />
                    </div>
                  </div>
                  
                  <div className="flex-1 select-none font-mono">
                    <span className="text-secondary block mb-1 font-semibold text-[10px]">$ curl -X POST /api/v1/pan/verify</span>
                    <pre className="text-white text-[10px] leading-relaxed whitespace-pre-wrap">
                      {`{\n  "pan": "ABCDE1234F"\n}`}
                    </pre>
                    
                    <AnimatePresence>
                      {terminalStep >= 1 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-muted text-[10px] italic mt-2"
                        >
                          🚀 Resolving to Surepass node...
                        </motion.div>
                      )}
                      {terminalStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="text-[#36FFA1] text-[10px] leading-relaxed mt-2 p-2.5 rounded bg-[#1E293B] border border-white/5 font-mono"
                        >
                          {`HTTP/1.1 200 OK\n{\n  "status": "verified",\n  "name": "Rahul Sharma",\n  "pan_status": "active"\n}`}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Lower dashboard section: Feed & Metrics side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 2. Verification Activity Feed (Left/Right) */}
                <div className="md:col-span-5 flex flex-col gap-2.5 text-left">
                  <span className="text-[10px] uppercase font-sans text-text-secondary tracking-widest font-bold pl-1">
                    Live Activity
                  </span>
                  
                  <div className="flex flex-col gap-2 h-[155px] justify-start overflow-hidden relative">
                    <AnimatePresence>
                      {feedLogs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                          className="bg-[#F8FAFC] border border-border p-2.5 rounded-2xl flex items-center justify-between shadow-sm"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold text-text-primary">{log.type}</span>
                            <span className="text-[8px] font-mono text-text-secondary truncate max-w-[85px]">{log.detail}</span>
                          </div>
                          <span className="inline-flex w-4 h-4 rounded-full bg-accent/25 items-center justify-center text-accent text-[9px] font-bold">
                            ✓
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 3. Metrics Cards (Bottom) */}
                <div className="md:col-span-7 flex flex-col gap-2.5">
                  <span className="text-[10px] uppercase font-sans text-text-secondary tracking-widest font-bold pl-1 text-left">
                    Platform Metrics
                  </span>
                  <div className="grid grid-cols-2 gap-3 h-[155px]">
                    {[
                      { label: 'API Calls', val: `${metrics.calls}M+` },
                      { label: 'Success Rate', val: `${metrics.rate}%` },
                      { label: 'Avg Latency', val: `${metrics.latency}ms` },
                      { label: 'Active Clients', val: `${metrics.clients}+` }
                    ].map((m, i) => (
                      <div 
                        key={i} 
                        className="bg-white border border-border rounded-clay-sm p-3 flex flex-col justify-center items-center text-center shadow-[0_4px_12px_rgba(15,23,42,0.03)] hover:border-primary/20 transition-all duration-300"
                      >
                        <span className="text-[8px] uppercase tracking-wider text-text-secondary font-bold font-display">{m.label}</span>
                        <span className="text-sm font-extrabold text-text-primary mt-1 font-display">{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>

        {/* SECTION 2: TRUST BAR */}
        <section className="border-y border-border bg-white py-6">
          <div className="max-w-[1440px] mx-auto px-6 flex flex-wrap justify-around items-center gap-6 text-sm font-bold font-display text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">✓</span> 99.8% Verification Success
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-lg">✓</span> 12M+ API Requests
            </div>
            <div className="flex items-center gap-2">
              <span className="text-secondary text-lg">✓</span> 8400+ Businesses
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">✓</span> Enterprise Grade Security
            </div>
          </div>
        </section>

        {/* SECTION 3: CUSTOMER LOGOS */}
        <section className="bg-background py-16">
          <div className="max-w-[1440px] mx-auto px-6 text-center">
            <h2 className="text-xs uppercase tracking-widest text-muted font-bold mb-8">Trusted by Fast-Growing Indian Tech Leaders</h2>
            <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20">
              {['Acme Finance', 'VenturePay', 'Apex HRMS', 'SecureInsure', 'Lendify', 'SaaSify'].map((logo, idx) => (
                <div key={idx} className="text-xl lg:text-2xl font-bold font-display text-text-secondary grayscale opacity-40 hover:grayscale-0 hover:opacity-90 transition-all duration-300 cursor-default select-none">
                  💼 {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: LIVE VERIFICATION SANDBOX */}
        <section id="demo" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-display text-text-primary">
              Try the Live API Sandbox
            </h2>
            <p className="text-text-secondary mt-2">Submit verification inputs directly to see simulated provider output payloads.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Controls Card */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <ClayCard className="flex flex-col gap-6 h-full justify-between bg-white border border-slate-200 shadow-sm">
                <div className="text-left">
                  <span className="text-xs font-bold font-display text-primary tracking-widest uppercase mb-4 block">Select Sandbox Service</span>
                  <div className="flex flex-wrap gap-2 mb-6 max-h-[220px] overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                    {servicesList.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSandboxServiceChange(service.key)}
                        className={`px-3.5 py-2 rounded-full text-[11px] font-bold font-display border transition-all focus:ring-2 focus:ring-primary/30 outline-none ${
                          sandboxService === service.key
                            ? 'bg-emerald-600 text-white border-transparent shadow-md'
                            : 'bg-background border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSandboxSubmit}>
                    {(servicesList.find(s => s.key === sandboxService)?.inputFields || []).map((field) => (
                      <div key={field.name} className="mb-4 text-left">
                        <ClayInput
                          label={field.label || field.name}
                          type={field.type || 'text'}
                          value={sandboxInputsState[field.name] || ''}
                          onChange={(e) => setSandboxInputsState(prev => ({
                            ...prev,
                            [field.name]: e.target.value
                          }))}
                          placeholder={getPlaceholderForField(field.name, field.label)}
                          required={field.required}
                        />
                      </div>
                    ))}
                    
                    <ClayButton type="submit" variant="primary" disabled={sandboxLoading} className="w-full mt-4 flex items-center justify-center gap-2 focus:ring-2 focus:ring-primary/50 outline-none">
                      {sandboxLoading ? 'Processing Request...' : 'Trigger Verification'}
                    </ClayButton>
                  </form>
                </div>

                <div className="text-xs text-text-secondary leading-relaxed mt-4 p-4 rounded-2xl bg-background border border-border text-left">
                  🔒 Dizipay acts as an API gateway. The actual verification is processed by verified partner APIs (Karza, Surepass, Digitap, Signzy) and returned under a single interface.
                </div>
              </ClayCard>
            </div>

            {/* Response Console */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-[#0A0F1D] border border-border shadow-clay-input rounded-clay p-6 flex-1 flex flex-col justify-between font-mono text-sm text-left">
                <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-muted font-sans uppercase">API sandbox console</span>
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {/* Request Column */}
                  <div className="flex flex-col border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-sans">
                      Request Payload ({servicesList.find(s => s.key === sandboxService)?.method || 'POST'})
                    </span>
                    <pre className="text-xs leading-relaxed text-[#00C2FF] overflow-x-auto select-all">
                      {servicesList.find(s => s.key === sandboxService)?.method === 'GET' ? (
                        `GET ${servicesList.find(s => s.key === sandboxService)?.endpoint}?api_key=vh_live_xxxx&${Object.keys(sandboxInputsState).map(k => `${k}=${sandboxInputsState[k]}`).join('&')}`
                      ) : (
                        JSON.stringify(
                          servicesList.find(s => s.key === sandboxService)?.key === 'PAN_TRACK'
                            ? { api_key: 'vh_live_xxxx', ...sandboxInputsState }
                            : sandboxInputsState,
                          null,
                          2
                        )
                      )}
                    </pre>
                  </div>

                  {/* Response Column */}
                  <div className="flex flex-col pl-0 md:pl-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-sans">
                      Response Payload
                    </span>
                    <div className="overflow-y-auto max-h-[300px] text-[#36FFA1] select-text text-left">
                      {sandboxLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 font-sans py-12 text-muted text-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-muted">
                            {servicesList.find(s => s.key === sandboxService)?.method || 'POST'}ing request to {servicesList.find(s => s.key === sandboxService)?.endpoint || ''} ...
                          </span>
                        </div>
                      ) : sandboxResponse ? (
                        <pre className="text-xs leading-relaxed text-[#36FFA1] overflow-x-auto select-all">
                          {JSON.stringify(sandboxResponse, null, 2)}
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center font-sans py-12 text-muted text-center">
                          <span className="text-muted">⚡ Ready to verify. Enter parameters and click trigger to see response logs.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {sandboxResponse && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap justify-between items-center font-sans text-xs text-muted gap-2">
                    <span>Response Time: <strong className="text-white">{sandboxResponse.latencyMs || '--'}ms</strong></span>
                    <span>Provider: <strong className="text-white">{sandboxResponse.provider || '--'}</strong></span>
                    <span>Status: <ClayBadge status={sandboxResponse.success ? 'SUCCESS' : 'FAILED'} /></span>
                  </div>
                )}
              </div>

              {sandboxResponse && sandboxResponse.success && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-[20px] text-amber-900 text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_8px_16px_rgba(245,158,11,0.06)] backdrop-blur-md text-left flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <span>⚠ Sandbox Demo Response</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    This response contains simulated demonstration data only.
                  </p>
                  <p className="leading-relaxed font-medium">
                    No real verification has been performed.
                  </p>
                  <p className="leading-relaxed font-medium">
                    Production APIs return live provider responses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5: APIS CATALOG */}
        <section id="services" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <ClayBadge>Featured APIs</ClayBadge>
            <h2 className="text-3xl lg:text-4xl font-bold font-display text-text-primary mt-2">
              API Highlights
            </h2>
            <p className="text-text-secondary mt-2">Connect identity and government verification APIs through one scalable gateway.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="animate-pulse flex flex-col justify-between gap-6 bg-white shadow-sm border border-slate-200 rounded-[24px] p-6 text-left h-[260px]">
                  <div className="flex flex-col gap-4">
                    <div className="h-3.5 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="space-y-2 mt-2">
                      <div className="h-3 bg-slate-200 rounded" />
                      <div className="h-3 bg-slate-200 rounded w-5/6" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-8 bg-slate-200 rounded" />
                      <div className="h-8 bg-slate-200 rounded" />
                      <div className="h-8 bg-slate-200 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              servicesList
                .filter((api) => ['GST_VERIFY', 'PAN_CARD', 'AADHAAR_OTP', 'BANK_VERIFY', 'VOTER_VERIFY'].includes(api.key))
                .map((api, idx) => (
                  <ClayCard key={api.id} className="flex flex-col justify-between gap-6 hover:border-emerald-300 bg-white shadow-sm border border-slate-200">
                    <div className="text-left flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            {api.category}
                          </span>
                          <h3 className="text-lg font-bold font-display text-slate-900">{api.name}</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-mono">
                          {api.method}
                        </span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed min-h-[40px]">{api.desc}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <div className="text-left">
                          <span className="block text-slate-400 uppercase tracking-wider text-[8px]">Latency</span>
                          <strong className="text-slate-800 font-display text-[11px]">{api.latency}</strong>
                        </div>
                        <div className="text-left">
                          <span className="block text-slate-400 uppercase tracking-wider text-[8px]">Success</span>
                          <strong className="text-emerald-600 font-display text-[11px]">{api.success}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => {
                            handleSandboxServiceChange(api.key);
                            document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="py-2 text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all outline-none"
                        >
                          Try API
                        </button>
                        <a
                          href="#dx"
                          onClick={() => {
                            setDxServiceKey(api.key);
                            setIntegrationTab('curl');
                            document.getElementById('dx')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="py-2 text-center text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          View Docs
                        </a>
                      </div>
                    </div>
                  </ClayCard>
                ))
            )}
          </div>

          <div className="mt-12 text-center">
            <Link to="/marketplace">
              <ClayButton variant="primary" className="py-3 px-8 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                View All APIs
              </ClayButton>
            </Link>
          </div>
        </section>



        {/* SECTION 7: DEVELOPER EXPERIENCE & INTEGRATIONS */}
        <section id="dx" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <ClayBadge>BUILD IN MINUTES</ClayBadge>
            <h2 className="text-3xl lg:text-4xl font-bold font-display text-text-primary mt-2">
              Developer-First SDK Integrations
            </h2>
            <p className="text-text-secondary mt-2">Integrate verified KYC protocols into your stack with copy-ready libraries.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            {/* API Selector (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col justify-between text-left">
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 flex-1 flex flex-col gap-4 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold font-display text-text-primary">Select API Service</h3>
                  <p className="text-xs text-text-secondary mt-1">Select an API to view its live endpoint signature and integration codes.</p>
                </div>
                
                <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {servicesList.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setDxServiceKey(service.key)}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs font-semibold font-sans transition-all duration-150 border text-left ${
                        dxServiceKey === service.key
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-slate-800 truncate">{service.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{service.endpoint}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        service.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {service.method}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language Snippet Tabs (lg:col-span-7) */}
            <div className="lg:col-span-7">
              <div className="bg-[#0F172A] border border-border shadow-clay-card rounded-clay p-6 font-mono text-xs text-left h-full flex flex-col justify-between">
                
                {/* Navigation Header */}
                <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6 overflow-x-auto gap-2">
                  <span className="text-[10px] uppercase text-muted font-sans font-bold whitespace-nowrap">API signature</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'curl', label: 'cURL' },
                      { id: 'axios', label: 'Node.js Axios' },
                      { id: 'fetch', label: 'JS Fetch' },
                      { id: 'python', label: 'Python Requests' }
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setIntegrationTab(lang.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold font-sans transition-all focus:ring-2 focus:ring-primary/30 outline-none ${
                          integrationTab === lang.id ? 'bg-primary text-white shadow-clay-primary' : 'text-muted hover:text-white'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preformatted code snippet block */}
                <div className="flex-1 relative font-mono text-[11px]">
                  <pre className="text-secondary overflow-x-auto leading-relaxed p-4 rounded-clay-sm bg-[#080B14] max-h-[300px] select-text">
                    <code>{generateDxSnippets(servicesList.find(s => s.key === dxServiceKey))[integrationTab]}</code>
                  </pre>
                  
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => {
                        const snippets = generateDxSnippets(servicesList.find(s => s.key === dxServiceKey));
                        copyToClipboard(snippets[integrationTab]);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="text-[9px] bg-[#1E293B] hover:bg-white/10 text-white font-sans px-2.5 py-1 rounded border border-white/10 font-bold"
                    >
                      {codeCopied ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: ANALYTICS SHOWCASE (V2 SVG-based, zero JS overhead!) */}
        <section className="py-24 px-6 bg-white border-y border-border">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual graph mockup (lg:col-span-6) */}
            <div className="lg:col-span-6">
              <div className="clay-card-premium rounded-clay-lg p-6 bg-background relative overflow-hidden select-none">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Daily Request Performance Mock</span>
                  <ClayBadge status="ACTIVE" className="text-[9px]">Live Data</ClayBadge>
                </div>
                
                {/* Custom SVG line chart (zero JS footprint) */}
                <div className="w-full bg-[#111827]/5 border border-border p-4 rounded-2xl">
                  <svg className="w-full h-48 text-primary" viewBox="0 0 500 200" aria-label="Consumption trends visual graph">
                    <defs>
                      <linearGradient id="svgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6D5DFC" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6D5DFC" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 180 Q 100 120 200 140 T 400 60 T 500 40 L 500 200 L 0 200 Z" fill="url(#svgGradient)" />
                    <path d="M 0 180 Q 100 120 200 140 T 400 60 T 500 40" fill="none" stroke="#6D5DFC" strokeWidth="3" />
                    
                    <circle cx="100" cy="135" r="5" fill="#00C2FF" className="animate-ping" />
                    <circle cx="100" cy="135" r="4" fill="#6D5DFC" />
                    <circle cx="300" cy="90" r="4" fill="#6D5DFC" />
                    <circle cx="500" cy="40" r="4" fill="#6D5DFC" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content (lg:col-span-6) */}
            <div className="lg:col-span-6 text-left flex flex-col gap-6">
              <ClayBadge>ANALYTICS ENGINE</ClayBadge>
              <h2 className="text-3xl lg:text-4xl font-bold font-display text-text-primary">
                Complete Control & Transparency
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                Track daily request volumes, success rates, latency parameters, and wallet credit logs in real-time.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <span className="block text-[10px] text-muted uppercase">Daily Limit</span>
                  <strong className="text-text-primary font-display text-lg">Unlimited</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-muted uppercase">Export API</span>
                  <strong className="text-text-primary font-display text-lg">JSON/CSV</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-muted uppercase">Retention</span>
                  <strong className="text-text-primary font-display text-lg">365 Days</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: UPTIME STATUS INDICATOR */}
        <section className="py-20 bg-background border-b border-border">
          <div className="max-w-5xl mx-auto px-6 text-center flex flex-col gap-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-600 rounded-full text-xs font-bold font-mono">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> All Systems Operational
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold font-display text-text-primary mt-4">Enterprise Reliability</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white border border-border p-6 rounded-clay shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">API Uptime</span>
                <strong className="text-3xl font-extrabold text-text-primary font-display mt-2 block">99.99%</strong>
              </div>
              <div className="bg-white border border-border p-6 rounded-clay shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Average Response Time</span>
                <strong className="text-3xl font-extrabold text-text-primary font-display mt-2 block">210ms</strong>
              </div>
              <div className="bg-white border border-border p-6 rounded-clay shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Verification Success</span>
                <strong className="text-3xl font-extrabold text-text-primary font-display mt-2 block">99.8%</strong>
              </div>
            </div>

            {/* Provider Nodes lists */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-text-secondary font-mono mt-4">
              <span className="text-muted">Gateway Nodes:</span>
              {['Surepass', 'Signzy', 'Karza', 'Digitap'].map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-border rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> {p}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 10: TESTIMONIALS */}
        

        {/* SECTION 11: FAQ */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-display text-text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {[
              { q: 'How does the provider adapter system work?', a: 'Dizipay acts as an API aggregator. You communicate with our API gateway, and we resolve queries to provider endpoints (Surepass, Signzy, Digitap) using active routing weights configured by administrators.' },
              { q: 'How does wallet pay-per-use billing operate?', a: 'Every call deducts credits from your wallet based on pricing rules. If both primary and backup providers return errors, the gateway automatically reverses the transaction, returning credits to your balance.' },
              { q: 'Can I whitelist client server IPs?', a: 'Yes. You can whitelist server IPs in the API Key dashboard, blocking any requests initiated from unauthorized origins.' },
              { q: 'What webhooks are supported?', a: 'We support real-time delivery postbacks for: verification.success, verification.failed, and low wallet notifications.' }
            ].map((faq, idx) => (
              <div key={idx} className="flex gap-4">
                <HelpCircle className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="text-base font-bold text-text-primary mb-1 font-display">{faq.q}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 12: CTA */}
        <section className="py-24 px-6 text-center max-w-7xl mx-auto">
          <ClayCard className="bg-white border border-border shadow-clay-card p-12 max-w-5xl mx-auto flex flex-col items-center gap-6">
            <h2 className="text-4xl font-extrabold font-display text-text-primary">
              Ready to Streamline Your KYC Flow?
            </h2>
            <p className="text-text-secondary max-w-md text-sm">
              Sign up now, access pre-funded sandbox test credits, and start building verification systems in minutes.
            </p>
            <Link to="/register" className="mt-4" aria-label="Sign up for sandbox access">
              <ClayButton variant="primary" className="px-8 py-4 font-bold tracking-wider focus:ring-2 focus:ring-primary/50 outline-none">
                Start Verifying In Minutes
              </ClayButton>
            </Link>
          </ClayCard>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border text-center text-xs text-text-secondary">
        <p>&copy; {new Date().getFullYear()} Dizipay SaaS. Built for Modern Indian Enterprise KYC.</p>
      </footer>
    </div>
  );
}
