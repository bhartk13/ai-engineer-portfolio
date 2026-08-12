// Fallback universe of large-cap US stocks used to build the "Top 10 US
// Stocks" section when Danelfin's MCP server doesn't expose a dedicated
// screener/ranking tool (see mcpClient.findTopStocksTool). We score every
// ticker here with get_stock_score and rank by AI Score.
//
// Feel free to edit this list.
export const US_STOCK_UNIVERSE = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "JPM",
  "V", "UNH", "LLY", "MA", "XOM", "COST", "HD", "PG", "JNJ", "AVGO", "MRK",
  "ABBV", "CVX", "PEP", "KO", "ADBE", "WMT", "CRM", "BAC", "NFLX", "AMD",
  "TMO", "ACN", "MCD", "LIN", "CSCO", "ABT", "DIS", "INTC", "WFC", "PFE",
];
