"use client";
import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import IndentForm from "./components/IndentForm";
import StockApproval from "./components/StockApproval";
import GeneratePO from "./components/generate-po";
import TallyEntry from "./components/tally-entry";
import LiftMaterial from "./components/lift-material";
import ReceiptCheck from "./components/receipt-check";
import LabTesting from "./components/lab-testing";
import FinalTallyEntry from "./components/final-tally-entry";
import LoginForm from "./components/LoginForm";
import AppHeader from "./components/AppHeader";
import RactifyMistake from "./components/Ractify-mistake";
import AuditData from "./components/Audit-data";
import RactifyMistake2 from "./components/Ractify-mistake2";
import TakeEntryTallyPage from "./components/Take-entryby-tally";
import AgainAuditingPage from "./components/Again-for-auditing";
import OriginalBillsFiledPage from "./components/Originals-billto-fill";
import TolrancePage from "./components/Tolrance";
import Mismatch from "./components/Mis-match";

import { useAuth } from "./context/AuthContext";
import BiltyPage from "./components/BiltyPage";
import FullkittingTransportingPage from "./components/FullkittingTransportingPage";
import Accounts from "./components/Accounts";
import KycPage from "./components/KycPage";
import VendorPaymentPage from "./components/VendorPaymentPage";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, FilePlus, PackageCheck, FileText, Calculator,
  Truck, CheckSquare, TestTube, Archive, Menu, X, Receipt, PackageSearch,
  UserCheck, Wallet, Landmark, User, Database, 
  FileEdit, Search, FileCheck, RotateCcw, Save, Edit2, Gauge,Loader2, Scale,AlertTriangle 
} from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";

