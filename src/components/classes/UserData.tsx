import Category from "./Category";
import Transaction from "./Transaction";

export default class UserData {
    private categories: Category[];
    private transactions: Transaction[];

    constructor() {
        this.categories = [];
        this.transactions = [];
    }

    parseMonthYear(monthYear: string): { month: number; year: number } { // month 0-11
        if (!monthYear) return { month: new Date().getMonth(), year: new Date().getFullYear() };
        const [monthStr, yearStr] = monthYear.split('-');
        return { month: parseInt(monthStr, 10) - 1, year: parseInt(yearStr, 10) };
    }

    findMaxId(array: (Category | Transaction)[]): number {
        if (array.length === 0) return -1;
        let maxId = 0;
        for (let i = 1; i < array.length; i++) {
            if (Number(array[i].getId()) > maxId) {
                maxId = Number(array[i].getId());
            }
        }
        return maxId;
    }

    /* CATEGORY METHODS */
    getCategories(): Category[] {
        return this.categories;
    }

    getCategoryById(id: string): Category | undefined {
        return this.categories.find(category => category.getId() === id);
    }

    setCategories(categories: Category[]): void {
        this.categories = categories;
    }

    addCategory(category: Category): void {
        this.categories.push(category);
    }

    editCategory(id: string, updatedCategory: Category): void {
        const index = this.categories.findIndex(category => category.getId() === id);
        if (index !== -1) {
            this.categories[index].setName(updatedCategory.getName());
            this.categories[index].setColor(updatedCategory.getColor());
            this.categories[index].setBudget(updatedCategory.getBudget());
        }
    }

    removeCategory(id: string): void {
        this.categories = this.categories.filter(category => category.getId() !== id);
    }

    categorySize(): number {
        return this.categories.length;
    }

    calculateTotalIncome(monthYear: string): number {
        let total = 0;
        const { month, year } = this.parseMonthYear(monthYear);
        this.categories.forEach(category => {
            total += this.calculateIncome(category.getId(), month, year);
        });
        return total;
    }

    calculateTotalExpense(monthYear: string): number {
        let total = 0;
        const { month, year } = this.parseMonthYear(monthYear);
        this.categories.forEach(category => {
            total += this.calculateExpense(category.getId(), month, year);
        });
        return total;
    }

    calculateTotalRemainingBudget(monthYear: string): number {
        let total = 0;
        const { month, year } = this.parseMonthYear(monthYear);
        this.categories.forEach(category => {
            if (category.getId() === this.categories.filter((c) => c.getName() === "Uncategorized")[0].getId()) return;
            total += this.calculateRemainingBudget(category.getId(), month, year);
        });
        return total;
    }

    calculateSavingRate(monthYear: string): number {
        const totalIncome = this.calculateTotalIncome(monthYear);
        const totalExpense = this.calculateTotalExpense(monthYear);
        if (totalIncome === 0) return 0;
        return ((totalIncome - totalExpense) / totalIncome) * 100;
    }

    /* TRANSACTION METHODS */
    getTransactions(): Transaction[] {
        return this.transactions;
    }

    getTransactionById(id: string): Transaction | undefined {
        return this.transactions.find(transaction => transaction.getId() === id);
    }

    setTransactions(transactions: Transaction[]): void {
        this.transactions = transactions;
    }

    addTransaction(transaction: Transaction): void {
        this.transactions.push(transaction);
    }

    editTransaction(id: string, updatedTransaction: Transaction): void {
        const index = this.transactions.findIndex(transaction => transaction.getId() === id);
        if (index !== -1) {
            this.transactions[index].setDescription(updatedTransaction.getDescription());
            this.transactions[index].setCategoryId(updatedTransaction.getCategoryId());
        }
    }

    removeTransaction(id: string): void {
        this.transactions = this.transactions.filter(transaction => transaction.getId() !== id);
    }

    transactionSize(): number {
        return this.transactions.length;
    }

    calculateIncome(categoryId: string, month: number, year: number): number {
        return this.transactions
            .filter(transaction => 
                transaction.getType() === 'income' && transaction.getCategoryId() === categoryId && 
                transaction.getDate().getMonth() === month &&
                transaction.getDate().getFullYear() === year
            )
            .reduce((sum, transaction) => sum + transaction.getAmount(), 0);
    }

    calculateExpense(castegoryId: string, month: number, year: number): number {
        return this.transactions
            .filter(transaction => 
                transaction.getType() === 'expense' && transaction.getCategoryId() === castegoryId && 
                transaction.getDate().getMonth() === month &&
                transaction.getDate().getFullYear() === year
            )
            .reduce((sum, transaction) => sum + transaction.getAmount(), 0);
    }

    calculateRemainingBudget(categoryId: string, month: number, year: number): number {
        const category = this.getCategoryById(categoryId);
        if (!category) return 0;
        return category.getBudget() - this.calculateExpense(categoryId, month, year);
    }

    calculateUsage(categoryId: string, month: number, year: number): number {
        const category = this.getCategoryById(categoryId);
        if (!category) return 0;
        return category.getBudget() === 0 ? 0 : (this.calculateExpense(categoryId, month, year) / category.getBudget()) * 100;
    }
}