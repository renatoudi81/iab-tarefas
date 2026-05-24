/**
 * Tabela acessível oculta visualmente (sr-only), espelhando os dados de um
 * gráfico Recharts para leitores de tela. WCAG 1.1.1 + 1.3.1.
 *
 * Uso:
 *   <ChartDataTable
 *     caption="Tarefas concluídas por dia"
 *     headers={['Data', 'Concluídas']}
 *     rows={data.map(d => [d.label, String(d.value)])}
 *   />
 *
 * Renderiza uma <table> visualmente escondida mas presente no DOM.
 */
interface Props {
  caption: string
  headers: string[]
  rows: string[][]
}

export function ChartDataTable({ caption, headers, rows }: Props) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} scope="col">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
