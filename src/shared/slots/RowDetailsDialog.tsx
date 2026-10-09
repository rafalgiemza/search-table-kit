type Props = { rows: readonly { id: string; description: string }[]; onClose: () => void }

export const RowDetailsDialog = ({ rows, onClose }: Props) => (
  <dialog open>
    <ul>
      {rows.map((row) => (
        <li key={row.id}>
          {row.id}: {row.description}
        </li>
      ))}
    </ul>
    <button type="button" onClick={onClose}>
      Close
    </button>
  </dialog>
)
