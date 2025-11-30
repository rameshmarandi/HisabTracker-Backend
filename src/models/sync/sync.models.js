import { Book } from "./syncBook/book.model.js";
import { Category } from "./syncCategory/category.model.js";
import { Transaction } from "./syncTransaction/transaction.model.js";

// table names MUST match Watermelon tables: books, categories, transactions
export const SYNC_TABLES = {
  books: {
    model: Book,
    pickFields: ["title", "description", "colorCode", "isLocked", "isDefault"],
  },
  categories: {
    model: Category,
    pickFields: ["bookId", "name", "colorCode", "isDefault"],
  },
  transactions: {
    model: Transaction,
    pickFields: [
      "type",
      "amount",
      "category",
      "categoryId",
      "date",
      "note",
      "bookId",
      "photoUrl", // we expose only URL to client
    ],
  },
};