function App() {
  const { isAuthenticated, allowedSteps } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const toggleDesktopSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, stepName: "Dashboard" },
    { id: "indent", label: "Indent", icon: <FilePlus size={20} />, stepName: "Generate Indent" },
    { id: "stock", label: "Stock", icon: <PackageCheck size={20} />, stepName: "Recheck the Stock And Approve Quantity" },
    { id: "generate-po", label: "PO", icon: <FileText size={20} />, stepName: "Generate Purchase Order" },
    { id: "tally-entry", label: "Tally", icon: <Calculator size={20} />, stepName: "Purchase Order Entry In Tally" },
    { id: "lift-material", label: "Lift", icon: <Truck size={20} />, stepName: "Lift The Material" },
    { id: "receipt-check", label: "Receipt", icon: <CheckSquare size={20} />, stepName: "Receipt Of Material / Physical Quality Check" },
    { id: "lab-testing", label: "Lab", icon: <TestTube size={20} />, stepName: "Lab Testing - Is The Quality Good?" },
    // { id: "final-tally-entry", label: "Final", icon: <Archive size={20} />, stepName: "Final Tally Entry" },
    { id: "bilty", label: "Bilty", icon: <Receipt size={20} />, stepName: "Bilty" },
    { id: "fullkitting", label: "Fullkitting", icon: <PackageSearch size={20} />, stepName: "Fullkitting" },
    
    // Individual Accounts Pages
    { id: "accounts", label: "Accounts", icon: <Database size={20} />, stepName: "accounts" },
    { id: "rectify-mistake", label: "Rectify & Bilty", icon: <FileEdit size={20} />, stepName: "accounts" },
    { id: "audit-data", label: "Audit Data", icon: <Search size={20} />, stepName: "accounts" },
    { id: "rectify-mistake-2", label: "Rectify 2", icon: <FileCheck size={20} />, stepName: "accounts" },
    { id: "take-entry-tally", label: "Tally Entry", icon: <Calculator size={20} />, stepName: "accounts" },
    { id: "again-auditing", label: "Re-Audit", icon: <RotateCcw size={20} />, stepName: "accounts" },
    { id: "original-bills", label: "Bills Filing", icon: <Archive size={20} />, stepName: "accounts" },
      { id: "tolrance", label: "Tolrance", icon: < Scale size={20} />, stepName: "tolrance" },
      { id: "mismatch", label: "Mismatch", icon: < AlertTriangle size={20} />, stepName: "mismatch" },


    // { id: "kyc", label: "KYC", icon: <UserCheck size={20} />, stepName: "KYC" },
    // { id: "vendor-payment", label: "Vendor Payment", icon: <Landmark size={20} />, stepName: "Vendor Payment" }
  ];

  const accessibleTabs = allTabs.filter(tab =>
    tab.id === "dashboard" ||
    allowedSteps.includes("admin") ||
    allowedSteps.includes(tab.stepName?.toLowerCase())
  );

  useEffect(() => {
    if (!activeTab || !accessibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [accessibleTabs, activeTab]);

  const renderSidebarContent = (isMobile = false) => (
    <>
      <ScrollArea className={`${isMobile ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-4rem)]'} flex-1`}>
        <nav className="space-y-1 p-2 pb-20">
          {accessibleTabs.map((tab) => (
            <Button
              key={tab.id}
              className={`w-full justify-start h-12 relative group rounded-lg transition-all duration-200 ease-in-out
                        ${isMobile ? 'px-4' : (isSidebarOpen ? 'pl-4' : 'justify-center')}
                        ${activeTab === tab.id
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-purple-50 hover:text-gray-900"
                        }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              title={tab.label}
            >
              <span className={`transition-colors duration-150 ease-in-out
                              ${activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                {tab.icon}
              </span>
              {(isMobile || isSidebarOpen) && (
                <span className="ml-3 text-base font-medium flex items-center flex-1 min-w-0">
                  <span className="truncate">{tab.label}</span>
                </span>
              )}
              {!isMobile && !isSidebarOpen && activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-purple-600 rounded-r-full"></span>
              )}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      {!isMobile && isSidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 text-center bg-white">
          <p className="text-sm text-gray-500 font-semibold">Powered By</p>
          <a className="text-base font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent" href="https://www.botivate.in/">Botivate</a>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    if (!accessibleTabs.some(tab => tab.id === activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center text-gray-500">
          <X size={48} className="text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="mt-2">You do not have permission to view this section.</p>
          <Button onClick={() => setActiveTab("dashboard")} className="mt-4">Go to Dashboard</Button>
        </div>
      );
    }
    
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "indent": return <IndentForm />;
      case "stock": return <StockApproval />;
      case "generate-po": return <GeneratePO />;
      case "tally-entry": return <TallyEntry />;
      case "lift-material": return <LiftMaterial />;
      case "receipt-check": return <ReceiptCheck />;
      case "lab-testing": return <LabTesting />;
      case "final-tally-entry": return <FinalTallyEntry />;
      case "bilty": return <BiltyPage />;
      case "fullkitting": return <FullkittingTransportingPage />;
      
      // Individual Accounts Pages
      case "accounts": return <Accounts />;
      case "rectify-mistake": return <RactifyMistake />;
      case "audit-data": return <AuditData />;
      case "rectify-mistake-2": return <RactifyMistake2 />;
      case "take-entry-tally": return <TakeEntryTallyPage />;
      case "again-auditing": return <AgainAuditingPage />;
      case "original-bills": return <OriginalBillsFiledPage />;
      case "tolrance": return <TolrancePage />;
      case "mismatch": return <Mismatch />;
      case "kyc": return <KycPage />;
      case "vendor-payment": return <VendorPaymentPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white shadow-lg transition-all duration-300 ease-in-out flex-col flex-shrink-0 relative ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 flex-shrink-0 z-10 bg-white ${
            isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"
          }`}
        >
          {isSidebarOpen ? (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          ) : (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              P
            </span>
          )}
        </div>
        {/* Sidebar Content */}
        <div className="flex-1 relative">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          toggleDesktopSidebar={toggleDesktopSidebar}
          isSidebarOpen={isSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 flex flex-col w-60 relative">
          {/* Mobile Header */}
          <div className="h-16 flex items-center border-b border-gray-200 px-4 justify-start flex-shrink-0 bg-white z-10">
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          </div>
          {/* Mobile Sidebar Content */}
          <div className="flex-1">
            {renderSidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}

export default App;