"use client";

interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

interface LineItemsTableProps {
  items?: LineItem[];
  currency?: string;
}

export default function LineItemsTable({
  items = [],
  currency = "USD",
}: LineItemsTableProps) {
  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value || 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              Description
            </th>

            <th className="px-4 py-3 text-right">
              Quantity
            </th>

            <th className="px-4 py-3 text-right">
              Unit Price
            </th>

            <th className="px-4 py-3 text-right">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {(items ?? []).length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-gray-500"
              >
                No line items found.
              </td>
            </tr>
          ) : (
            (items ?? []).map((item, index) => (
              <tr
                key={item.id ?? index}
                className="border-t"
              >
                <td className="px-4 py-3">
                  {item.description}
                </td>

                <td className="px-4 py-3 text-right">
                  {item.quantity}
                </td>

                <td className="px-4 py-3 text-right">
                  {formatAmount(item.unit_price)}
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  {formatAmount(
                    item.amount ??
                      item.quantity *
                        item.unit_price
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}