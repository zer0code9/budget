import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// function formatDate(date: Date): string {
//   return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(); // Format as YYYY-MM-DD
// }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");

    // Require userId
    if (!userIdParam) {
      return NextResponse.json(
        { error: "userId is required as a query param" },
        { status: 400 }
      );
    }

    const userId = Number(userIdParam);
    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        { error: "userId must be an integer" },
        { status: 400 }
      );
    }

    // Fetch categories
    const catRes = await query(
      `
      SELECT id, user_id, date, name, color, budget
      FROM categories
      WHERE user_id = $1
      ORDER BY id::int
      `,
      [userId]
    );

    let categories = catRes.rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      name: row.name,
      color: row.color,
      budget: Number(row.budget),
    }));

    // If no categories exist yet → initialize default categories
    if (categories.length === 0) {
      await query(
        `
        INSERT INTO categories 
          (id, user_id, date, name, color, budget)
        VALUES 
          ('0', $1, $2, 'Income', '#ffffff', 0),
          ('1', $1, $2, 'Uncategorized', '#c7c7c7', 0)
        `,
        [userId, new Date()]
      );

      const fresh = await query(
        `
        SELECT id, user_id, date, name, color, budget
        FROM categories
        WHERE user_id = $1
        ORDER BY id::int
        `,
        [userId]
      );

      categories = fresh.rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        name: row.name,
        color: row.color,
        budget: Number(row.budget),
      }));
    }

    // Fetch transactions
    const txRes = await query(
      `
      SELECT id, user_id, date, amount, type, description, category_id
      FROM transactions
      WHERE user_id = $1
      ORDER BY id::int
      `,
      [userId]
    );

    const transactions = txRes.rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      amount: Number(row.amount),
      type: row.type,
      description: row.description,
      categoryId: row.category_id,
    }));

    return NextResponse.json({ categories, transactions });
  } catch (err) {
    console.error("GET /api/user-data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, categories, transactions } = body as {
      userId: string | number;
      categories: any[];
      transactions: any[];
    };

    const userIdNum = Number(userId);
    if (!Number.isInteger(userIdNum)) {
      return NextResponse.json(
        { error: "userId must be an integer" },
        { status: 400 }
      );
    }

    const cats = Array.isArray(categories) ? categories : [];
    const txs = Array.isArray(transactions) ? transactions : [];

    // Begin transaction
    await query("BEGIN");

    // Delete old data for that user
    // await query("DELETE FROM transactions WHERE user_id = $1", [userIdNum]);
    // await query("DELETE FROM categories WHERE user_id = $1", [userIdNum]);

    // Delete categories that are not in the request

    const dbCatIds = await query(
      "SELECT id FROM categories WHERE user_id = $1",
      [userIdNum]
    );
    const tpCatsIds = cats.map((c) => c.id);
    const deletedCatIds = dbCatIds.rows.filter((dbCat: any) => !tpCatsIds.includes(dbCat.id)).map((dbCat: any) => dbCat.id);
    for (const id of deletedCatIds) {
      await query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [id, userIdNum]);
    }

    // Delete transactions that are not in the request

    const dbTxIds = await query(
      "SELECT id FROM transactions WHERE user_id = $1",
      [userIdNum]
    );
    const tpTxIds = txs.map((t) => t.id);
    const deletedTxIds = dbTxIds.rows.filter((dbTx: any) => !tpTxIds.includes(dbTx.id)).map((dbTx: any) => dbTx.id);
    for (const id of deletedTxIds) {
      await query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [id, userIdNum]);
    }

    // Insert categories
    for (const c of cats) {
      await query(
        `
        INSERT INTO categories 
          (id, user_id, date, name, color, budget)
        VALUES 
          ($1, $2, $3, $4, $5, $6)
        ON CONFLICT 
          (id)
        DO UPDATE SET 
          date = $3,
          name = $4,
          color = $5,
          budget = $6
        `,
        [
          c.id,
          userIdNum,
          c.date,
          c.name,
          c.color,
          c.budget,
        ]
      );
    }

    // Insert transactions
    for (const t of txs) {
      await query(
        `
        INSERT INTO transactions 
          (id, user_id, date, amount, type, description, category_id)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT
          (id)
        DO UPDATE SET
          date = $3,
          amount = $4,
          type = $5,
          description = $6,
          category_id = $7
        `,
        [
          t.id,
          userIdNum,
          t.date,
          t.amount,
          t.type,
          t.description,
          t.categoryId,
        ]
      );
    }

    await query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/user-data error:", err);
    await query("ROLLBACK");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

