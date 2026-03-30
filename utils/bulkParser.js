function normalizeLine(line) {
  return line.replace(/\t/g, " ").trim();
}

export function parseBulkPackingLines(text, stickyCategory = "") {
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  const valid = [];
  const invalid = [];

  lines.forEach((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    const lineNo = index + 1;

    if (parts.length === 1) {
      const name = parts[0];
      if (!name) {
        invalid.push({ lineNo, line, reason: "Missing item name" });
        return;
      }
      valid.push({ name, category: stickyCategory || "Other", qty: "", note: "" });
      return;
    }

    const [name, category, qty = "", note = ""] = parts;
    if (!name) {
      invalid.push({ lineNo, line, reason: "Missing item name" });
      return;
    }

    valid.push({
      name,
      category: category || stickyCategory || "Other",
      qty,
      note
    });
  });

  return { valid, invalid };
}
