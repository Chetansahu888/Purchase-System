"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import {
  LayoutDashboard,
  CheckCircle,
  Hourglass,
  Truck,
  FileText,
  Archive,
  RefreshCw,
  X,
  CalendarIcon,
  List,
  Filter,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { useAuth } from "../context/AuthContext"

// --- Constants ---
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ"
const INDENT_PO_SHEET = "INDENT-PO"
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS"
const ACCOUNTS_SHEET = "ACCOUNTS"

// Enhanced color palette for professional look
const THEME_COLORS = {
  primary: "#0F172A",
  secondary: "#1E293B",
  accent: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  purple: "#8B5CF6",
  indigo: "#6366F1",
  pink: "#EC4899",
}

const PIE_COLORS = [
  "rgba(16, 185, 129, 0.8)", // Green for Completed
  "rgba(245, 158, 11, 0.8)", // Amber for Pending
  "rgba(59, 130, 246, 0.8)", // Blue (additional)
  "rgba(239, 68, 68, 0.8)", // Red (additional)
  "rgba(139, 92, 246, 0.8)", // Purple (additional)
  "rgba(6, 182, 212, 0.8)", // Cyan (additional)
]

const CHART_GRADIENTS = {
  blue: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
  green: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
  amber: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
  purple: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
}

// --- Helper Functions ---
const parseGvizResponse = (text) => {
  if (!text) {
    console.error("Empty response text received")
    return null
  }

  console.log("Parsing response, text length:", text.length)
  console.log("Response starts with:", text.substring(0, 100))

  // Try the standard JSONP format first
  const jsonpMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s)
  if (jsonpMatch && jsonpMatch[1]) {
    try {
      const parsed = JSON.parse(jsonpMatch[1])
      console.log("Successfully parsed JSONP format")
      return parsed
    } catch (e) {
      console.error("Failed to parse JSONP response:", e)
    }
  }

  // Try to find JSON within the response
  const jsonStart = text.indexOf("{")
  const jsonEnd = text.lastIndexOf("}")

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      const jsonStr = text.substring(jsonStart, jsonEnd + 1)
      const parsed = JSON.parse(jsonStr)
      console.log("Successfully parsed extracted JSON")
      return parsed
    } catch (e) {
      console.error("Failed to parse extracted JSON:", e)
    }
  }

  console.error("Could not find valid JSON in response")
  return null
}

const parseDateFromSheet = (dateValue) => {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue
  if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
    const parts = dateValue.match(/\d+/g)
    if (parts && parts.length >= 3) {
      // Google Sheets Date(year, month, day) where month is 0-indexed
      return new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]), Number.parseInt(parts[2]))
    }
  }
  const d = new Date(dateValue)
  return isNaN(d.getTime()) ? null : d
}

