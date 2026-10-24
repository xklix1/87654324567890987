import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import { StockRecord, UserStockPosition } from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

const seedStocks: StockRecord[] = [
  { id: 1, ticker: 'WRTC', company_name: 'Wealth Real Estate Trust', current_price: 150.0, base_price: 150.0, volatility: 0.03, trend: 0.001, last_updated: new Date() },
  { id: 2, ticker: 'GLDX', company_name: 'Global Logistics Express', current_price: 85.5, base_price: 85.5, volatility: 0.05, trend: 0.002, last_updated: new Date() },
  { id: 3, ticker: 'CYBN', company_name: 'Cyber Mining Technologies', current_price: 320.0, base_price: 320.0, volatility: 0.09, trend: -0.001, last_updated: new Date() },
  { id: 4, ticker: 'AGRO', company_name: 'AeroAgritech Innovations', current_price: 45.2, base_price: 45.2, volatility: 0.04, trend: 0.0, last_updated: new Date() },
  { id: 5, ticker: 'AERO', company_name: 'Skyward Commercial Aviation', current_price: 210.0, base_price: 210.0, volatility: 0.06, trend: 0.003, last_updated: new Date() },
];

const memStocks = new Map<number, StockRecord>(seedStocks.map((s) => [s.id, { ...s }]));
// Key: `${userId}:${stockId}`
const memUserStocks = new Map<string, { userId: string; stockId: number; shares: number; avgBuyPrice: number }>();

