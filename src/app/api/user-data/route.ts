import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
      SELECT user_id, category_id, name, color, budget, created_at
      FROM categories
      WHERE user_id = $1
      ORDER BY category_id::int
      `,
      [userId]
    );

    let categories = catRes.rows.map((row: any) => ({
      id: row.category_id,
      name: row.name,
      color: row.color,
      budget: Number(row.budget),
      createdAt: row.created_at?.toISOString?.() ?? undefined,
    }));

    // If no categories exist yet → initialize default categories
    if (categories.length === 0) {
      await query(
        `
        INSERT INTO categories (user_id, category_id, name, color, budget)
        VALUES 
          ($1, '0', 'Income', '#ffffff', 0),
          ($1, '1', 'Uncategorized', '#c7c7c7', 0)
        `,
        [userId]
      );

      const fresh = await query(
        `
        SELECT user_id, category_id, name, color, budget, created_at
        FROM categories
        WHERE user_id = $1
        ORDER BY category_id::int
        `,
        [userId]
      );

      categories = fresh.rows.map((row: any) => ({
        id: row.category_id,
        name: row.name,
        color: row.color,
        budget: Number(row.budget),
        createdAt: row.created_at?.toISOString?.() ?? undefined,
      }));
    }

    // Fetch transactions
    const txRes = await query(
      `
      SELECT user_id, transaction_id, date, description, amount, type, category_id
      FROM transactions
      WHERE user_id = $1
      ORDER BY date, transaction_id::int
      `,
      [userId]
    );

    const transactions = txRes.rows.map((row: any) => ({
      id: row.transaction_id,
      date: row.date.toISOString().slice(0, 10),
      description: row.description,
      amount: Number(row.amount),
      type: row.type,
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
    await query("DELETE FROM transactions WHERE user_id = $1", [userIdNum]);
    await query("DELETE FROM categories WHERE user_id = $1", [userIdNum]);

    // Insert categories
    for (const c of cats) {
      await query(
        `
        INSERT INTO categories 
          (user_id, category_id, name, color, budget, created_at)
        VALUES 
          ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
        `,
        [
          userIdNum,
          c.id,
          c.name,
          c.color,
          c.budget ?? 0,
          c.createdAt ?? null,
        ]
      );
    }

    // Insert transactions
    for (const t of txs) {
      await query(
        `
        INSERT INTO transactions
          (user_id, transaction_id, date, description, amount, type, category_id)
        VALUES
          ($1, $2, $3::date, $4, $5, $6, $7)
        `,
        [
          userIdNum,
          t.id,
          t.date,
          t.description,
          t.amount,
          t.type,
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

