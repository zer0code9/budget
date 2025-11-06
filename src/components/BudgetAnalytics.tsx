import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import UserData from './classes/UserData'
import { TrendingUp } from 'lucide-react'

interface BudgetAnalyticsProps {
  userData: UserData
  monthYear: string
}

export function BudgetAnalytics({ userData, monthYear }: BudgetAnalyticsProps) {
  const {month, year} = userData.parseMonthYear(monthYear)

  // Pie chart data: sum of expenses per category (including empty categories)
  const pieData = useMemo(() => {
    return userData.getCategories()
      .filter(c => c.getId() !== "0")
      .map(c => {
        const spent = userData.calculateExpense(c.getId(), month, year)
        return {
          name: c.getName(),
          value: spent,
          color: spent > 0 ? c.getColor() : '#d1d5db', // grey out empty categories
        }
      })
  }, [userData, month, year])

  // Overview: success/failure status
  const overviewStatus = useMemo(() => {
    const relevantCategories = userData.getCategories().filter(c => c.getId() !== "0")

    const successfulCategories = relevantCategories
      .filter(c => {
        if (c.getId() === "1") return true
        const spent = pieData.find(p => p.name === c.getName())?.value || 0
        return spent <= c.getBudget()
      })
      .map(c => c.getName())

    const overBudgetCategories = relevantCategories
      .filter(c => {
        if (c.getId() === "1") return false
        const spent = pieData.find(p => p.name === c.getName())?.value || 0
        return spent > c.getBudget()
      })
      .map(c => {
        const spent = pieData.find(p => p.name === c.getName())?.value || 0
        return { label: c.getName(), spent, budget: c.getBudget(), color: 'red' }
      })

    return {
      success: successfulCategories,
      failures: overBudgetCategories,
    }
  }, [userData, pieData])

  // Monthly timeline: last 6 months
  const monthlyTrends = useMemo(() => {
    const trends: { [key: string]: { income: number; expenses: number; savings: number } } = {}

    userData.getTransactions().forEach(t => {
      const monthKey = t.getDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      if (!trends[monthKey]) trends[monthKey] = { income: 0, expenses: 0, savings: 0 }

      if (t.getType() === 'income') trends[monthKey].income += t.getAmount()
      else trends[monthKey].expenses += t.getAmount()
    })

    Object.keys(trends).forEach(key => {
      trends[key].savings = trends[key].income - trends[key].expenses
    })

    return Object.entries(trends)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6)
  }, [userData])

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 text-left gap-4">
          <div>
            <h3 className="font-medium text-green-600">Success ({overviewStatus.success.length})</h3>
            <ul className="text-muted-foreground list-disc list-inside mt-1">
              {overviewStatus.success.map((cat, idx) => (
                <li key={idx}>{cat}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-red-600">Failures ({overviewStatus.failures.length})</h3>
            <ul className="text-muted-foreground list-disc list-inside mt-1">
              {overviewStatus.failures.map((f, idx) => (
                <li key={idx}>{f.label}: ${f.spent.toFixed(2)} / ${f.budget.toFixed(2)}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {pieData.length === 0 || userData.transactionSize() === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transaction expenses from categories yet.</p>
              <p>Add your first categories with transactions to get started!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {monthlyTrends.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transaction expenses from categories yet.</p>
              <p>Add your first categories with transactions to get started!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#22c55e" name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                <Line type="monotone" dataKey="savings" stroke="#3b82f6" name="Savings" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
