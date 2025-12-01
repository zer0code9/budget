import { useCallback, useState } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Plus, Edit, Trash2, PlusCircle } from "lucide-react"
import UserData from "./classes/UserData"
import Category from "./classes/Category"

interface BudgetManagerProps {
  userData: UserData
  onUpdateCategories: (categories: Category[]) => void
  onDeleteCategory?: (id: string) => void
  monthYear: string
}

export function BudgetManager({ userData, onUpdateCategories, onDeleteCategory, monthYear }: BudgetManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("")
  const [budget, setBudget] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const colorOptions = [
    { name: "Red", label: "#ff4000" },
    { name: "Green", label: "#25ac1b" },
    { name: "Amber", label: "#ffbf00" },
    { name: "Teal", label: "#4fb9af" },
    { name: "Orange", label: "#ffa500" },
    { name: "Blue", label: "#0040ff" },
    { name: "Yellow", label: "#fcf55f" },
    { name: "Purple", label: "#bf00ff" },
    { name: "Lime", label: "#bfff00" },
    { name: "Pink", label: "#ff00bf" }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) setFormError("Please enter a category name")
    else if (!color) setFormError("Please select a color")
    else if (budget == null) setFormError("Please enter a budget")
    else if (budget <= 0) setFormError("Please enter a budget that is greater than zero")
    else setFormError(null)
    
    if (!name || !color || !budget || budget <= 0) return

    if (editingBudget) {
      // Update existing category
      const updatedCategories = userData.getCategories().map(category =>
        category.getId() === editingBudget.getId()
          ? new Category(
              category.getId(),
              category.getDate(),
              name,
              color,
              budget
            )
          : category
      )
      onUpdateCategories(updatedCategories)
    } else {
      if (userData.getCategories().some(c => c.getName() === name)) {
        setFormError("Category with this name already exists")
        return
      }
      // Add new category
      const newCategory = new Category(
        userData.findMaxId(userData.getCategories()) + 1 + "",
        new Date(),
        name,
        color,
        budget
      )
      onUpdateCategories([...userData.getCategories(), newCategory])
    }

    // Reset form
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (category: Category) => {
    setName(category.getName())
    setColor(category.getColor())
    setBudget(category.getBudget())
    setEditingBudget(category)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const updatedBudgets = userData.getCategories().filter(category => category.getId() !== id)
    onUpdateCategories(updatedBudgets)
    if (onDeleteCategory) onDeleteCategory(id)
  }

  const resetForm = () => {
    setName("")
    setColor("")
    setBudget(null)
    setEditingBudget(null)
    setFormError(null)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setBudget(isNaN(value) ? null : value)
  }

  const getIncomeId = useCallback(() => {
    return [userData.getCategories().filter((c) => c.getName() === "Income")[0].getId(), userData.getCategories().filter((c) => c.getName() === "Uncategorized")[0].getId()];
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Budget Categories</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Edit" : "Add"} Category
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category" className="pb-2">Category Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.split(" ")[0])}
                  placeholder="e.g., Groceries, Entertainment"
                  required
                />
              </div>

              <div>
                <Label className="pb-2">Category Color</Label>
                <RadioGroup defaultValue={color} className="grid grid-cols-2">
                  {colorOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem
                        value={option.label}
                        id={option.name}
                        checked={color === option.label}
                        onClick={() => setColor(option.label)}
                        className="border-2 border-gray-300 rounded-full w-6 h-6 p-1"
                        style={{ backgroundColor: option.label }}
                      >
                      </RadioGroupItem>
                      <Label htmlFor={option.name}>{option.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="amount" className="pb-2">Monthly Budget</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={budget ?? ""}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="text-red-600">
                {formError}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingBudget ? "Update" : "Add"} Category
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {userData.getCategories().length - 1 === 0 || (userData.calculateTotalExpense(monthYear) === 0 && userData.categorySize() === 2) ? (
          <div className="text-center text-muted-foreground py-8">
            <PlusCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No categories yet.</p>
            <p>Add your first categories to get started!</p>
          </div>
        ) : (
          userData.getCategories().map((category) => {
            if (category.getId() === getIncomeId()[0]) return null // Skip default category
            const { month, year } = userData.parseMonthYear(monthYear);
            const percentage = userData.calculateUsage(category.getId(), month, year);
            const remaining = userData.calculateRemainingBudget(category.getId(), month, year);
            const isUncategorized = category.getId() === getIncomeId()[1];
            
            return (
              <Card key={category.getId()} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.getColor() }}
                    />
                    <div>
                      <h4>{category.getName()}</h4>
                      <p className="text-sm text-muted-foreground" hidden={isUncategorized}>
                        {formatCurrency(userData.calculateExpense(category.getId(), month, year))} of {formatCurrency(category.getBudget())} spent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        {isUncategorized ? `${formatCurrency(userData.calculateExpense(category.getId(), month, year))}` : `${formatCurrency(remaining)} remaining`}
                      </p>
                      <p className="text-sm text-muted-foreground" hidden={isUncategorized}>
                        {percentage.toFixed(1)}% used
                      </p>
                    </div>
                    <div className="flex gap-1" hidden={isUncategorized}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.getId())}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}