const getStatusBadge = (status) => {
  const statusConfig = {
    "Pending Approval": {
      variant: "secondary",
      icon: Clock,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      glow: "shadow-amber-100",
    },
    "Pending Lift": {
      variant: "default",
      icon: Hourglass,
      color: "text-orange-700 bg-orange-50 border-orange-200",
      glow: "shadow-orange-100",
    },
    "In-Transit": {
      variant: "default",
      icon: Truck,
      color: "text-blue-700 bg-blue-50 border-blue-200",
      glow: "shadow-blue-100",
    },
    "Partially Received": {
      variant: "default",
      icon: Package,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      glow: "shadow-purple-100",
    },
    Completed: {
      variant: "default",
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      glow: "shadow-emerald-100",
    },
  }
  const config = statusConfig[status] || {
    variant: "secondary",
    icon: Clock,
    color: "text-slate-700 bg-slate-50 border-slate-200",
    glow: "shadow-slate-100",
  }
  const Icon = config.icon
  return (
    <Badge className={`${config.color} ${config.glow} transition-all duration-200 hover:scale-105 font-medium`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {status}
    </Badge>
  )
}

// Custom Tooltip Component for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 backdrop-blur-sm">
        <p className="font-semibold text-slate-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allPurchaseData, setAllPurchaseData] = useState([])
  const [allLiftAccountData, setAllLiftAccountData] = useState([])
  const [allAccountsData, setAllAccountsData] = useState([])
  // Add state for stage names from first row
  const [stageNames, setStageNames] = useState({
    indentPo: {},
    liftAccounts: {},
    accounts: {}
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [purchaseSubTab, setPurchaseSubTab] = useState("pending-lift")
  const { user, allowedSteps } = useAuth()

  // --- Filter States ---
  const [dateRange, setDateRange] = useState(undefined)
  const [filters, setFilters] = useState({
    vendorName: "all",
    material: "all",
    status: "all",
    rlNo: "",
    firmName: "all",
  })

  // --- Fetch and Process Data ---
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const indentPoUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        INDENT_PO_SHEET,
      )}`
      const liftAccountsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        LIFT_ACCOUNTS_SHEET,
      )}`
      const accountsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        ACCOUNTS_SHEET,
      )}`

      const [indentPoRes, liftAccountsRes, accountsRes] = await Promise.all([
        fetch(indentPoUrl), 
        fetch(liftAccountsUrl),
        fetch(accountsUrl)
      ])

      console.log("INDENT-PO Response Status:", indentPoRes.status)
      console.log("LIFT-ACCOUNTS Response Status:", liftAccountsRes.status)
      console.log("ACCOUNTS Response Status:", accountsRes.status)

      if (!indentPoRes.ok) throw new Error(`Failed to fetch INDENT-PO sheet: ${indentPoRes.statusText}`)
      if (!liftAccountsRes.ok) throw new Error(`Failed to fetch LIFT-ACCOUNTS sheet: ${liftAccountsRes.statusText}`)
      if (!accountsRes.ok) throw new Error(`Failed to fetch ACCOUNTS sheet: ${accountsRes.statusText}`)

      const indentPoText = await indentPoRes.text()
      const liftAccountsText = await liftAccountsRes.text()
      const accountsText = await accountsRes.text()

      console.log("INDENT-PO Text Length:", indentPoText.length)
      console.log("LIFT-ACCOUNTS Text Length:", liftAccountsText.length)
      console.log("ACCOUNTS Text Length:", accountsText.length)

      const indentPoData = parseGvizResponse(indentPoText)
      const liftAccountsData = parseGvizResponse(liftAccountsText)
      const accountsData = parseGvizResponse(accountsText)

      if (!indentPoData || !indentPoData.table) {
        throw new Error(
          "INDENT-PO sheet has no table data or failed to parse. The sheet might be empty or have a different structure.",
        )
      }

      if (!liftAccountsData || !liftAccountsData.table) {
        throw new Error(
          "LIFT-ACCOUNTS sheet has no table data or failed to parse. The sheet might be empty or have a different structure.",
        )
      }

      if (!accountsData || !accountsData.table) {
        throw new Error(
          "ACCOUNTS sheet has no table data or failed to parse. The sheet might be empty or have a different structure.",
        )
      }

      // Extract stage names from first row (index 0) of each sheet
      const extractedStageNames = {
        indentPo: {},
        liftAccounts: {},
        accounts: {}
      }

      // Extract stage names from INDENT-PO sheet (columns M=12, S=18, AL=37, AO=40)
      if (indentPoData.table.rows.length > 0 && indentPoData.table.rows[0].c) {
        const firstRow = indentPoData.table.rows[0].c
        extractedStageNames.indentPo = {
          M: firstRow[12]?.v || 'Stage M',
          S: firstRow[18]?.v || 'Stage S', 
          AL: firstRow[37]?.v || 'Po Entry In Tally',
          AO: firstRow[40]?.v || 'Get Lift The Item'
        }
      }

      // Extract stage names from LIFT-ACCOUNTS sheet (columns U=20, AE=30, AJ=35, BB=53)
      if (liftAccountsData.table.rows.length > 0 && liftAccountsData.table.rows[0].c) {
        const firstRow = liftAccountsData.table.rows[0].c
        extractedStageNames.liftAccounts = {
          U: firstRow[20]?.v || 'Stage U',
          AE: firstRow[30]?.v || 'Stage AE',
          AJ: firstRow[35]?.v || 'Stage AJ', 
          BB: firstRow[53]?.v || 'Stage BB'
        }
      }

      // Extract stage names from ACCOUNTS sheet (columns AA=26, AF=31, AK=36, AP=41, AU=46)
      if (accountsData.table.rows.length > 0 && accountsData.table.rows[0].c) {
        const firstRow = accountsData.table.rows[0].c
        extractedStageNames.accounts = {
          AA: firstRow[26]?.v || 'Stage AA',
          AF: firstRow[31]?.v || 'Stage AF',
          AK: firstRow[36]?.v || 'Stage AK',
          AP: firstRow[41]?.v || 'Stage AP',
          AU: firstRow[46]?.v || 'Stage AU'
        }
      }

      setStageNames(extractedStageNames)

      // Process INDENT-PO data (start from the row after headers, usually row 2 or 3)
      let processedIndentPoData = indentPoData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null // Skip header row
          return {
            id: `po-${index}`,
            date: parseDateFromSheet(row.c[0]?.v), // Column 0 (A): Date
            rlNo: row.c[1]?.v, // Column 1 (B): RL No. / Indent No.
            firmName: row.c[2]?.v, // Column 2 (C): Firm Name
            vendorName: row.c[4]?.v, // Column 4 (E): Vendor Name
            material: row.c[5]?.v, // Column 5 (F): Material
            poQty: Number.parseFloat(row.c[23]?.v) || 0, // Column 23 (X): PO Quantity
            poTimestamp: row.c[18]?.v, // Column 18 (S): PO Number / PO Date
            pendingQty: Number.parseFloat(row.c[33]?.v) || 0, // Column 33 (AH): Pending Quantity
            notes: row.c[16]?.v, // Column 16 (Q): Notes
            // Add actual columns for pending stages (M=12, S=18, AL=37, AO=40)
            actualM: row.c[12]?.v, // Column M
            actualS: row.c[18]?.v, // Column S
            actualAL: row.c[37]?.v, // Column AL
            actualAO: row.c[40]?.v, // Column AO
          }
        })
        .filter((p) => p && p.rlNo)

      // Process LIFT-ACCOUNTS data
      let processedLiftAccountData = liftAccountsData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null // Skip header row
          return {
            id: `lift-${index}`,
            rlNo: row.c[2]?.v, // Column 2 (C): RL No. / Indent No.
            deliveryOrderNo: row.c[6]?.v, // Column 6 (G): Delivery Order No.
            liftedQty: Number.parseFloat(row.c[9]?.v) || 0, // Column 9 (J): Lifted Quantity
            receivedTimestamp: row.c[20]?.v, // Column 20 (U): Received Timestamp
            receivedQty: Number.parseFloat(row.c[23]?.v) || 0, // Column 23 (X): Received Quantity
            firmName: row.c[55]?.v, // Column 55 (BD): Firm Name
            vendorName: row.c[3]?.v, // Column 3 (D): Vendor Name
            material: row.c[5]?.v, // Column 5 (F): Material
            notes: row.c[21]?.v, // Column 21 (V): Notes
            // Add actual columns for pending stages (U=20, AE=30, AJ=35, BB=53)
            actualU: row.c[20]?.v, // Column U
            actualAE: row.c[30]?.v, // Column AE
            actualAJ: row.c[35]?.v, // Column AJ
            actualBB: row.c[53]?.v, // Column BB
          }
        })
        .filter((l) => l && l.rlNo)

      // Process ACCOUNTS data
      let processedAccountsData = accountsData.table.rows
        .map((row, index) => {
          if (!row.c || index === 0) return null // Skip header row
          return {
            id: `accounts-${index}`,
            rlNo: row.c[2]?.v, // Assuming RL No is in column C (index 2)
            // Add actual columns for pending stages (AA=26, AF=31, AK=36, AP=41, AU=46)
            actualAA: row.c[26]?.v, // Column AA
            actualAF: row.c[31]?.v, // Column AF
            actualAK: row.c[36]?.v, // Column AK
            actualAP: row.c[41]?.v, // Column AP
            actualAU: row.c[46]?.v, // Column AU
          }
        })
        .filter((a) => a && a.rlNo)

      // Apply firm-based filtering
      if (!allowedSteps.includes("admin") && user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        console.log("Dashboard: Applying firm filtering for:", user.firmName)

        processedIndentPoData = processedIndentPoData.filter(
          (po) => po.firmName && String(po.firmName).toLowerCase() === userFirmNameLower,
        )

        processedLiftAccountData = processedLiftAccountData.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        )

        console.log("Dashboard: Filtered INDENT-PO data count:", processedIndentPoData.length)
        console.log("Dashboard: Filtered LIFT-ACCOUNTS data count:", processedLiftAccountData.length)
      } else {
        console.log("Dashboard: No firm filtering applied - user is admin or has 'all' access")
      }

      setAllPurchaseData(processedIndentPoData)
      setAllLiftAccountData(processedLiftAccountData)
      setAllAccountsData(processedAccountsData)
    } catch (e) {
      const errorMessage = `Failed to fetch dashboard data: ${e.message}. 
  
