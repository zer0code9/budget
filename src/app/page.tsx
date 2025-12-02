'use client'
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { BudgetDashboard } from "@/components/BudgetDashboard"
import { BudgetManager } from "@/components/BudgetManager"
import { ExpenseTracker } from "@/components/ExpenseTracker"
import { BudgetAnalytics } from "@/components/BudgetAnalytics"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BarChart3, PlusCircle, DollarSign, TrendingUp } from "lucide-react"
import Transaction from "@/components/classes/Transaction"
import Category from "@/components/classes/Category"
import UserData from "@/components/classes/UserData"
import { sign } from "./firmware"

function categoriesToDto(categories: Category[]) {
  return categories.map((c) => ({
    id: c.getId(),
    date: c.getDate(),
    name: c.getName(),
    color: c.getColor(),
    budget: c.getBudget(),
  }));
}

function dtoToCategories(rows: any[]): Category[] {
  return rows.map(
    (r) =>
      new Category(
        r.id,
        new Date(r.date),
        r.name,
        r.color,
        r.budget
      )
  );
}

function transactionsToDto(transactions: Transaction[]) {
  return transactions.map((t) => ({
    id: t.getId(),
    date: t.getDate(),
    amount: t.getAmount(),
    type: t.getType(),
    description: t.getDescription(),
    categoryId: t.getCategoryId(),
  }));
}

function dtoToTransactions(rows: any[]): Transaction[] {
  return rows.map(
    (r) =>
      new Transaction(
        r.id,
        new Date(r.date),
        r.amount,
        r.type,
        r.description,
        r.categoryId
      )
  );
}

