// src/components/ExpenseTracker.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// UI
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner"
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

// Icons
import {
  Plus,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Upload,
  X,
  FileText,
  Funnel,
  Edit,
  Trash2,
} from "lucide-react";

// Data
import UserData from "./classes/UserData";
import Transaction from "./classes/Transaction";

// Import helper (already set up to use gpt-5-nano + PDF text extraction)
import { sendPdfToOpenAI } from "./pdfToOpenAI";

interface ExpenseTrackerProps {
  userData: UserData;
  onUpdateTransactions: (transactions: Transaction[]) => void;
  defaultSearchQuery?: string;
}

type SortField = "date" | "description" | "category" | "type" | "amount";
type SortDirection = "asc" | "desc";

export function ExpenseTracker({
  userData,
  onUpdateTransactions,
  defaultSearchQuery,
}: ExpenseTrackerProps) {
  // ----- Dialogs & UI state -----
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // ----- Import state (merged from your working importer) -----
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ----- Form state -----
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date());
  const [type, setType] = useState<"expense" | "income">("expense");
  const [formError, setFormError] = useState<string | null>(null);

  // ----- Sorting & search -----
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery || "");

  // ===== Utilities =====
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const formatDate = (value: string | Date) => {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getIncomeId = useCallback(() => {
    return [userData.getCategories().filter((c) => c.getName() === "Income")[0].getId(), userData.getCategories().filter((c) => c.getName() === "Uncategorized")[0].getId()];
  }, [userData]);

  // ===== Add / Edit / Delete =====
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) setFormError("Please enter a description");
    else if (!categoryId && type !== "income") setFormError("Please select a category");
    else if (!amount) setFormError("Please enter an amount");
    else if (amount <= 0) setFormError("Please enter an amount that is greater than zero");
    else if (!date) setFormError("Please select a date");
    else setFormError(null);

    if (!description || (!categoryId && type !== "income") || !amount || amount <= 0 || !date) return;

    if (editingTransaction) {
      // Update existing
      const updated = userData.getTransactions().map((t) =>
        t.getId() === editingTransaction.getId()
          ? new Transaction(t.getId(), date, amount, type, description, categoryId || getIncomeId()[0])
          : t
      );
      onUpdateTransactions(updated);
    } else {
      // Add new
      const newId = userData.findMaxId(userData.getTransactions()) + 1 + "";
      const newTx = new Transaction(newId, date, amount, type, description, categoryId || getIncomeId()[0]);
      onUpdateTransactions([...userData.getTransactions(), newTx]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (t: Transaction) => {
    setDate(t.getDate());
    setAmount(t.getAmount());
    setType(t.getType());
    setDescription(t.getDescription());
    setCategoryId(t.getCategoryId());
    setEditingTransaction(t);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = userData.getTransactions().filter((t) => t.getId() !== id);
    onUpdateTransactions(updated);
  };

  const resetForm = () => {
    setDate(new Date());
    setAmount(null);
    setType("expense");
    setDescription("");
    setCategoryId("");
    setEditingTransaction(null);
    setFormError(null);
  };

  // ===== Categories =====
  const getAvailableCategories = () => {
    if (type === "expense") {
      return userData.getCategories().filter((c) => c.getId() !== getIncomeId()[0]);
    } else {
      // income → show only the Income bucket (id "0")
      return userData.getCategories().filter((c) => c.getId() === getIncomeId()[0]);
    }
  };

  useEffect(() => {
    if (type === "income") {
      setCategoryId(getIncomeId()[0]);
    } else {
      setCategoryId(categoryId || getIncomeId()[1]);
    }
  }, [type, categoryId, getIncomeId]);

  // ===== Sorting & Search =====
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSearchFilteredTransactions = (txs: Transaction[]) => {
    const query = (searchQuery || "").toLowerCase().trim();
    if (!query) return txs;

    return txs.filter((t) => {
      const descMatch = t.getDescription().toLowerCase().includes(query);

      // @cat:[name]
      let catMatch = false;
      if (query.startsWith("@cat:")) {
        const q = query.replace("@cat:", "").trim();
        const cat = userData.getCategoryById(t.getCategoryId());
        catMatch = !!cat && cat.getName().toLowerCase().includes(q);
      }

      // @type:[expense|income]
      let typeMatch = false;
      if (query.startsWith("@type:")) {
        const q = query.replace("@type:", "").trim();
        typeMatch = t.getType().toLowerCase() === q;
      }

      // @date:[m-yyyy]
      let dateMatch = false;
      if (query.startsWith("@date:")) {
        const q = query.replace("@date:", "").trim();
        const { month, year } = userData.parseMonthYear(q);
        dateMatch = t.getDate().getMonth() === month && t.getDate().getFullYear() === year;
      }

      return descMatch || catMatch || typeMatch || dateMatch;
    });
  };

  const getSortedTransactions = () => {
    return [...getSearchFilteredTransactions(userData.getTransactions())].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case "date":
          aVal = new Date(a.getDate()).getTime();
          bVal = new Date(b.getDate()).getTime();
          break;
        case "description":
          aVal = a.getDescription().toLowerCase();
          bVal = b.getDescription().toLowerCase();
          break;
        case "category":
          aVal = a.getCategoryId().toLowerCase();
          bVal = b.getCategoryId().toLowerCase();
          break;
        case "type":
          aVal = a.getType();
          bVal = b.getType();
          break;
        case "amount":
          aVal = a.getAmount();
          bVal = b.getAmount();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedTransactions = getSortedTransactions();

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setAmount(isNaN(v) ? null : v);
  };

  // ====== Import (PDF → AI) ======
  const handleFile = async (file: File) => {
    if (file.type && file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setProcessingStatus("Processing PDF...");

    try {
      const { transactions: extracted } = await sendPdfToOpenAI(
        file,
        userData.getCategories(),
        setProcessingStatus
      );

      setProcessingStatus("Verifying transactions...");

      // Generate sequential numeric ids to match your existing scheme
      const startId = userData.findMaxId(userData.getTransactions()) + 1;

      const mapped: Transaction[] = (extracted || []).map((t, idx) => {
        const isIncome = (t.type || "").toLowerCase() === "income";

        // Income → force category "0"
        let resolvedCategoryId = isIncome ? getIncomeId()[0] : "";

        if (!isIncome) {
          const match = userData
            .getCategories()
            .find((c) => c.getName().toLowerCase() === (t.category || "").toLowerCase());
          resolvedCategoryId = match ? match.getId() : getIncomeId()[1];
        }

        return new Transaction(
          (startId + idx) + "",
          new Date(t.date),
          Math.abs(Number(t.amount) || 0),
          isIncome ? "income" : "expense",
          t.description || "",
          resolvedCategoryId
        );
      });

      setProcessingStatus("Importing transactions...");

      onUpdateTransactions([...userData.getTransactions(), ...mapped]);
      setProcessingStatus("Imported successfully!");
      toast.success(`Imported ${mapped.length} transactions successfully!`);
      //setTimeout(closeImport, 1200);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) alert("Import failed: " + (err.message || "Unknown error"));
      toast.error("Import failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
      setProcessingStatus("");
      setShowImport(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const removeFile = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProcessingStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const closeImport = () => {
    setShowImport(false);
    removeFile();
  };

  // ===== Render =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2>Expense Tracker</h2>

        <div className="flex items-center gap-2">
          {/* IMPORT DIALOG */}
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import Statement
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Bank Statement</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div
                  ref={dropZoneRef}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                    ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"}
                    ${selectedFile ? "bg-muted/50" : "hover:bg-muted/50"}
                  `}
                >
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-12 h-12 text-primary" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      {isProcessing && (
                        <div className="flex items-center gap-2 text-sm">
                          <Spinner />
                          {processingStatus}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Drop PDF here or <span className="text-primary underline">click to browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Only PDF files</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeImport} disabled={isProcessing}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ADD / EDIT TRANSACTION */}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type" className="pb-2">
                      Type
                    </Label>
                    <Select
                      value={type}
                      onValueChange={(value: "expense" | "income") => {
                        setType(value);
                        setCategoryId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount" className="pb-2">
                      Amount
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount ?? ""}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="pb-2">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Grocery shopping, Gas bill"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="pb-2">
                    Category
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={type === "income"} required={type !== "income"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCategories().map((category) => (
                        <SelectItem key={category.getId()} value={category.getId()}>
                          <div
                            className="border-2 border-gray-300 rounded-full w-6 h-6 p-1 inline-block mr-2 align-middle"
                            style={{ backgroundColor: category.getColor() }}
                          />
                          {category.getName()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date" className="pb-2">
                    Date
                  </Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" id="date" className="w-48 justify-between font-normal">
                        {date ? date.toLocaleDateString() : "Select date"}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(d) => {
                          setDate(d ?? new Date());
                          setIsCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="text-red-600">{formError}</div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingTransaction ? "Save" : "Add"} Transaction
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Quick Filters */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-4 relative">
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search… (@cat:[name] | @type:[expense/income] | @date:[m-yyyy])"
          />
          <div className="absolute right-8 top-1/4">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Funnel className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    setSearchQuery(`@date:${new Date().getMonth() + 1}-${new Date().getFullYear()}`)
                  }
                >
                  Current Month
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Categories</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {getAvailableCategories().map((category) => (
                        <DropdownMenuItem
                          key={category.getId()}
                          onClick={() => setSearchQuery(`@cat:${category.getName()}`)}
                        >
                          {category.getName()}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setSearchQuery("@type:expense")}>
                        Expense
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSearchQuery("@type:income")}>
                        Income
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {sortedTransactions.length} {sortedTransactions.length === 1 ? "transaction" : "transactions"} total
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-x-auto">
        {sortedTransactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No transactions yet.</p>
            <p>Add or import your first transactions to get started!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-2">
                    Date <SortIcon field="date" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("description")}
                >
                  <div className="flex items-center gap-2">
                    Description <SortIcon field="description" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center gap-2">
                    Category <SortIcon field="category" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("type")}>
                  <div className="flex items-center gap-2">
                    Type <SortIcon field="type" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Amount <SortIcon field="amount" />
                  </div>
                </TableHead>
                <TableHead className="text-right select-none">
                  <div className="flex items-center justify-end gap-2"></div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedTransactions.map((t) => {
                const cat = userData.getCategoryById(t.getCategoryId());
                return (
                  <TableRow key={t.getId()}>
                    <TableCell>{formatDate(t.getDate())}</TableCell>
                    <TableCell>{t.getDescription()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cat?.getName() || "Uncategorized"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.getType() === "income" ? "default" : "secondary"}>{t.getType()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={t.getType() === "income" ? "text-green-600" : "text-red-600"}>
                        {t.getType() === "income" ? "+" : "-"}
                        {formatCurrency(t.getAmount())}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.getId())}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default ExpenseTracker;