export class StockStore {
  public static async listStocks(): Promise<StockRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, ticker, company_name, current_price, base_price, volatility, trend, last_updated FROM stocks ORDER BY id ASC'
        );
        if (result.rows.length > 0) {
          return result.rows.map((r) => ({
            id: Number(r.id),
            ticker: String(r.ticker),
            company_name: String(r.company_name),
            current_price: Number(r.current_price),
            base_price: Number(r.base_price),
            volatility: Number(r.volatility),
            trend: Number(r.trend),
            last_updated: new Date(String(r.last_updated)),
          }));
        }
      } catch (err: unknown) {
        process.stdout.write(`[StockStore] Error querying stocks: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    return Array.from(memStocks.values());
  }

  public static async getStockById(stockId: number): Promise<StockRecord | null> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, ticker, company_name, current_price, base_price, volatility, trend, last_updated FROM stocks WHERE id = $1 LIMIT 1',
          [stockId]
        );
        if (result.rows.length > 0 && result.rows[0]) {
          const r = result.rows[0];
          return {
            id: Number(r.id),
            ticker: String(r.ticker),
            company_name: String(r.company_name),
            current_price: Number(r.current_price),
            base_price: Number(r.base_price),
            volatility: Number(r.volatility),
            trend: Number(r.trend),
            last_updated: new Date(String(r.last_updated)),
          };
        }
        return null;
      } catch (err: unknown) {
        process.stdout.write(`[StockStore] Error getting stock: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    const found = memStocks.get(stockId);
    return found ? { ...found } : null;
  }

  public static async getUserPortfolio(userId: string): Promise<UserStockPosition[]> {
    const allStocks = await this.listStocks();
    const stockMap = new Map<number, StockRecord>(allStocks.map((s) => [s.id, s]));

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT stock_id, shares_count, average_buy_price FROM user_stocks WHERE user_id = $1 AND shares_count > 0',
          [userId]
        );
        return result.rows.map((r) => {
          const sId = Number(r.stock_id);
          const stock = stockMap.get(sId);
          const currentPrice = stock ? stock.current_price : 0;
          const shares = Number(r.shares_count);
          const avgPrice = Number(r.average_buy_price);
          const marketValue = Number((shares * currentPrice).toFixed(2));
          const profitLoss = Number((marketValue - shares * avgPrice).toFixed(2));

          return {
            stock_id: sId,
            ticker: stock ? stock.ticker : 'UNKNOWN',
            company_name: stock ? stock.company_name : 'Unknown Corp',
            current_price: currentPrice,
            shares_count: shares,
            average_buy_price: avgPrice,
            total_market_value: marketValue,
            unrealized_profit_loss: profitLoss,
          };
        });
      } catch (err: unknown) {
        process.stdout.write(`[StockStore] Error reading portfolio: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const positions: UserStockPosition[] = [];
    for (const [, item] of memUserStocks.entries()) {
      if (item.userId === userId && item.shares > 0) {
        const stock = stockMap.get(item.stockId);
        const currentPrice = stock ? stock.current_price : 0;
        const marketValue = Number((item.shares * currentPrice).toFixed(2));
        const profitLoss = Number((marketValue - item.shares * item.avgBuyPrice).toFixed(2));

        positions.push({
          stock_id: item.stockId,
          ticker: stock ? stock.ticker : 'UNKNOWN',
          company_name: stock ? stock.company_name : 'Unknown Corp',
          current_price: currentPrice,
          shares_count: item.shares,
          average_buy_price: item.avgBuyPrice,
          total_market_value: marketValue,
          unrealized_profit_loss: profitLoss,
        });
      }
    }
    return positions;
  }

  public static async buyStock(
    userId: string,
    stockId: number,
    shares: number
  ): Promise<{ transaction_id: number; new_balance: number; total_cost: number; position: UserStockPosition }> {
    const stock = await this.getStockById(stockId);
    if (!stock) {
      throw new AppError('Stock ticker instrument not found.', 404, 'STOCK_NOT_FOUND');
    }

    const totalCost = Number((shares * stock.current_price).toFixed(2));

    if (getIsPostgresAvailable()) {
      return await withTransaction(async (client) => {
        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        if (balance < totalCost) {
          throw new AppError(
            `Insufficient liquid balance. Cost: $${totalCost.toFixed(2)}, Available: $${balance.toFixed(2)}.`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - totalCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        // Query existing position
        const posRes = await client.query<QueryResultRow>(
          'SELECT shares_count, average_buy_price FROM user_stocks WHERE user_id = $1 AND stock_id = $2',
          [userId, stockId]
        );

        let newShares = shares;
        let newAvgPrice = stock.current_price;

        if (posRes.rows.length > 0 && posRes.rows[0]) {
          const oldShares = Number(posRes.rows[0].shares_count);
          const oldAvg = Number(posRes.rows[0].average_buy_price);
          newShares = oldShares + shares;
          newAvgPrice = Number(((oldShares * oldAvg + shares * stock.current_price) / newShares).toFixed(2));

          await client.query(
            'UPDATE user_stocks SET shares_count = $1, average_buy_price = $2, updated_at = NOW() WHERE user_id = $3 AND stock_id = $4',
            [newShares, newAvgPrice, userId, stockId]
          );
        } else {
          await client.query(
            'INSERT INTO user_stocks (user_id, stock_id, shares_count, average_buy_price, updated_at) VALUES ($1, $2, $3, $4, NOW())',
            [userId, stockId, newShares, newAvgPrice]
          );
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'STOCK_BUY', NOW())
           RETURNING id`,
          [userId, totalCost]
        );
        const txId = txRes.rows[0] ? Number(txRes.rows[0].id) : 0;

        const totalMarketValue = Number((newShares * stock.current_price).toFixed(2));
        const profitLoss = Number((totalMarketValue - newShares * newAvgPrice).toFixed(2));

        return {
          transaction_id: txId,
          new_balance: newBalance,
          total_cost: totalCost,
          position: {
            stock_id: stock.id,
            ticker: stock.ticker,
            company_name: stock.company_name,
            current_price: stock.current_price,
            shares_count: newShares,
            average_buy_price: newAvgPrice,
            total_market_value: totalMarketValue,
            unrealized_profit_loss: profitLoss,
          },
        };
      });
    }

    // In-Memory Fallback
    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < totalCost) {
      throw new AppError(`Insufficient funds to purchase stock. Required: $${totalCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`, 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - totalCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, new Date());
    await DatabaseStore.createTransaction(userId, userId, totalCost, 'STOCK_BUY', 0, 'COMPLETED');

    const userKey = `${userId}:${stockId}`;
    const existing = memUserStocks.get(userKey);
    let newShares = shares;
    let newAvgPrice = stock.current_price;

    if (existing) {
      newShares = existing.shares + shares;
      newAvgPrice = Number(((existing.shares * existing.avgBuyPrice + shares * stock.current_price) / newShares).toFixed(2));
      existing.shares = newShares;
      existing.avgBuyPrice = newAvgPrice;
    } else {
      memUserStocks.set(userKey, { userId, stockId, shares: newShares, avgBuyPrice: newAvgPrice });
    }

    const totalMarketValue = Number((newShares * stock.current_price).toFixed(2));
    const profitLoss = Number((totalMarketValue - newShares * newAvgPrice).toFixed(2));

    return {
      transaction_id: Date.now(),
      new_balance: newBalance,
      total_cost: totalCost,
      position: {
        stock_id: stock.id,
        ticker: stock.ticker,
        company_name: stock.company_name,
        current_price: stock.current_price,
        shares_count: newShares,
        average_buy_price: newAvgPrice,
        total_market_value: totalMarketValue,
        unrealized_profit_loss: profitLoss,
      },
    };
  }

  public static async sellStock(
    userId: string,
    stockId: number,
    shares: number
  ): Promise<{ transaction_id: number; new_balance: number; sold_shares: number; revenue: number }> {
    const stock = await this.getStockById(stockId);
    if (!stock) {
      throw new AppError('Stock ticker instrument not found.', 404, 'STOCK_NOT_FOUND');
    }

    const totalRevenue = Number((shares * stock.current_price).toFixed(2));

    if (getIsPostgresAvailable()) {
      return await withTransaction(async (client) => {
        const posRes = await client.query<QueryResultRow>(
          'SELECT shares_count FROM user_stocks WHERE user_id = $1 AND stock_id = $2 FOR UPDATE',
          [userId, stockId]
        );

        if (posRes.rows.length === 0 || !posRes.rows[0]) {
          throw new AppError('You do not own shares in this stock.', 400, 'NO_SHARES_OWNED');
        }

        const ownedShares = Number(posRes.rows[0].shares_count);
        if (ownedShares < shares) {
          throw new AppError(`You only own ${ownedShares} shares. Cannot sell ${shares}.`, 400, 'INSUFFICIENT_SHARES');
        }

        const remainingShares = ownedShares - shares;
        await client.query(
          'UPDATE user_stocks SET shares_count = $1, updated_at = NOW() WHERE user_id = $2 AND stock_id = $3',
          [remainingShares, userId, stockId]
        );

        const userRes = await client.query<QueryResultRow>(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
          [totalRevenue, userId]
        );
        const newBalance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0;

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'STOCK_SELL', NOW())
           RETURNING id`,
          [userId, totalRevenue]
        );
        const txId = txRes.rows[0] ? Number(txRes.rows[0].id) : 0;

        return {
          transaction_id: txId,
          new_balance: newBalance,
          sold_shares: shares,
          revenue: totalRevenue,
        };
      });
    }

    // In-memory fallback
    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const userKey = `${userId}:${stockId}`;
    const existing = memUserStocks.get(userKey);
    if (!existing || existing.shares < shares) {
      throw new AppError('Insufficient shares to sell.', 400, 'INSUFFICIENT_SHARES');
    }
    existing.shares -= shares;

    const newBalance = Number((user.balance + totalRevenue).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, new Date());
    await DatabaseStore.createTransaction(userId, userId, totalRevenue, 'STOCK_SELL', 0, 'COMPLETED');

    return {
      transaction_id: Date.now(),
      new_balance: newBalance,
      sold_shares: shares,
      revenue: totalRevenue,
    };
  }

  // Server-Authoritative Price Volatility Ticking
  public static async tickStockVolatility(): Promise<StockRecord[]> {
    const stocks = await this.listStocks();
    const updatedStocks: StockRecord[] = [];

    for (const stock of stocks) {
      // Mean-reverting random walk with geometric volatility
      const randomFactor = (Math.random() - 0.49) * 2; // -0.98 to +1.02
      const deltaPercent = stock.trend + stock.volatility * randomFactor;
      let newPrice = Number((stock.current_price * (1 + deltaPercent)).toFixed(2));

      // Guardrails: ensure price does not drop below 30% of base price or skyrocket uncontrollably
      const minPrice = Number((stock.base_price * 0.3).toFixed(2));
      const maxPrice = Number((stock.base_price * 4.0).toFixed(2));
      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

      stock.current_price = newPrice;
      stock.last_updated = new Date();

      if (getIsPostgresAvailable()) {
        try {
          await pool.query(
            'UPDATE stocks SET current_price = $1, last_updated = NOW() WHERE id = $2',
            [newPrice, stock.id]
          );
        } catch (err: unknown) {
          process.stdout.write(`[StockStore] Error ticking stock price: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      } else {
        memStocks.set(stock.id, { ...stock });
      }

      updatedStocks.push({ ...stock });
    }

    return updatedStocks;
  }
}