export default function App() {
  const [logState, setLogState] = useState<boolean>(true)
  const [loogedIn, setLoggedIn] = useState<boolean>(false)
  const [sessionToken, setSessionToken] = useState<string[]>(["", "", ""])
  const [processingStatus, setProcessingStatus] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData>(new UserData())
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthYear, setMonthYear] = useState<string>(`${new Date().getMonth() + 1}-${new Date().getFullYear()}`) // month 1-12
  const [transactionsTabSearchQuery, setTransactionsTabSearchQuery] = useState<string>(`@date:${monthYear}`)

  const loadUserData = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/user-data?userId=${sessionId}`);
      if (!res.ok) {
        console.error("Failed to load user data");
        return;
      }

      const data = await res.json();

      const loadedCategories = dtoToCategories(data.categories || []);
      const loadedTransactions = dtoToTransactions(data.transactions || []);

      setCategories(loadedCategories);
      setTransactions(loadedTransactions);
      } catch (err) {
        console.error("Error loading user data:", err);
      }
  };

  const syncUserData = async (
    nextCategories: Category[],
    nextTransactions: Transaction[]
  ) => {
    const userId = sessionToken[2]; // sessionToken[2] == user id from login

    if (!userId) {
      console.warn("No userId in sessionToken, skipping sync");
      return;
    }

    try {
      await fetch("/api/user-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          categories: categoriesToDto(nextCategories),
          transactions: transactionsToDto(nextTransactions),
        }),
      });
    } catch (err) {
      console.error("Failed to sync user data:", err);
    }
  };

  
  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sessionToken[1].length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    setProcessingStatus(true);

    const sessionId = await sign(sessionToken, logState);
    setSessionToken(["", "", sessionId]);
    if (sessionId) {
      console.log("Logged in userId:", sessionId);
      setLogState(true);
      setLoggedIn(true);
      setFormError(null);
      toast.success(logState ? "Signed in successfully!" : "Registered successfully!");

      // Load categories + transactions from DB
      await loadUserData(sessionId);
    } else {
      setFormError("Invalid email or password");
    }

    setProcessingStatus(false);
  };

  const handleUpdateCategories = (updated: Category[]) => {
    setCategories(updated);
    // use latest transactions from state
    syncUserData(updated, transactions);
  };

  const handleUpdateTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    // use latest categories from state
    syncUserData(categories, updated);
  };

  const handleSignOut = () => {
    setLogState(true)
    setLoggedIn(false)
    setSessionToken(["", "", ""])
    setProcessingStatus(false)
    setFormError(null)
    setUserData(new UserData())
    setCategories([])
    setTransactions([])
    setMonthYear(`${new Date().getMonth() + 1}-${new Date().getFullYear()}`)
    setTransactionsTabSearchQuery(`@date:${monthYear}`)
    toast.success("Signed out successfully!")
  }

  const handleDeleteCategory = (id: string) => {
    const updatedTransactions = transactions.filter(transaction => transaction.getCategoryId() !== id)
    setTransactions(updatedTransactions)
  }

  const monthNumbertoName = (monthNumber: number): string => {
    const date = new Date()
    date.setMonth(monthNumber)
    return date.toLocaleString('default', { month: 'long' })
  }

  const getMonthYears = (): string[] => {
    const monthYears: string[] = [] // 0-11
    const currentMonthYear = `${new Date().getMonth()}-${new Date().getFullYear()}`
    monthYears.push(currentMonthYear)

    if (!transactions.length) {
      return monthYears
    }

    transactions.forEach(transaction => {
      const monthYear = `${transaction.getDate().getMonth()}-${transaction.getDate().getFullYear()}`
      if (!monthYears.includes(monthYear)) {
        monthYears.push(monthYear)
      }
    })
    return monthYears.sort((a, b) => {
      const dateA = new Date(Number(a.split('-')[1]), Number(a.split('-')[0]))
      const dateB = new Date(Number(b.split('-')[1]), Number(b.split('-')[0]))
      return dateB.getTime() - dateA.getTime()
    })
    
  }

  useEffect(() => {
    if (categories) {
      const updatedUserData = new UserData()
      updatedUserData.setCategories(categories)
      updatedUserData.setTransactions(transactions)
      setUserData(updatedUserData)
    }
  }, [categories, transactions])

  useEffect(() => {
    setTransactionsTabSearchQuery(`@date:${monthYear}`)
  }, [monthYear])

  return (
    <div className="min-h-screen bg-background">
      {!loogedIn ? (
        <div className="container mx-auto px-4 py-8 max-w-7xl flex justify-center items-center">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{logState ? "Sign In to your account" : "Sign Up to your account"}</CardTitle>
              <CardDescription>
                {logState ? "Enter your email below to login to your account" : "Create your account by filling the details below"}
              </CardDescription>
              <CardAction>
                <Button variant="outline" onClick={() => setLogState(!logState)}>{logState ? "Sign Up" : "Sign In"}</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSign}>
                <div className="flex flex-col gap-6">
                  <div className="text-red-600">
                    {formError}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={sessionToken[0]}
                      onChange={(e) => setSessionToken([e.target.value, sessionToken[1], sessionToken[2]])}
                      placeholder="m@example.com"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={sessionToken[1]}
                      onChange={(e) => setSessionToken([sessionToken[0], e.target.value, sessionToken[2]])}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Button type="submit" className="w-full">
                      {processingStatus ? <Spinner /> : logState ? "Sign In" : "Sign Up"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-row items-center justify-between">
          <div className="mb-8">
            <h1 className="mb-2">EVA Budget</h1>
            <p className="text-muted-foreground">
              Manage your finances, track expenses, and achieve your savings goals
            </p>
          </div>
          <div className="border rounded-md border-foreground/10 w-fit p-2 mb-8 flex flex-row items-center">
            <h1 className="w-[200px]">Show for Month</h1>
            <Select value={monthYear} onValueChange={(value: string) => {
              setMonthYear(value)
            }}>
              <SelectTrigger className="max-h-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthYears().map((monthYear, index) => {
                  const month = Number(monthYear.split('-')[0])
                  const year = Number(monthYear.split('-')[1])
                  return (
                    <SelectItem key={index} value={`${month + 1}-${year}`} onClick={() => setTransactionsTabSearchQuery(`@date:${month + 1}-${year}`)}>
                      {monthNumbertoName(month)} {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-8 flex flex-row gap-4">
            <ThemeToggle />
            <Button onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-foreground/10">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <BudgetDashboard 
              userData={userData}
              monthYear={monthYear}
            />
          </TabsContent>

          <TabsContent value="categories">
            <BudgetManager 
              userData={userData}
              onUpdateCategories={handleUpdateCategories}
              onDeleteCategory={(id: string) => handleDeleteCategory(id)}
              monthYear={monthYear}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <ExpenseTracker 
              userData={userData}
              onUpdateTransactions={handleUpdateTransactions}
              defaultSearchQuery={transactionsTabSearchQuery}
            />
          </TabsContent>

          {<TabsContent value="analytics">
            <BudgetAnalytics 
              userData={userData}
              monthYear={monthYear}
            />
          </TabsContent>}
        </Tabs>

        {/* Getting Started Guide */}
        {(userData.calculateTotalExpense(monthYear) === 0 && userData.categorySize() === 2) && (
          <Card className="p-8 mt-8 text-center">
            <h3 className="mb-4">Welcome to your Budget Tracker!</h3>
            <p className="text-muted-foreground mb-6">
              Get started by setting up your budget categories and adding your first transaction.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 border rounded-lg">
                <h4 className="mb-2">1. Set Up Budgets</h4>
                <p className="text-sm text-muted-foreground">
                  Create budget categories like groceries, entertainment, and utilities.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="mb-2">2. Track Expenses</h4>
                <p className="text-sm text-muted-foreground">
                  Add your income and expenses to see how you are doing against your budget.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="mb-2">3. Analyze Trends</h4>
                <p className="text-sm text-muted-foreground">
                  View charts and insights to understand your spending patterns.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
      )}
    </div>
  )
}