Possible causes:
- Google Sheets may not be publicly accessible
- Sheet names might have changed (expecting "INDENT-PO", "LIFT-ACCOUNTS", and "ACCOUNTS")
- Network connectivity issues
- Google Sheets API rate limiting

Please check:
1. Sheet permissions are set to "Anyone with the link can view"
2. Sheet names match exactly: "INDENT-PO", "LIFT-ACCOUNTS", and "ACCOUNTS"
3. Your internet connection is stable`

      setError(errorMessage)
      console.error("Detailed error:", e)
    } finally {
      setLoading(false)
    }
  }, [user, allowedSteps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Filter Logic and Memoized Data ---
  const { vendorOptions, materialOptions, firmOptions } = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const firms = new Set()
    allPurchaseData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName)
      if (d.material) materials.add(d.material)
      if (d.firmName) firms.add(d.firmName)
    })
    allLiftAccountData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName)
      if (d.material) materials.add(d.material)
      if (d.firmName) firms.add(d.firmName)
    })

    return {
      vendorOptions: Array.from(vendors).sort(),
      materialOptions: Array.from(materials).sort(),
      firmOptions: Array.from(firms).sort(),
    }
  }, [allPurchaseData, allLiftAccountData])

  const statusOptions = ["Pending", "Complete"]

  const filteredIndentPoData = useMemo(() => {
    return allPurchaseData
      .filter((po) => {
        const materialLiftStatus = po.pendingQty === 0 ? "Complete" : "Pending"
        if (dateRange?.from && po.date && po.date < dateRange.from) return false
        if (dateRange?.to && po.date && po.date > dateRange.to) return false
        if (filters.rlNo && !po.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())) return false
        if (filters.vendorName !== "all" && po.vendorName !== filters.vendorName) return false
        if (filters.material !== "all" && po.material !== filters.material) return false
        if (filters.status !== "all" && materialLiftStatus !== filters.status) return false
        if (filters.firmName !== "all" && po.firmName !== filters.firmName) return false
        return true
      })
      .map((po) => ({
        ...po,
        materialLiftStatus: po.pendingQty === 0 ? "Complete" : "Pending",
      }))
  }, [allPurchaseData, dateRange, filters])

  const filteredLiftAccountData = useMemo(() => {
    return allLiftAccountData.filter((lift) => {
      if (filters.rlNo && !lift.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())) return false
      if (filters.vendorName !== "all" && lift.vendorName !== filters.vendorName) return false
      if (filters.material !== "all" && lift.material !== filters.material) return false
      if (filters.firmName !== "all" && lift.firmName !== filters.firmName) return false
      return true
    })
  }, [allLiftAccountData, filters])

  // --- Pending Stages Data ---
// --- Pending Stages Data ---
const pendingStagesData = useMemo(() => {
  const pendingCounts = []

  // Hardcoded stage names mapping
  const stageNames = {
    indentPo: {
      M: 'Indent Approvals',
      S: 'Generate Purchase Order (PO)',
      AL: 'Po Entry In Tally',
      AO: 'Get Lift The Item'
    },
    liftAccounts: {
      U: 'Receipt Of Material/ Physical Quality Check',
      AE: 'Bilty Entry',
      AJ: 'Lab Testing Is The Quality Good',
      BB: 'Final Tally entry'
    },
    accounts: {
      AA: 'Rectify The Mistake & Bilty Add',
      AF: 'Audit Data',
      AK: 'Rectify The Mistake 2',
      AP: 'Take Entry By Tally',
      AU: 'Again For Auditing'
    }
  }

  // Count pending for INDENT-PO stages using hardcoded stage names
  const indentPoStages = [
    { key: 'actualM', columnName: 'M' },
    { key: 'actualS', columnName: 'S' },
    { key: 'actualAL', columnName: 'AL' },
    { key: 'actualAO', columnName: 'AO' },
  ]

  indentPoStages.forEach(({ key, columnName }) => {
    const pendingCount = filteredIndentPoData.filter(po => !po[key] || po[key] === null || po[key] === '').length
    pendingCounts.push({
      stageName: stageNames.indentPo[columnName],
      pendingCount: pendingCount
    })
  })

  // Count pending for LIFT-ACCOUNTS stages using hardcoded stage names
  const liftAccountsStages = [
    { key: 'actualU', columnName: 'U' },
    { key: 'actualAE', columnName: 'AE' },
    { key: 'actualAJ', columnName: 'AJ' },
    { key: 'actualBB', columnName: 'BB' },
  ]

  liftAccountsStages.forEach(({ key, columnName }) => {
    const pendingCount = filteredLiftAccountData.filter(lift => !lift[key] || lift[key] === null || lift[key] === '').length
    pendingCounts.push({
      stageName: stageNames.liftAccounts[columnName],
      pendingCount: pendingCount
    })
  })

  // Count pending for ACCOUNTS stages using hardcoded stage names
  const accountsStages = [
    { key: 'actualAA', columnName: 'AA' },
    { key: 'actualAF', columnName: 'AF' },
    { key: 'actualAK', columnName: 'AK' },
    { key: 'actualAP', columnName: 'AP' },
    { key: 'actualAU', columnName: 'AU' },
  ]

  accountsStages.forEach(({ key, columnName }) => {
    const pendingCount = allAccountsData.filter(account => !account[key] || account[key] === null || account[key] === '').length
    pendingCounts.push({
      stageName: stageNames.accounts[columnName],
      pendingCount: pendingCount
    })
  })

  return pendingCounts
}, [filteredIndentPoData, filteredLiftAccountData, allAccountsData])

  // --- Enhanced Data for Overview Tab ---
  const overviewData = useMemo(() => {
    const kpis = {
      totalPOs: 0,
      pendingPOs: 0,
      completedPOs: 0,
      totalPoQuantity: 0,
      totalPendingQuantity: 0,
      totalReceivedQuantity: 0,
    }

    const vendorCounts = {}
    const materialQuantities = {}
    const vendorQuantities = {}
    const poQuantityByStatus = { Completed: 0, Pending: 0 }

    const uniquePOsByRlNo = new Set()

    filteredIndentPoData.forEach((po) => {
      uniquePOsByRlNo.add(po.rlNo)

      const isPoPendingForKPI = !po.poTimestamp
      if (isPoPendingForKPI) {
        kpis.pendingPOs += 1
      } else {
        kpis.completedPOs += 1
      }

      const isMaterialLiftComplete = po.pendingQty === 0
      if (isMaterialLiftComplete) {
        poQuantityByStatus["Completed"] += po.poQty
      } else {
        poQuantityByStatus["Pending"] += po.poQty
      }

      kpis.totalPoQuantity += po.poQty
      kpis.totalPendingQuantity += po.pendingQty

      if (po.vendorName) {
        vendorCounts[po.vendorName] = (vendorCounts[po.vendorName] || 0) + 1
      }
      if (po.material && po.poQty) {
        materialQuantities[po.material] = (materialQuantities[po.material] || 0) + po.poQty
      }
      if (po.vendorName && po.poQty) {
        vendorQuantities[po.vendorName] = (vendorQuantities[po.vendorName] || 0) + po.poQty
      }
    })

    kpis.totalPOs = uniquePOsByRlNo.size

    filteredLiftAccountData.forEach((lift) => {
      kpis.totalReceivedQuantity += lift.receivedQty
    })

    const top10Materials = Object.entries(materialQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const top10Vendors = Object.entries(vendorQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const finalPoQuantityByStatusData = []
    if (poQuantityByStatus["Completed"] > 0) {
      finalPoQuantityByStatusData.push({ name: "Completed", value: poQuantityByStatus["Completed"] })
    }
    if (poQuantityByStatus["Pending"] > 0) {
      finalPoQuantityByStatusData.push({ name: "Pending", value: poQuantityByStatus["Pending"] })
    }

    return {
      kpis,
      barData: Object.entries(vendorCounts)
        .map(([name, value]) => ({ name, POs: value }))
        .sort((a, b) => b.POs - a.POs)
        .slice(0, 10),
      poQuantityByStatusData: finalPoQuantityByStatusData,
      top10Materials,
      top10Vendors,
    }
  }, [filteredIndentPoData, filteredLiftAccountData])

  // --- Data for Purchase Tab Tables ---
  const purchaseTabTables = useMemo(() => {
    const pendingLift = filteredIndentPoData.filter((po) => po.materialLiftStatus === "Pending")
    const inTransit = filteredLiftAccountData.filter((lift) => !lift.receivedTimestamp)
    const received = filteredLiftAccountData.filter((lift) => lift.receivedTimestamp)

    return { pendingLift, inTransit, received }
  }, [filteredIndentPoData, filteredLiftAccountData])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ vendorName: "all", material: "all", status: "all", rlNo: "", firmName: "all" })
    setDateRange(undefined)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
          <h3 className="text-lg font-semibold text-gray-700">Loading Dashboard...</h3>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-lg border-red-200">
          <CardContent className="text-center p-8 space-y-4">
            <Archive className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Connection Failed</h2>
            <p className="text-gray-600 text-sm">{error}</p>
            <Button onClick={fetchData} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <div className="mb-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                <LayoutDashboard className="h-5 w-5 text-purple-600" />
                Purchase Management Dashboard
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Real-time insights into your purchase operations and material logistics
                {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                  <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader className="p-4">
            <CardTitle className="text-base flex items-center gap-2 text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal h-9 text-sm ${
                        !dateRange && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, y")
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Firm Name</Label>
                <Select value={filters.firmName} onValueChange={(v) => handleFilterChange("firmName", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {firmOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Vendor</Label>
                <Select value={filters.vendorName} onValueChange={(v) => handleFilterChange("vendorName", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendorOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Material</Label>
                <Select value={filters.material} onValueChange={(v) => handleFilterChange("material", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {materialOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">PO Status</Label>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Indent No.</Label>
                <Input
                  placeholder="Search RL-..."
                  value={filters.rlNo}
                  onChange={(e) => handleFilterChange("rlNo", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 col-span-full xl:col-span-1">
                <Button onClick={clearFilters} variant="outline" className="flex-1 h-9 text-sm">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button onClick={fetchData} className="flex-1 h-9 text-sm bg-purple-600 hover:bg-purple-700">
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
            <TabsTrigger value="overview" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
              <TrendingUp className="h-5 w-5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
              <List className="h-5 w-5" />
              Purchase Data
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
              <AlertTriangle className="h-5 w-5" />
              Pending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-md border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Total Purchase Orders</p>
                      <p className="text-3xl font-bold text-gray-800">{overviewData.kpis.totalPOs}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">POs Pending Issuance</p>
                      <p className="text-3xl font-bold text-amber-600">{overviewData.kpis.pendingPOs}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <Hourglass className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">POs Issued/Finalized</p>
                      <p className="text-3xl font-bold text-emerald-600">{overviewData.kpis.completedPOs}</p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-100 rounded-full inline-block mb-2">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Total PO Quantity</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {overviewData.kpis.totalPoQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-orange-100 rounded-full inline-block mb-2">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Pending Quantity</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {overviewData.kpis.totalPendingQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-emerald-100 rounded-full inline-block mb-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Received Quantity</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {overviewData.kpis.totalReceivedQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md border-gray-200">
                <CardHeader className="p-4 border-b border-gray-200">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    PO Quantity by Material Lift Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={overviewData.poQuantityByStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={30}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {overviewData.poQuantityByStatusData.map((entry, index) => (
                            <Cell
                              key={`cell-qty-status-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md border-gray-200">
                <CardHeader className="p-4 border-b border-gray-200">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    Top Vendors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={overviewData.barData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={10} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          stroke="#64748b"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.1)" }} />
                        <Bar
                          dataKey="POs"
                          fill="url(#barGradient)"
                          radius={[0, 4, 4, 0]}
                        />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="w-full space-y-6">
            <Tabs value={purchaseSubTab} onValueChange={setPurchaseSubTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto mb-4 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                <TabsTrigger value="pending-lift" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
                  <Hourglass className="h-5 w-5" />
                  Pending POs
                </TabsTrigger>
                <TabsTrigger value="in-transit" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
                  <Truck className="h-5 w-5" />
                  In-Transit
                </TabsTrigger>
                <TabsTrigger value="received" className="flex-grow flex items-center justify-center gap-2 p-3 text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all duration-200 hover:bg-gray-100">
                  <CheckCircle2 className="h-5 w-5" />
                  Received
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending-lift" className="space-y-4">
                <Card className="shadow-md border-gray-200">
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hourglass className="h-5 w-5 text-amber-600" />
                      Purchase Orders Pending Lift ({purchaseTabTables.pendingLift.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-bold text-gray-600 py-2 px-3">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-600">PO Date</TableHead>
                            <TableHead className="font-bold text-gray-600">Firm Name</TableHead>
                            <TableHead className="font-bold text-gray-600">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-600">Material</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">PO Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">Pending Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.pendingLift.length > 0 ? (
                            purchaseTabTables.pendingLift.map((po) => (
                              <TableRow key={po.id} className="hover:bg-amber-50/50">
                                <TableCell className="font-semibold text-purple-600 py-2 px-3">{po.rlNo}</TableCell>
                                <TableCell>{po.date ? format(po.date, "dd-MMM-yyyy") : "N/A"}</TableCell>
                                <TableCell>{po.firmName || "N/A"}</TableCell>
                                <TableCell>{po.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate">{po.material}</TableCell>
                                <TableCell className="text-right font-semibold">{po.poQty.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold">
                                    {po.pendingQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                No purchase orders are currently pending.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="in-transit" className="space-y-4">
                <Card className="shadow-md border-gray-200">
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      Materials In-Transit ({purchaseTabTables.inTransit.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-bold text-gray-600 py-2 px-3">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-600">Delivery Order</TableHead>
                            <TableHead className="font-bold text-gray-600">Firm Name</TableHead>
                            <TableHead className="font-bold text-gray-600">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-600">Material</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">Lifted Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.inTransit.length > 0 ? (
                            purchaseTabTables.inTransit.map((lift) => (
                              <TableRow key={lift.id} className="hover:bg-purple-50/50">
                                <TableCell className="font-semibold text-purple-600 py-2 px-3">{lift.rlNo}</TableCell>
                                <TableCell>{lift.deliveryOrderNo || "N/A"}</TableCell>
                                <TableCell>{lift.firmName || "N/A"}</TableCell>
                                <TableCell>{lift.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate">{lift.material}</TableCell>
                                <TableCell className="text-right font-semibold">{lift.liftedQty.toLocaleString()}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                No materials are currently in transit.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="received" className="space-y-4">
                <Card className="shadow-md border-gray-200">
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Received Materials ({purchaseTabTables.received.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-bold text-gray-600 py-2 px-3">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-600">Firm Name</TableHead>
                            <TableHead className="font-bold text-gray-600">Vendor</TableHead>
                            <TableHead className="font-bold text-gray-600">Material</TableHead>
                            <TableHead className="font-bold text-gray-600">Notes</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">Lifted Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">Received Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.received.length > 0 ? (
                            purchaseTabTables.received.map((lift) => (
                              <TableRow key={lift.id} className="hover:bg-emerald-50/50">
                                <TableCell className="font-semibold text-purple-600 py-2 px-3">{lift.rlNo}</TableCell>
                                <TableCell>{lift.firmName || "N/A"}</TableCell>
                                <TableCell>{lift.vendorName}</TableCell>
                                <TableCell className="max-w-xs truncate">{lift.material}</TableCell>
                                <TableCell className="max-w-xs truncate">{lift.notes || "N/A"}</TableCell>
                                <TableCell className="text-right font-semibold">{lift.liftedQty.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold">
                                    {lift.receivedQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                No materials have been recorded as received.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="pending" className="w-full space-y-6">
            <Card className="shadow-md border-gray-200">
              <CardHeader className="p-4 border-b border-gray-200">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Pending Stages Overview ({pendingStagesData.reduce((sum, stage) => sum + stage.pendingCount, 0)} Total Pending)
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Track pending counts across all workflow stages
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-bold text-gray-600 py-3 px-4">Stage Name</TableHead>
                        <TableHead className="text-right font-bold text-gray-600">Pending Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStagesData.length > 0 ? (
                        pendingStagesData.map((stage, index) => (
                          <TableRow key={index} className="hover:bg-amber-50/30">
                            <TableCell className="font-medium text-gray-700 py-3 px-4">
                              {stage.stageName}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                className={`font-semibold ${
                                  stage.pendingCount > 0 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                              >
                                {stage.pendingCount}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center h-24 text-gray-500">
                            No pending stages data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards for Quick Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-purple-100 rounded-full inline-block mb-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">INDENT-PO Pending</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {pendingStagesData
                      .slice(0, 4)
                      .reduce((sum, stage) => sum + stage.pendingCount, 0)
                    }
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-blue-100 rounded-full inline-block mb-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">LIFT-ACCOUNTS Pending</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {pendingStagesData
                      .slice(4, 8)
                      .reduce((sum, stage) => sum + stage.pendingCount, 0)
                    }
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-emerald-100 rounded-full inline-block mb-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">ACCOUNTS Pending</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {pendingStagesData
                      .slice(8)
                      .reduce((sum, stage) => sum + stage.pendingCount, 0)
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
