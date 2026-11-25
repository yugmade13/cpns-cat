// Menampilkan teks soal/pembahasan. Baris yang mengandung "|" dirender sebagai tabel.
interface Props {
  text: string;
  className?: string;
}

type Block = { kind: 'p'; text: string } | { kind: 'table'; rows: string[][] };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let table: string[][] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join('\n') });
    para = [];
  };
  const flushTable = () => {
    if (table.length) blocks.push({ kind: 'table', rows: table });
    table = [];
  };
  for (const line of text.split('\n')) {
    if (line.includes('|')) {
      flushPara();
      const cells = line.split('|').map((c) => c.trim());
      // Lewati baris pemisah seperti "---|---".
      if (cells.every((c) => /^:?-*:?$/.test(c))) continue;
      table.push(cells);
    } else if (line.trim() === '') {
      flushPara();
      flushTable();
    } else {
      flushTable();
      para.push(line);
    }
  }
  flushPara();
  flushTable();
  return blocks;
}

export function RichText({ text, className = '' }: Props) {
  const blocks = toBlocks(text);
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="whitespace-pre-line wrap-break-word">
            {b.text}
          </p>
        ) : (
          <div key={i} className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead className="bg-slate-50">
                <tr>
                  {b.rows[0]!.map((c, j) => (
                    <th key={j} scope="col" className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.slice(1).map((r, k) => (
                  <tr key={k} className="odd:bg-white even:bg-slate-50/60">
                    {r.map((c, j) => (
                      <td key={j} className={`border-b border-slate-100 px-3 py-1.5 ${j > 0 ? 'tabular-nums' : ''}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
