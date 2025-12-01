import { useCallback } from "react"
import { Card } from "./ui/card"
import { Progress } from "./ui/progress"
import { Badge } from "./ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from "lucide-react"
import UserData from "./classes/UserData"

interface DashboardProps {
  userData: UserData
  monthYear: string
}

export function BudgetDashboard({ userData, monthYear }: DashboardProps) {
  const totalIncome = userData.calculateTotalIncome(monthYear)
  const totalExpenses = userData.calculateTotalExpense(monthYear)
  const remainingBudget = userData.calculateTotalRemainingBudget(monthYear)
  const savingsRate = userData.calculateSavingRate(monthYear)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getIncomeId = useCallback(() => {
    return [userData.getCategories().filter((c) => c.getName() === "Income")[0].getId(), userData.getCategories().filter((c) => c.getName() === "Uncategorized")[0].getId()];
  }, [userData]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Income</p>
              <p className="text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Expenses</p>
              <p className="text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Remaining Budget</p>
              <p className={remainingBudget >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(remainingBudget)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Savings Rate</p>
              <p className={savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-yellow-600" : "text-red-600"}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Budget Categories Progress */}
      <Card className="p-6">
        <h3 className="mb-4">Budget Categories</h3>
        <div className="space-y-4">
          {userData.getCategories().length - 1 === 0 || (userData.calculateTotalExpense(monthYear) === 0 && userData.categorySize() === 2) ? (
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No categories yet.</p>
              <p>Add your first categories to get started!</p>
            </div>
          ) : (
          userData.getCategories().map((category) => {
            if (category.getId() === getIncomeId()[0]) return null // Skip default category
            const { month, year } = userData.parseMonthYear(monthYear);
            const percentage = userData.calculateUsage(category.getId(), month, year);
            const isOverBudget = percentage > 100
            const isUncategorized = category.getId() === getIncomeId()[1];
            
            return (
              <div key={category.getId()} className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.getColor() }}
                    />
                    <span>{category.getName()}</span>
                    {isOverBudget && (
                      <Badge variant="destructive">Over Budget</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {isUncategorized ? (
                      <span className="text-sm">
                        {formatCurrency(userData.calculateExpense(category.getId(), month, year))}
                      </span>
                    ) : (
                      <span className="text-sm">
                        {formatCurrency(userData.calculateExpense(category.getId(), month, year))} / {formatCurrency(category.getBudget())}
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)}
                  className="h-4"
                  hidden={isUncategorized}
                />
                <div className="text-right text-xs text-muted-foreground" hidden={isUncategorized}>
                  {percentage.toFixed(1)}% used
                </div>
              </div>
            )
          }))}
        </div>
      </Card>
    </div>
  )
}