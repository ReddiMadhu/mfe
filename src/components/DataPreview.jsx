export default function DataPreview({ rows, headers }) {
  if (!rows?.length) return null;
  const cols = headers ?? Object.keys(rows[0] ?? {});

  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/40">
      <div className="px-4 py-2.5 border-b border-border/30 bg-muted/30 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Data Preview
        </p>
        <span className="text-[10px] text-muted-foreground">{rows.length} rows shown</span>
      </div>
      <div className="overflow-x-auto max-h-52">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border/30">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-muted/10' : ''}>
                {cols.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-foreground/70 border-b border-border/10 whitespace-nowrap max-w-[180px] truncate">
                    {row[c] != null ? String(row[c]) : <span className="text-muted-foreground/30 italic">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
